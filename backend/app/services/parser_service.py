"""Read-only Tree-sitter code exploration service."""

import logging
from dataclasses import dataclass
from pathlib import Path

try:
    import tree_sitter_javascript as ts_javascript
    import tree_sitter_python as ts_python
    import tree_sitter_typescript as ts_typescript
    from tree_sitter import Language, Parser
except ImportError as import_error:
    Language = None  # type: ignore[assignment,misc]
    Parser = None  # type: ignore[assignment,misc]
    TREE_SITTER_IMPORT_ERROR: ImportError | None = import_error
else:
    TREE_SITTER_IMPORT_ERROR = None

logger = logging.getLogger(__name__)

MAX_SOURCE_FILE_SIZE_BYTES = 5 * 1024 * 1024

LANGUAGE_BY_EXTENSION = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
}

IMPORT_NODE_TYPES = {"import_statement", "import_from_statement"}
CLASS_NODE_TYPES = {"class_definition", "class_declaration"}
FUNCTION_NODE_TYPES = {"function_definition", "function_declaration"}
METHOD_NODE_TYPES = {"method_definition"}
INTERFACE_NODE_TYPES = {"interface_declaration"}
NAME_NODE_TYPES = {"identifier", "property_identifier", "type_identifier"}


class ParserServiceError(Exception):
    """Base exception for code exploration failures."""


class ParserDependencyError(ParserServiceError):
    """Raised when the Tree-sitter runtime or language grammars are unavailable."""


class UnsupportedLanguageError(ParserServiceError):
    """Raised when a file extension has no enabled Tree-sitter grammar."""


class SourceFileNotFoundError(ParserServiceError):
    """Raised when an expected source file is missing from the filesystem."""


class SourceFileTooLargeError(ParserServiceError):
    """Raised when a source file exceeds the parser safety limit."""


class SourceSyntaxError(ParserServiceError):
    """Raised when Tree-sitter reports a syntax-error node."""


class SourceReadError(ParserServiceError):
    """Raised when a source file cannot be read."""


@dataclass(frozen=True)
class ParsedNode:
    """Serializable details for a named syntax node."""

    name: str
    type: str
    start_line: int
    end_line: int


@dataclass(frozen=True)
class RawAstPoint:
    """A zero-based Tree-sitter source position."""

    row: int
    column: int


@dataclass(frozen=True)
class RawAstNode:
    """A recursive, serializable representation of a Tree-sitter node."""

    type: str
    is_named: bool
    start_byte: int
    end_byte: int
    start_point: RawAstPoint
    end_point: RawAstPoint
    children: list["RawAstNode"]


@dataclass(frozen=True)
class ParsedFile:
    """Read-only AST summary returned by the parser service."""

    file: str
    language: str
    ast: RawAstNode
    imports: list[ParsedNode]
    classes: list[ParsedNode]
    functions: list[ParsedNode]
    methods: list[ParsedNode]
    interfaces: list[ParsedNode]


