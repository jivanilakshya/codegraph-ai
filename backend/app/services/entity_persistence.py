"""Tree-sitter extraction and persistence of code entities and call edges."""

import logging
import re
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter

from sqlalchemy import delete, or_, select
from sqlalchemy.exc import SQLAlchemyError

from app.database.postgres import SessionLocal
from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.file import File
from app.services.parser_service import (
    ParserDependencyError,
    ParserService,
    SourceFileTooLargeError,
    UnsupportedLanguageError,
)
from app.services.relationship_persistence import RelationshipPersistenceService

logger = logging.getLogger(__name__)

_SUPPORTED_LANGUAGES = {"Python", "JavaScript", "TypeScript"}
_FUNCTION_NODES = {"function_definition", "function_declaration", "method_definition"}
_CLASS_NODES = {"class_definition", "class_declaration"}
_VARIABLE_NODES = {"variable_declarator", "assignment"}
_CALL_NODES = {"call", "call_expression"}
_AWAIT_NODE = "await_expression"
_PYTHON_FROM_IMPORT = re.compile(
    r"^\s*from\s+(?P<module>[.\w]+)\s+import\s+(?P<members>.+?)\s*$", re.DOTALL
)
_PYTHON_IMPORT = re.compile(r"^\s*import\s+(?P<members>.+?)\s*$", re.DOTALL)
_REFERENCE = re.compile(r"^(?:(?P<namespace>[A-Za-z_$][\w$]*)\s*\.\s*)?(?P<name>[A-Za-z_$][\w$]*)$")


class EntityPersistenceError(Exception):
    """Raised when extracted entities cannot be stored."""


@dataclass(frozen=True)
class ExtractedEntity:
    name: str
    entity_type: str
    start_line: int
    end_line: int


@dataclass(frozen=True)
class ExtractedCall:
    """One call site, retaining both its caller and the parsed callee reference."""

    caller: ExtractedEntity
    callee_name: str | None
    object_name: str | None


@dataclass(frozen=True)
class ExtractedCallChain:
    """One adjacent pair in a fluent call chain such as find().populate()."""

    source_name: str
    source_object_name: str | None
    target_name: str
    target_object_name: str | None


@dataclass(frozen=True)
class ImportBinding:
    local_name: str
    target_file_id: int
    target_name: str | None
    is_namespace: bool = False


@dataclass(frozen=True)
class FileExtraction:
    entities: list[ExtractedEntity]
    calls: list[ExtractedCall]
    call_chains: list[ExtractedCallChain]
    imports: list[ImportBinding]


@dataclass(frozen=True)
class FileExtractionResult:
    extraction: FileExtraction
    parse_time: float
    metadata_time: float
    calls_time: float
    status: str
    tree: object = None


_EXTRACTION_CACHE: dict[tuple[int, str, float | None], FileExtraction] = {}


