"""Unit coverage for Tree-sitter call-site extraction."""

import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from app.services.entity_persistence import CodeEntityPersistenceService
from app.services.parser_service import ParserService


class EntityPersistenceCallExtractionTests(unittest.TestCase):
    """Ensure call expressions retain the enclosing caller and callee name."""

    def test_javascript_call_expressions_have_their_enclosing_function_as_caller(self) -> None:
        source = (
            b"function bar() {}\n"
            b"function sendMessage(data) {}\n"
            b"function foo(data) {\n"
            b"  bar();\n"
            b"  sendMessage(data);\n"
            b"}\n"
        )
        tree = ParserService._parser_for(".js").parse(source)

        entities = CodeEntityPersistenceService._extract_entities(tree.root_node, source)
        calls = CodeEntityPersistenceService._extract_calls(tree.root_node, source, entities)

        self.assertEqual(
            [(call.caller.name, call.callee_name, call.object_name) for call in calls],
            [("foo", "bar", None), ("foo", "sendMessage", None)],
        )

    def test_simple_local_call_resolves_to_the_matching_function_entity(self) -> None:
        source = b"function bar() {}\nfunction foo() { bar(); }\n"
        tree = ParserService._parser_for(".js").parse(source)
        entities = CodeEntityPersistenceService._extract_entities(tree.root_node, source)
        call = CodeEntityPersistenceService._extract_calls(tree.root_node, source, entities)[0]
        target = SimpleNamespace(start_line=1)

        self.assertEqual(call.caller.name, "foo")
        self.assertEqual(call.callee_name, "bar")
        self.assertIs(
            CodeEntityPersistenceService._resolve_call_target(
                call, 7, {}, {(7, "bar"): [target]}
            ),
            target,
        )

    def test_nested_single_line_function_uses_the_nearest_caller(self) -> None:
        source = b"function bar() {} function alpha() { function zeta() { bar(); } }"
        tree = ParserService._parser_for(".js").parse(source)
        entities = CodeEntityPersistenceService._extract_entities(tree.root_node, source)
        call = CodeEntityPersistenceService._extract_calls(tree.root_node, source, entities)[0]

        self.assertEqual((call.caller.name, call.callee_name), ("zeta", "bar"))

    def test_member_call_extracts_object_and_method_and_resolves_locally(self) -> None:
        source = (
            b"class User { save() {} }\n"
            b"function update(user) { user.save(); }\n"
        )
        tree = ParserService._parser_for(".js").parse(source)
        entities = CodeEntityPersistenceService._extract_entities(tree.root_node, source)
        call = CodeEntityPersistenceService._extract_calls(tree.root_node, source, entities)[0]
        target = SimpleNamespace(start_line=1)

        self.assertEqual(
            (call.caller.name, call.object_name, call.callee_name),
            ("update", "user", "save"),
        )
        self.assertIs(
            CodeEntityPersistenceService._resolve_call_target(
                call, 7, {}, {(7, "save"): [target]}
            ),
            target,
        )

    def test_chained_member_calls_extract_adjacent_call_edges(self) -> None:
        source = (
            b"class Query { find() {} populate() {} exec() {} }\n"
            b"function load(user) { return user.find().populate().exec(); }\n"
        )
        tree = ParserService._parser_for(".js").parse(source)

        chains = CodeEntityPersistenceService._extract_call_chains(tree.root_node, source)

        self.assertEqual(
            [(chain.source_name, chain.target_name) for chain in chains],
            [("find", "populate"), ("populate", "exec")],
        )

    def test_awaited_calls_are_extracted_once_with_their_normal_references(self) -> None:
        source = (
            b"async function sendMessage() {}\n"
            b"class User { async save() {} }\n"
            b"async function notify(user) {\n"
            b"  await sendMessage();\n"
            b"  await user.save();\n"
            b"}\n"
        )
        tree = ParserService._parser_for(".js").parse(source)
        entities = CodeEntityPersistenceService._extract_entities(tree.root_node, source)

        calls = CodeEntityPersistenceService._extract_calls(tree.root_node, source, entities)

        self.assertEqual(
            [(call.caller.name, call.object_name, call.callee_name) for call in calls],
            [("notify", None, "sendMessage"), ("notify", "user", "save")],
        )

    def test_resolved_call_target_uses_the_persisted_entity_id(self) -> None:
        session = Mock()
        session.scalar.return_value = 42

        entity_id = CodeEntityPersistenceService._find_function_entity_id(
            session, "save", "user", 7, {}
        )

        self.assertEqual(entity_id, 42)
        session.scalar.assert_called_once()

    def test_call_source_lookup_is_scoped_to_the_current_file(self) -> None:
        self.assertEqual(
            CodeEntityPersistenceService._reference_target("caller", None, 7, {}),
            ("caller", 7),
        )


class PythonExtractionTests(unittest.TestCase):
    """Verify that Python code parser correctly extracts classes, methods, functions, and calls."""

    def test_python_entity_extraction_distinguishes_functions_methods_and_classes(self) -> None:
        source = (
            b"class UserService:\n"
            b"    def login(self):\n"
            b"        authenticate()\n"
            b"\n"
            b"def authenticate():\n"
            b"    pass\n"
        )
        tree = ParserService._parser_for(".py").parse(source)
        entities = CodeEntityPersistenceService._extract_entities(tree.root_node, source)
        
        # Sort by start_line to get deterministic order for assertion
        entities_list = sorted(entities, key=lambda e: (e.start_line, e.name))
        self.assertEqual(
            [(e.name, e.entity_type, e.start_line, e.end_line) for e in entities_list],
            [
                ("UserService", "class", 1, 3),
                ("login", "function", 2, 3),
                ("authenticate", "function", 5, 6),
            ]
        )

    def test_python_call_extraction_links_caller_and_callee(self) -> None:
        source = (
            b"class UserService:\n"
            b"    def login(self):\n"
            b"        authenticate()\n"
            b"\n"
            b"def authenticate():\n"
            b"    pass\n"
        )
        tree = ParserService._parser_for(".py").parse(source)
        entities = CodeEntityPersistenceService._extract_entities(tree.root_node, source)
        calls = CodeEntityPersistenceService._extract_calls(tree.root_node, source, entities)

        self.assertEqual(
            [(call.caller.name, call.callee_name, call.object_name) for call in calls],
            [("login", "authenticate", None)]
        )


if __name__ == "__main__":
    unittest.main()

