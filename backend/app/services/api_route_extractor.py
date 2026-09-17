"""AST-based extraction of Express-style HTTP route registrations."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ApiRoute:
    method: str
    path: str
    handler_name: str
    framework: str = "express"

    @property
    def route_id(self) -> str:
        return f"express:{self.method}:{self.path}:{self.handler_name}"


class ApiRouteExtractor:
    """Detect direct ``app/router.get/post(path, handler)`` AST calls."""

    _METHODS = {"get", "post", "put", "patch", "delete", "head", "options"}

    def extract(self, root_node, source: bytes) -> list[ApiRoute]:
        routes: list[ApiRoute] = []
        self._visit(root_node, source, routes)
        return list(dict.fromkeys(routes))

    def _visit(self, node, source: bytes, routes: list[ApiRoute]) -> None:
        if node.type == "call_expression":
            route = self._route_from_call(node, source)
            if route is not None:
                routes.append(route)
        for child in node.named_children:
            self._visit(child, source, routes)

    def _route_from_call(self, node, source: bytes) -> ApiRoute | None:
        function = node.child_by_field_name("function")
        arguments = node.child_by_field_name("arguments")
        if function is None or function.type != "member_expression" or arguments is None:
            return None
        object_node = function.child_by_field_name("object")
        property_node = function.child_by_field_name("property")
        if object_node is None or property_node is None:
            return None
        receiver = self._text(object_node, source)
        method = self._text(property_node, source).lower()
        if receiver not in {"app", "router", "Router"} or method not in self._METHODS:
            return None
        values = arguments.named_children
        if len(values) < 2 or values[0].type != "string":
            return None
        handler = values[-1]
        if handler.type != "identifier":
            return None
        return ApiRoute(method.upper(), self._text(values[0], source).strip("\"'"), self._text(handler, source))

    @staticmethod
    def _text(node, source: bytes) -> str:
        return source[node.start_byte:node.end_byte].decode("utf-8", errors="replace")