class CodeEntityPersistenceService:
    """Replace one project's declarations and resolvable function-call relationships."""

    def extract_and_store(
        self, project_id: int, repository_root: Path, file_mtimes: dict[str, float] = None
    ) -> tuple[float, float, float, int, int, int]:
        import gc
        gc_was_enabled = gc.isenabled()
        if gc_was_enabled:
            gc.disable()

        try:
            files = self._load_project_files(project_id)
            files_by_path = {file.path: file for file in files}
            extractions: dict[int, FileExtraction] = {}

            total_parse = 0.0
            total_metadata = 0.0
            total_calls = 0.0
            parsed_count = 0
            skipped_count = 0
            failed_count = 0

            # We also keep a list of results (which hold reference to tree objects) to prevent GC
            results_cache = []

            for file in files:
                source_path = (repository_root / file.path).resolve()
                mtime = file_mtimes.get(file.path) if file_mtimes else None
                cache_key = (project_id, file.path, mtime)

                if cache_key in _EXTRACTION_CACHE:
                    extractions[file.id] = _EXTRACTION_CACHE[cache_key]
                    skipped_count += 1
                    continue

                result = self._extract_file(source_path, file, files_by_path)
                results_cache.append(result)

                if result.status == "success":
                    extractions[file.id] = result.extraction
                    _EXTRACTION_CACHE[cache_key] = result.extraction
                    total_parse += result.parse_time
                    total_metadata += result.metadata_time
                    total_calls += result.calls_time
                    parsed_count += 1
                elif result.status == "skipped":
                    skipped_count += 1
                else:
                    failed_count += 1

            print(
                f"[SCAN] Files parsed: {parsed_count} | Files skipped: {skipped_count} | Files failed: {failed_count}"
            )
            entity_count, call_count, unmatched_count = self._replace_project_entities(
                files, extractions
            )
            return (
                total_parse,
                total_metadata,
                total_calls,
                parsed_count,
                skipped_count,
                failed_count,
            )
        finally:
            if gc_was_enabled:
                gc.enable()
                gc.collect()

    @staticmethod
    def _load_project_files(project_id: int) -> list[File]:
        try:
            with SessionLocal() as session:
                return list(session.scalars(select(File).where(File.project_id == project_id)))
        except SQLAlchemyError as error:
            raise EntityPersistenceError("Could not load project files for entity extraction.") from error

    @classmethod
    def _extract_file(
        cls, source_path: Path, source_file: File, files_by_path: dict[str, File]
    ) -> FileExtractionResult:
        """Parse one source file without allowing malformed files to block a scan."""
        try:
            language = ParserService.detect_language(source_path)
            if language not in _SUPPORTED_LANGUAGES:
                return FileExtractionResult(FileExtraction([], [], [], []), 0.0, 0.0, 0.0, "skipped", None)
            if source_path.stat().st_size > 5 * 1024 * 1024:
                raise SourceFileTooLargeError("Source file exceeds the 5 MB parser limit.")
            source = source_path.read_bytes()

            # Tree-sitter parse
            t0 = perf_counter()
            tree = ParserService._parser_for(source_path.suffix.lower()).parse(source)
            t_parse = perf_counter() - t0

            # Metadata extraction
            t0 = perf_counter()
            entities = cls._extract_entities(tree, source)
            imports = cls._extract_imports(
                tree, source, language, source_file, files_by_path
            )
            t_metadata = perf_counter() - t0

            # Calls extraction
            t0 = perf_counter()
            calls = cls._extract_calls(tree, source, entities)
            call_chains = cls._extract_call_chains(tree, source)
            t_calls = perf_counter() - t0

        except (OSError, UnsupportedLanguageError, SourceFileTooLargeError) as error:
            logger.info("Skipping entity extraction for %s: %s", source_path, error)
            return FileExtractionResult(FileExtraction([], [], [], []), 0.0, 0.0, 0.0, "skipped", None)
        except ParserDependencyError:
            raise
        except Exception:
            logger.exception("Tree-sitter could not parse %s", source_path)
            return FileExtractionResult(FileExtraction([], [], [], []), 0.0, 0.0, 0.0, "failed", None)

        print(f"Total CALLS extracted in {source_file.path}:", len(calls))
        logger.debug(
            "Tree-sitter extracted %s calls and %s chain edges from %s",
            len(calls),
            len(call_chains),
            source_file.path,
        )
        return FileExtractionResult(
            FileExtraction(entities, calls, call_chains, imports),
            t_parse,
            t_metadata,
            t_calls,
            "success",
            tree
        )

    @staticmethod
    def _extract_entities(tree, source: bytes) -> list[ExtractedEntity]:
        root_node = tree.root_node if hasattr(tree, "root_node") else tree
        found: set[tuple[str, str, int, int]] = set()

        def add(node, entity_type: str, name_node=None) -> None:
            name_node = name_node or node.child_by_field_name("name")
            if name_node is None:
                return
            name = CodeEntityPersistenceService._node_text(name_node, source)
            if name:
                found.add((name, entity_type, node.start_point[0] + 1, node.end_point[0] + 1))
                if entity_type == "function":
                    print("Function found:", name)

        def exported_names(node) -> None:
            if node.type in _FUNCTION_NODES | _CLASS_NODES | {"variable_declarator"}:
                add(node, "export")
            elif node.type == "export_specifier":
                add(node, "export", node.child_by_field_name("alias") or node.child_by_field_name("name"))

        def visit(node, in_export: bool = False) -> None:
            if node.type in _FUNCTION_NODES:
                add(node, "function")
            elif node.type in _CLASS_NODES:
                add(node, "class")
            elif node.type in _VARIABLE_NODES:
                if node.type == "assignment":
                    add(node, "variable", node.child_by_field_name("left"))
                else:
                    add(node, "variable")
                value = node.child_by_field_name("value")
                if node.type == "variable_declarator" and value is not None and value.type in {
                    "arrow_function", "function_expression"
                }:
                    add(node, "function")

            if in_export:
                exported_names(node)
            export_context = in_export or node.type == "export_statement"
            for child in node.named_children:
                visit(child, export_context)

        visit(root_node)
        # Prevent garbage collection of the tree
        _ = tree
        return [ExtractedEntity(*entity) for entity in sorted(found)]

    @classmethod
    def _extract_calls(
        cls, tree, source: bytes, entities: list[ExtractedEntity]
    ) -> list[ExtractedCall]:
        root_node = tree.root_node if hasattr(tree, "root_node") else tree
        functions = [entity for entity in entities if entity.entity_type == "function"]
        calls: list[ExtractedCall] = []
        seen_call_nodes: set[tuple[int, int]] = set()

        def add_call(node) -> None:
            key = (node.start_byte, node.end_byte)
            if key in seen_call_nodes:
                return
            seen_call_nodes.add(key)
            caller = cls._caller_for_call(node, functions, source)
            reference = cls._call_reference(node, source)
            callee_name, object_name = reference or (None, None)
            if callee_name is not None:
                print("Calls found:", callee_name)
            if caller is not None:
                calls.append(ExtractedCall(caller, callee_name, object_name))

        def visit(node) -> None:
            if node.type == _AWAIT_NODE:
                awaited_call = node.child_by_field_name("argument") or next(
                    (child for child in node.named_children if child.type in _CALL_NODES),
                    None,
                )
                if awaited_call is not None and awaited_call.type in _CALL_NODES:
                    add_call(awaited_call)
            if node.type in _CALL_NODES:
                add_call(node)
            for child in node.named_children:
                visit(child)

        visit(root_node)
        # Prevent garbage collection of the tree
        _ = tree
        return calls

    @classmethod
    def _extract_call_chains(
        cls, tree, source: bytes
    ) -> list[ExtractedCallChain]:
        root_node = tree.root_node if hasattr(tree, "root_node") else tree
        chains: list[ExtractedCallChain] = []

        def visit(node) -> None:
            # Descend first so user.find().populate().exec() is emitted in
            # execution order: find -> populate, then populate -> exec.
            for child in node.named_children:
                visit(child)

            if node.type in _CALL_NODES:
                function_node = node.child_by_field_name("function")
                object_node = (
                    function_node.child_by_field_name("object")
                    if function_node is not None and function_node.type == "member_expression"
                    else None
                )
                if object_node is not None and object_node.type in _CALL_NODES:
                    source_reference = cls._call_reference(object_node, source)
                    target_reference = cls._call_reference(node, source)
                    if source_reference is not None and target_reference is not None:
                        source_name, source_object_name = source_reference
                        target_name, target_object_name = target_reference
                        chains.append(
                            ExtractedCallChain(
                                source_name,
                                source_object_name,
                                target_name,
                                target_object_name,
                            )
                        )

        visit(root_node)
        # Prevent garbage collection of the tree
        _ = tree
        return chains

    @classmethod
    def _caller_for_call(
        cls, call_node, functions: list[ExtractedEntity], source: bytes
    ) -> ExtractedEntity | None:
        """Resolve the nearest named enclosing function as a call expression's caller."""
        node = call_node.parent
        while node is not None:
            caller = cls._function_entity_for_node(node, functions, source)
            if caller is not None:
                return caller
            node = node.parent
        return None

    @classmethod
    def _function_entity_for_node(
        cls, node, functions: list[ExtractedEntity], source: bytes
    ) -> ExtractedEntity | None:
        if node.type in _FUNCTION_NODES:
            name_node = node.child_by_field_name("name")
        elif node.type in {"arrow_function", "function_expression"}:
            binding = node.parent
            if binding is None or binding.type != "variable_declarator":
                return None
            value = binding.child_by_field_name("value")
            if (
                value is None
                or value.start_byte != node.start_byte
                or value.end_byte != node.end_byte
            ):
                return None
            name_node = binding.child_by_field_name("name")
            node = binding
        else:
            return None

        name = cls._node_text(name_node, source)
        return next(
            (
                entity
                for entity in functions
                if entity.name == name
                and entity.start_line == node.start_point[0] + 1
                and entity.end_line == node.end_point[0] + 1
            ),
            None,
        )

    @classmethod
    def _call_reference(cls, node, source: bytes) -> tuple[str, str | None] | None:
        """Return a simple callee or a member call's method and object names."""
        function_node = node.child_by_field_name("function")
        if function_node is None:
            return None

        if function_node.type == "identifier":
            return cls._node_text(function_node, source), None
        if function_node.type != "member_expression":
            return None

        object_node = function_node.child_by_field_name("object")
        method_node = function_node.child_by_field_name("property")
        if object_node is None or method_node is None:
            return None
        object_name = cls._node_text(object_node, source)
        method_name = cls._node_text(method_node, source)
        if not _REFERENCE.fullmatch(method_name):
            return None
        return method_name, object_name if _REFERENCE.fullmatch(object_name) else None

    @classmethod
    def _extract_imports(
        cls,
        tree,
        source: bytes,
        language: str,
        source_file: File,
        files_by_path: dict[str, File],
    ) -> list[ImportBinding]:
        root_node = tree.root_node if hasattr(tree, "root_node") else tree
        bindings: list[ImportBinding] = []

        def resolve(module: str, local_name: str, target_name: str | None, is_namespace: bool) -> None:
            target_file = RelationshipPersistenceService._resolve_import(
                source_file.path, language, module, files_by_path
            )
            if target_file is not None:
                bindings.append(
                    ImportBinding(local_name, target_file.id, target_name, is_namespace)
                )

        def visit(node) -> None:
            if language == "Python" and node.type in {"import_statement", "import_from_statement"}:
                cls._python_import_bindings(node, source, resolve)
            elif language != "Python" and node.type == "import_statement":
                cls._javascript_import_bindings(node, source, resolve)
            for child in node.named_children:
                visit(child)

        visit(root_node)
        # Prevent garbage collection of the tree
        _ = tree
        return bindings

    @classmethod
    def _python_import_bindings(cls, node, source: bytes, resolve) -> None:
        statement = cls._node_text(node, source).split("#", 1)[0].strip()
        from_match = _PYTHON_FROM_IMPORT.match(statement)
        if from_match is not None:
            module = from_match.group("module")
            for member in from_match.group("members").strip("() ").split(","):
                original, local = cls._import_name(member)
                if original and original != "*":
                    resolve(module, local, original, False)
            return
        import_match = _PYTHON_IMPORT.match(statement)
        if import_match is not None:
            for member in import_match.group("members").split(","):
                module, local = cls._import_name(member)
                if module:
                    resolve(module, local.split(".", 1)[0], None, True)

    @classmethod
    def _javascript_import_bindings(cls, node, source: bytes, resolve) -> None:
        source_node = node.child_by_field_name("source")
        if source_node is None:
            return
        module = cls._node_text(source_node, source).strip("\"'")
        clause = next((child for child in node.named_children if child.type == "import_clause"), None)
        if clause is None:
            return
        for child in clause.named_children:
            if child.type == "identifier":
                resolve(module, cls._node_text(child, source), "default", False)
            elif child.type == "namespace_import":
                identifier = next((item for item in child.named_children if item.type == "identifier"), None)
                if identifier is not None:
                    resolve(module, cls._node_text(identifier, source), None, True)
            elif child.type == "named_imports":
                for specifier in child.named_children:
                    if specifier.type != "import_specifier":
                        continue
                    name_node = specifier.child_by_field_name("name")
                    alias_node = specifier.child_by_field_name("alias")
                    named = specifier.named_children
                    original = cls._node_text(name_node or (named[0] if named else None), source)
                    local = cls._node_text(alias_node or (named[-1] if named else None), source)
                    if original and local:
                        resolve(module, local, original, False)

    @staticmethod
    def _import_name(value: str) -> tuple[str, str]:
        parts = re.split(r"\s+as\s+", value.strip(), maxsplit=1)
        original = parts[0].strip()
        return original, parts[-1].strip() if len(parts) == 2 else original

    @staticmethod
    def _node_text(node, source: bytes) -> str:
        if node is None:
            return ""
        return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

    @classmethod
    def _replace_project_entities(
        cls, files: list[File], extractions: dict[int, FileExtraction]
    ) -> tuple[int, int, int]:
        file_ids = [file.id for file in files]
        try:
            with SessionLocal() as session:
                existing_entity_ids = list(
                    session.scalars(select(CodeEntity.id).where(CodeEntity.file_id.in_(file_ids)))
                ) if file_ids else []
                if existing_entity_ids:
                    session.execute(
                        delete(EntityRelationship).where(
                            or_(
                                EntityRelationship.source_entity_id.in_(existing_entity_ids),
                                EntityRelationship.target_entity_id.in_(existing_entity_ids),
                            )
                        )
                    )
                    session.execute(delete(CodeEntity).where(CodeEntity.id.in_(existing_entity_ids)))

                stored: dict[tuple[int, ExtractedEntity], CodeEntity] = {}
                for file_id, extraction in extractions.items():
                    for entity in extraction.entities:
                        record = CodeEntity(
                            file_id=file_id,
                            name=entity.name,
                            entity_type=entity.entity_type,
                            start_line=entity.start_line,
                            end_line=entity.end_line,
                        )
                        session.add(record)
                        stored[(file_id, entity)] = record
                session.flush()

                # Query all function entities for this project's files once.
                # Note: after session.flush(), the newly added functions are also in the DB / transaction.
                all_functions = session.scalars(
                    select(CodeEntity)
                    .where(
                        CodeEntity.file_id.in_(file_ids),
                        CodeEntity.entity_type == "function",
                    )
                    .order_by(CodeEntity.start_line)
                ).all() if file_ids else []

                # Build a mapping from (file_id, function_name) -> list of CodeEntity
                function_map: dict[tuple[int, str], list[CodeEntity]] = {}
                for entity in all_functions:
                    function_map.setdefault((entity.file_id, entity.name), []).append(entity)

                function_by_file_and_name: dict[tuple[int, str], list[CodeEntity]] = {}
                for record in stored.values():
                    if record.entity_type == "function":
                        function_by_file_and_name.setdefault((record.file_id, record.name), []).append(record)

                call_count = 0
                unmatched_count = 0
                relationships: set[tuple[int, int, str]] = set()
                for file_id, extraction in extractions.items():
                    imports = {binding.local_name: binding for binding in extraction.imports}
                    for call in extraction.calls:
                        call_count += 1
                        source = stored.get((file_id, call.caller))
                        source_id = (
                            source.id
                            if source is not None and source.file_id == file_id
                            else cls._find_function_entity_id(
                                session, call.caller.name, None, file_id, {}, function_map
                            )
                        )
                        target_id = cls._find_function_entity_id(
                            session,
                            call.callee_name,
                            call.object_name,
                            file_id,
                            imports,
                            function_map,
                        )
                        if target_id is None:
                            target = cls._resolve_call_target(
                                call, file_id, imports, function_by_file_and_name
                            )
                            target_id = target.id if target is not None else None
                        if source_id is None or target_id is None:
                            unmatched_count += 1
                        else:
                            relationships.add((source_id, target_id, "CALLS"))
                    for chain in extraction.call_chains:
                        call_count += 1
                        source_id = cls._find_function_entity_id(
                            session,
                            chain.source_name,
                            None,
                            file_id,
                            {},
                            function_map,
                        )
                        target_id = cls._find_function_entity_id(
                            session,
                            chain.target_name,
                            chain.target_object_name,
                            file_id,
                            imports,
                            function_map,
                        )
                        if source_id is None or target_id is None:
                            unmatched_count += 1
                        else:
                            relationships.add((source_id, target_id, "CALLS"))
                session.add_all(
                    EntityRelationship(
                        source_entity_id=source_id,
                        target_entity_id=target_id,
                        relationship_type=relationship_type,
                    )
                    for source_id, target_id, relationship_type in sorted(relationships)
                )
                session.commit()
                return len(stored), call_count, unmatched_count
        except SQLAlchemyError as error:
            raise EntityPersistenceError("Could not persist extracted code entities.") from error

    @staticmethod
    def _resolve_call_target(
        call: ExtractedCall,
        file_id: int,
        imports: dict[str, ImportBinding],
        functions: dict[tuple[int, str], list[CodeEntity]],
    ) -> CodeEntity | None:
        return CodeEntityPersistenceService._resolve_function_reference(
            call.callee_name, call.object_name, file_id, imports, functions
        )

    @staticmethod
    def _resolve_function_reference(
        function_name: str | None,
        object_name: str | None,
        file_id: int,
        imports: dict[str, ImportBinding],
        functions: dict[tuple[int, str], list[CodeEntity]],
    ) -> CodeEntity | None:
        """Resolve a direct or member function reference to a persisted entity."""
        if function_name is None:
            return None
        binding = imports.get(object_name or function_name)
        if binding is not None:
            target_name = function_name if binding.is_namespace else binding.target_name
            if target_name is not None:
                candidates = functions.get((binding.target_file_id, target_name), [])
                if candidates:
                    return min(candidates, key=lambda entity: entity.start_line)
            return None
        candidates = functions.get((file_id, function_name), [])
        if candidates:
            return min(candidates, key=lambda entity: entity.start_line)
        return None

    @classmethod
    def _find_function_entity_id(
        cls,
        session,
        function_name: str | None,
        object_name: str | None,
        file_id: int,
        imports: dict[str, ImportBinding],
        function_map: dict[tuple[int, str], list[CodeEntity]] = None,
    ) -> int | None:
        """Look up the persisted entity ID for a parsed direct or member call."""
        target_name, target_file_id = cls._reference_target(
            function_name, object_name, file_id, imports
        )
        if target_name is None:
            return None
        if function_map is not None:
            candidates = function_map.get((target_file_id, target_name), [])
            if candidates:
                return candidates[0].id
            return None
        return session.scalar(
            select(CodeEntity.id)
            .where(
                CodeEntity.file_id == target_file_id,
                CodeEntity.name == target_name,
                CodeEntity.entity_type == "function",
            )
            .order_by(CodeEntity.start_line)
        )

    @staticmethod
    def _reference_target(
        function_name: str | None,
        object_name: str | None,
        file_id: int,
        imports: dict[str, ImportBinding],
    ) -> tuple[str | None, int]:
        """Return the persisted file and function name expected for one call."""
        if function_name is None:
            return None, file_id
        binding = imports.get(object_name or function_name)
        if binding is None:
            return function_name, file_id
        if binding.is_namespace:
            return function_name, binding.target_file_id
        return binding.target_name, binding.target_file_id
