import unittest

from app.services.api_route_extractor import ApiRouteExtractor
from app.services.parser_service import ParserService


class ApiRouteExtractorTests(unittest.TestCase):
    def test_extracts_direct_express_route_metadata_from_ast(self):
        source = b'router.post("/api/login", loginController); app.get("/health", health);'
        tree = ParserService._parser_for(".js").parse(source)
        routes = ApiRouteExtractor().extract(tree.root_node, source)
        self.assertEqual(
            [(route.method, route.path, route.handler_name, route.framework) for route in routes],
            [("POST", "/api/login", "loginController", "express"), ("GET", "/health", "health", "express")],
        )