class ParserService:
    """Parse supported source files and extract high-level declaration nodes."""

    def parse_file(self, file_path: Path) -> ParsedFile:
        """Parse one absolute source path without persisting parser output."""
        if not file_path.is_absolute():
            raise SourceFileNotFoundError("An absolute source file path is required.")
        if not file_path.exists() or not file_path.is_file():
            raise SourceFileNotFoundError("Source file was not found.")

        language_name = self.detect_language(file_path)
        file_size = file_path.stat().st_size
        if file_size > MAX_SOURCE_FILE_SIZE_BYTES:
            raise SourceFileTooLargeError("Source file exceeds the 5 MB parser limit.")

        try:
            source = file_path.read_bytes()
        except OSError as error:
            logger.exception("Failed to read source file: %s", file_path)
            raise SourceReadError("Source file could not be read.") from error

        parser = self._parser_for(file_path.suffix.lower())
        tree = parser.parse(source)
        if tree is None:
            raise ParserServiceError("Tree-sitter could not parse the source file.")
        if tree.root_node.has_error:
            logger.warning("Tree-sitter reported a syntax error in: %s", file_path)
            raise SourceSyntaxError("Source file contains syntax errors.")

        parsed_file = self._extract_nodes(tree.root_node, source, file_path.name, language_name)
        logger.info(
            "Parsed %s as %s (%s imports, %s classes, %s functions, %s methods, %s interfaces)",
            file_path,
            language_name,
            len(parsed_file.imports),
            len(parsed_file.classes),
            len(parsed_file.functions),
            len(parsed_file.methods),
            len(parsed_file.interfaces),
        )
        return parsed_file

    @staticmethod
    def detect_language(file_path: Path) -> str:
        """Return the enabled Tree-sitter language for a source extension."""
        language_name = LANGUAGE_BY_EXTENSION.get(file_path.suffix.lower())
        if language_name is None:
            raise UnsupportedLanguageError(
                f"Unsupported source language: {file_path.suffix or 'no extension'}."
            )
        return language_name

    @staticmethod
    def _parser_for(extension: str):
        """Build a parser with the grammar appropriate for one supported extension."""
        if TREE_SITTER_IMPORT_ERROR is not None or Language is None or Parser is None:
            raise ParserDependencyError(
                "Tree-sitter dependencies are unavailable. Rebuild the backend image."
            ) from TREE_SITTER_IMPORT_ERROR

        if extension == ".py":
            language = Language(ts_python.language())
        elif extension == ".js":
            language = Language(ts_javascript.language())
        elif extension == ".tsx":
            language = Language(ts_typescript.language_tsx())
        else:
            language = Language(ts_typescript.language_typescript())

        return Parser(language)

    @classmethod
    def _extract_nodes(cls, root_node, source: bytes, file_name: str, language: str) -> ParsedFile:
        """Walk a syntax tree and collect high-level declarations by category."""
        imports: list[ParsedNode] = []
        classes: list[ParsedNode] = []
        functions: list[ParsedNode] = []
        methods: list[ParsedNode] = []
        interfaces: list[ParsedNode] = []

        def visit(node, scope: str = "module") -> None:
            node_type = node.type
            if node_type in IMPORT_NODE_TYPES:
                imports.append(cls._node_details(node, source, import_node=True))
            elif node_type in CLASS_NODE_TYPES:
                classes.append(cls._node_details(node, source))
                scope = "class"
            elif node_type in INTERFACE_NODE_TYPES:
                interfaces.append(cls._node_details(node, source))
                scope = "interface"
            elif node_type in METHOD_NODE_TYPES:
                methods.append(cls._node_details(node, source))
                scope = "function"
            elif node_type in FUNCTION_NODE_TYPES:
                details = cls._node_details(node, source)
                if scope == "class":
                    methods.append(details)
                else:
                    functions.append(details)
                scope = "function"

            for child in node.named_children:
                visit(child, scope)

        visit(root_node)
        return ParsedFile(
            file=file_name,
            language=language,
            ast=cls._raw_ast_node(root_node),
            imports=imports,
            classes=classes,
            functions=functions,
            methods=methods,
            interfaces=interfaces,
        )

    @classmethod
    def _raw_ast_node(cls, node) -> RawAstNode:
        """Recursively convert a Tree-sitter node into raw AST JSON data."""
        return RawAstNode(
            type=node.type,
            is_named=node.is_named,
            start_byte=node.start_byte,
            end_byte=node.end_byte,
            start_point=RawAstPoint(
                row=node.start_point.row,
                column=node.start_point.column,
            ),
            end_point=RawAstPoint(
                row=node.end_point.row,
                column=node.end_point.column,
            ),
            children=[cls._raw_ast_node(child) for child in node.children],
        )

    @staticmethod
    def _node_details(node, source: bytes, *, import_node: bool = False) -> ParsedNode:
        """Convert a Tree-sitter node to the public response representation."""
        name_node = node.child_by_field_name("name")
        if import_node:
            name_node = node.child_by_field_name("source") or name_node
        if name_node is None:
            name_node = next(
                (child for child in node.named_children if child.type in NAME_NODE_TYPES),
                None,
            )

        text_node = name_node or node
        name = source[text_node.start_byte : text_node.end_byte].decode(
            "utf-8", errors="replace"
        )
        return ParsedNode(
            name=name,
            type=node.type,
            start_line=node.start_point.row + 1,
            end_line=node.end_point.row + 1,
        )
