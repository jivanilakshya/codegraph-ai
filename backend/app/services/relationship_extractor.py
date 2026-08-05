"""Read-only Tree-sitter relationship extraction service."""

from tree_sitter import Node

from app.schemas.relationships import Relationship
from app.schemas.symbols import SymbolResponse


class RelationshipExtractor:
    """Extract deterministic symbol relationships from a Tree-sitter AST."""

    # These built-ins describe module loading or language behaviour rather than
    # application-level calls, so they do not produce useful graph edges.
    _IGNORED_CALL_TARGETS = frozenset({"require", "import", "super"})

    def extract(
        self,
        root_node: Node,
        source: bytes,
        language: str,
        source_file: str,
        symbols: SymbolResponse,
    ) -> list[Relationship]:
        """Return supported relationships without persisting analysis output."""
        if language != "JavaScript":
            return []
        if not isinstance(source, bytes):
            raise TypeError("source must be provided as UTF-8 encoded bytes.")

        relationships: list[Relationship] = []
        seen: set[tuple[str, str, str]] = set()

        self._extract_imports(source_file, symbols, relationships, seen)
        self._extract_exports(source_file, symbols, relationships, seen)
        self._visit_javascript(root_node, source, source_file, relationships, seen)
        return relationships

    def _visit_javascript(
        self,
        node: Node,
        source: bytes,
        source_file: str,
        relationships: list[Relationship],
        seen: set[tuple[str, str, str]],
    ) -> None:
        """Recursively traverse JavaScript AST nodes once for structural relationships."""
        if node.type == "call_expression":
            self._extract_calls(node, source, source_file, relationships, seen)
        elif node.type == "class_declaration":
            self._extract_extends(node, source, relationships, seen)
            self._extract_class_relationships(node, source, relationships, seen)

        for child in node.named_children:
            self._visit_javascript(child, source, source_file, relationships, seen)

    def _extract_imports(
        self,
        source_file: str,
        symbols: SymbolResponse,
        relationships: list[Relationship],
        seen: set[tuple[str, str, str]],
    ) -> None:
        """Create file-to-symbol IMPORTS relationships from extracted symbols."""
        for imported_symbol in symbols.imports:
            self._add_relationship(
                relationships,
                seen,
                source=source_file,
                target=imported_symbol,
                relationship="IMPORTS",
            )

    def _extract_exports(
        self,
        source_file: str,
        symbols: SymbolResponse,
        relationships: list[Relationship],
        seen: set[tuple[str, str, str]],
    ) -> None:
        """Create symbol-to-file EXPORTED_BY relationships from extracted symbols."""
        for exported_symbol in symbols.exports:
            self._add_relationship(
                relationships,
                seen,
                source=exported_symbol,
                target=source_file,
                relationship="EXPORTED_BY",
            )

    def _extract_calls(
        self,
        node: Node,
        source: bytes,
        source_file: str,
        relationships: list[Relationship],
        seen: set[tuple[str, str, str]],
    ) -> None:
        """Create a CALLS relationship for one JavaScript call expression."""
        function = node.child_by_field_name("function")
        target = self._call_target(function, source)
        if target is None or target in self._IGNORED_CALL_TARGETS:
            return

        self._add_relationship(
            relationships,
            seen,
            source=source_file,
            target=target,
            relationship="CALLS",
        )

    def _extract_class_relationships(
        self,
        node: Node,
        source: bytes,
        relationships: list[Relationship],
        seen: set[tuple[str, str, str]],
    ) -> None:
        """Create HAS_METHOD relationships for a class declaration."""
        class_name = self._declaration_name(node, source)
        if class_name is None:
            return

        class_body = node.child_by_field_name("body")
        if class_body is None:
            return
        for member in class_body.named_children:
            if member.type != "method_definition":
                continue
            method_name = self._declaration_name(member, source)
            if method_name is not None:
                self._add_relationship(
                    relationships,
                    seen,
                    source=class_name,
                    target=method_name,
                    relationship="HAS_METHOD",
                )

    def _extract_extends(
        self,
        node: Node,
        source: bytes,
        relationships: list[Relationship],
        seen: set[tuple[str, str, str]],
    ) -> None:
        """Create an EXTENDS relationship for a class's direct superclass."""
        class_name = self._declaration_name(node, source)
        superclass = self._class_superclass(node, source)
        if class_name is None or superclass is None:
            return

        self._add_relationship(
            relationships,
            seen,
            source=class_name,
            target=superclass,
            relationship="EXTENDS",
        )

    def _call_target(self, node: Node | None, source: bytes) -> str | None:
        """Return the terminal callable name for identifier or member calls."""
        if node is None:
            return None
        if node.type == "identifier":
            return self._node_text(node, source)
        if node.type == "member_expression":
            property_node = node.child_by_field_name("property")
            if property_node is not None:
                return self._node_text(property_node, source)
        return None

    def _class_superclass(self, node: Node, source: bytes) -> str | None:
        """Return the declared class superclass across JavaScript grammar variants."""
        superclass = node.child_by_field_name("superclass")
        if superclass is not None:
            return self._node_text(superclass, source)

        heritage = next(
            (child for child in node.named_children if child.type == "class_heritage"),
            None,
        )
        if heritage is None or not heritage.named_children:
            return None
        return self._node_text(heritage.named_children[0], source)

    def _declaration_name(self, node: Node, source: bytes) -> str | None:
        """Return a declaration node's grammar-defined name."""
        name = node.child_by_field_name("name")
        return self._node_text(name, source) if name is not None else None

    @staticmethod
    def _node_text(node: Node, source: bytes) -> str:
        """Read a Tree-sitter node's UTF-8 source text."""
        return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

    @staticmethod
    def _add_relationship(
        relationships: list[Relationship],
        seen: set[tuple[str, str, str]],
        *,
        source: str,
        target: str,
        relationship: str,
    ) -> None:
        """Append one unique relationship while preserving discovery order."""
        key = (source, target, relationship)
        if key not in seen:
            seen.add(key)
            relationships.append(Relationship(**dict(zip(("source", "target", "relationship"), key))))
