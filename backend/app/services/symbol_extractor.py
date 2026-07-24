"""Reusable Tree-sitter symbol extraction service."""

from collections.abc import Callable

from tree_sitter import Node

from app.schemas.symbols import SymbolResponse


class SymbolExtractor:
    """Extract high-level language symbols from a Tree-sitter syntax tree.

    Language-specific traversal is selected per extraction call. New languages can
    be added by registering a focused visitor method without changing callers.
    """

    def extract(self, root_node: Node, source: bytes, language: str) -> SymbolResponse:
        """Traverse a Tree-sitter AST and return symbols for the selected language."""
        if not isinstance(source, bytes):
            raise TypeError("source must be provided as UTF-8 encoded bytes.")

        symbols = SymbolResponse()
        visitor = self._visitor_for(language)
        if visitor is not None:
            visitor(root_node, source, symbols)
        return symbols

    def _visitor_for(
        self, language: str
    ) -> Callable[[Node, bytes, SymbolResponse], None] | None:
        """Return the dedicated visitor for a supported extraction language."""
        if language == "JavaScript":
            return self._visit_javascript
        return None

    def _visit_javascript(self, node: Node, source: bytes, symbols: SymbolResponse) -> None:
        """Recursively extract JavaScript symbols using grammar node types."""
        self._extract_javascript_node(node, source, symbols)
        for child in node.named_children:
            self._visit_javascript(child, source, symbols)

    def _extract_javascript_node(
        self, node: Node,
        source: bytes,
        symbols: SymbolResponse,
    ) -> None:
        """Dispatch extraction for one JavaScript syntax node."""
        if node.type == "import_statement":
            self._add_all(symbols.imports, self._import_bindings(node, source))
        elif node.type == "export_statement":
            self._add_all(symbols.exports, self._exported_names(node, source))
        elif node.type == "function_declaration":
            self._add_node_name(symbols.functions, node, source)
        elif node.type == "class_declaration":
            self._add_node_name(symbols.classes, node, source)
        elif node.type == "method_definition":
            self._add_node_name(symbols.methods, node, source)
        elif node.type == "variable_declarator":
            self._extract_variable_declarator(node, source, symbols)
        elif node.type == "assignment_expression":
            self._add_all(symbols.exports, self._commonjs_export(node, source))

    def _import_bindings(self, node: Node, source: bytes) -> list[str]:
        """Return local names introduced by an ECMAScript import statement."""
        import_clause = next(
            (child for child in node.named_children if child.type == "import_clause"),
            None,
        )
        if import_clause is None:
            return []

        bindings: list[str] = []
        for child in import_clause.named_children:
            if child.type == "identifier":
                bindings.append(self._node_text(child, source))
            elif child.type == "namespace_import":
                bindings.extend(self._identifier_children(child, source))
            elif child.type == "named_imports":
                for specifier in child.named_children:
                    alias = specifier.child_by_field_name("alias")
                    name = alias or specifier.child_by_field_name("name")
                    if name is not None:
                        bindings.append(self._node_text(name, source))
        return bindings

    def _exported_names(self, node: Node, source: bytes) -> list[str]:
        """Return the names exposed by an ECMAScript export statement."""
        declaration = next(
            (
                child
                for child in node.named_children
                if child.type in {"function_declaration", "class_declaration", "variable_declaration"}
            ),
            None,
        )
        if declaration is not None:
            return self._declaration_names(declaration, source)

        names = [
            self._node_text(child, source)
            for child in node.named_children
            if child.type == "identifier"
        ]
        if names:
            return names

        export_clause = next(
            (child for child in node.named_children if child.type == "export_clause"),
            None,
        )
        if export_clause is None:
            return []

        exported: list[str] = []
        for specifier in export_clause.named_children:
            alias = specifier.child_by_field_name("alias")
            name = alias or specifier.child_by_field_name("name")
            if name is not None:
                exported.append(self._node_text(name, source))
        return exported

    def _extract_variable_declarator(
        self,
        node: Node,
        source: bytes,
        symbols: SymbolResponse,
    ) -> None:
        """Classify variables, arrow-function bindings, and require imports."""
        name = node.child_by_field_name("name")
        value = node.child_by_field_name("value")
        if name is None or name.type != "identifier":
            return

        symbol_name = self._node_text(name, source)
        self._add_symbol(symbols.variables, symbol_name)

        if value is not None and value.type in {"arrow_function", "function_expression"}:
            self._add_symbol(symbols.functions, symbol_name)
        elif self._is_require_call(value, source):
            self._add_symbol(symbols.imports, symbol_name)

    def _is_require_call(self, node: Node | None, source: bytes) -> bool:
        """Return whether a variable value is a CommonJS require() call."""
        if node is None or node.type != "call_expression":
            return False

        function = node.child_by_field_name("function")
        return (
            function is not None
            and function.type == "identifier"
            and self._node_text(function, source) == "require"
        )

    def _commonjs_export(self, node: Node, source: bytes) -> list[str]:
        """Return the assigned identifier for supported CommonJS export targets."""
        left = node.child_by_field_name("left")
        right = node.child_by_field_name("right")
        if left is None or right is None:
            return []
        if not self._is_commonjs_export_target(left, source):
            return []
        if right.type == "identifier":
            return [self._node_text(right, source)]
        return []

    def _is_commonjs_export_target(self, node: Node, source: bytes) -> bool:
        """Return whether an assignment target is module.exports or exports.<name>."""
        target = self._node_text(node, source)
        return (
            target == "module.exports"
            or target.startswith("module.exports.")
            or target.startswith("exports.")
        )

    def _declaration_names(self, node: Node, source: bytes) -> list[str]:
        """Return symbols declared by an exported declaration node."""
        if node.type in {"function_declaration", "class_declaration"}:
            name = node.child_by_field_name("name")
            return [self._node_text(name, source)] if name is not None else []
        if node.type == "variable_declaration":
            return [
                self._node_text(declarator.child_by_field_name("name"), source)
                for declarator in node.named_children
                if declarator.type == "variable_declarator"
                and declarator.child_by_field_name("name") is not None
            ]
        return []

    def _add_node_name(self, target: list[str], node: Node, source: bytes) -> None:
        """Add a declaration's grammar-defined name to a symbol category."""
        name = node.child_by_field_name("name")
        if name is not None:
            self._add_symbol(target, self._node_text(name, source))

    def _identifier_children(self, node: Node, source: bytes) -> list[str]:
        """Return identifier children for namespace-style grammar nodes."""
        return [
            self._node_text(child, source)
            for child in node.named_children
            if child.type == "identifier"
        ]

    @staticmethod
    def _node_text(node: Node, source: bytes) -> str:
        """Read a node's UTF-8 source text defensively."""
        return source[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

    @staticmethod
    def _add_all(target: list[str], values: list[str]) -> None:
        """Append unique non-empty symbols while preserving source order."""
        for value in values:
            SymbolExtractor._add_symbol(target, value)

    @staticmethod
    def _add_symbol(target: list[str], value: str) -> None:
        """Append a unique, non-empty symbol to one response category."""
        if value and value not in target:
            target.append(value)
