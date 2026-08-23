"""Unit tests for AST-based code chunking."""

import tempfile
import unittest
from pathlib import Path

from app.ai.chunker import CodeChunker


class CodeChunkerTests(unittest.TestCase):
    """Verify AST-based chunking, line-based fallback, and greedy merging."""

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.temp_path = Path(self.temp_dir.name)
        self.chunker = CodeChunker()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_python_chunker_basic(self) -> None:
        # A file where all components fit within max_chars (1000)
        source = (
            "import os\n"
            "import sys\n"
            "\n"
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
            "\n"
            "def greet(name):\n"
            "    return f'Hello, {name}'\n"
        )
        file_path = self.temp_path / "test.py"
        file_path.write_text(source, encoding="utf-8")

        # Since max_chars is large, greedy merge should bundle imports and structures together
        chunks = self.chunker.chunk_file(file_path, max_chars=1000)

        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].content, source)
        self.assertEqual(chunks[0].start_line, 1)
        self.assertEqual(chunks[0].end_line, 10)

    def test_python_chunker_separates_large_units(self) -> None:
        # Set max_chars low enough to force partitioning but keep functions intact if they fit
        source = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
            "\n"
            "    def subtract(self, a, b):\n"
            "        return a - b\n"
        )
        file_path = self.temp_path / "test.py"
        file_path.write_text(source, encoding="utf-8")

        # Class Calculator (approx 120 chars) exceeds max_chars=80.
        # But methods 'add' and 'subtract' are each approx 45 chars, so they fit individually.
        chunks = self.chunker.chunk_file(file_path, max_chars=80)

        # Expected partitions:
        # - Class header + first method (if they fit in 80 chars, let's verify lengths):
        #   "class Calculator:\n    def add(self, a, b):\n        return a + b\n" is 67 chars. Fits!
        # - Second method:
        #   "    def subtract(self, a, b):\n        return a - b\n" is 50 chars. Fits!
        # Thus, greedy merging should produce 2 chunks.
        self.assertEqual(len(chunks), 2)
        self.assertIn("class Calculator", chunks[0].content)
        self.assertIn("def add", chunks[0].content)
        self.assertNotIn("def subtract", chunks[0].content)

        self.assertIn("def subtract", chunks[1].content)
        self.assertNotIn("class Calculator", chunks[1].content)

    def test_python_chunker_splits_oversized_function(self) -> None:
        # A single function that exceeds max_chars = 100
        source = (
            "def giant_function():\n"
            "    # Line 2\n"
            "    # Line 3\n"
            "    # Line 4\n"
            "    # Line 5\n"
            "    # Line 6\n"
            "    # Line 7\n"
            "    # Line 8\n"
            "    # Line 9\n"
            "    pass\n"
        )
        file_path = self.temp_path / "giant.py"
        file_path.write_text(source, encoding="utf-8")

        # The function exceeds 100 chars, so it must be split line-by-line.
        chunks = self.chunker.chunk_file(file_path, max_chars=80)

        self.assertGreater(len(chunks), 1)
        # Verify the chunks reconstruct the original code sequentially
        reconstructed = "".join(chunk.content for chunk in chunks)
        self.assertEqual(reconstructed, source.strip())

    def test_javascript_chunker_basic(self) -> None:
        source = (
            "import { helper } from './helper';\n"
            "\n"
            "class User {\n"
            "    constructor(name) {\n"
            "        this.name = name;\n"
            "    }\n"
            "    save() {\n"
            "        return 1;\n"
            "    }\n"
            "}\n"
            "\n"
            "export function main() {\n"
            "    return new User('test').save();\n"
            "}\n"
        )
        file_path = self.temp_path / "test.js"
        file_path.write_text(source, encoding="utf-8")

        # With low max_chars, it should split user class and methods
        chunks = self.chunker.chunk_file(file_path, max_chars=90)

        self.assertGreater(len(chunks), 1)
        self.assertTrue(any("class User" in chunk.content for chunk in chunks))
        self.assertTrue(any("export function main" in chunk.content for chunk in chunks))

    def test_unsupported_language_fallback(self) -> None:
        # Use a genuinely unsupported extension (.css) to verify line-based fallback.
        source = (
            "body {\n"
            "    background: red;\n"
            "    color: white;\n"
            "}\n"
        )
        file_path = self.temp_path / "styles.css"
        file_path.write_text(source, encoding="utf-8")

        chunks = self.chunker.chunk_file(file_path, max_chars=50)

        self.assertGreater(len(chunks), 0)
        reconstructed = "".join(chunk.content for chunk in chunks)
        self.assertEqual(reconstructed, source)

    def test_syntax_error_fallback(self) -> None:
        source = (
            "def broken_function(\n"
            "    print('missing closing parenthesis'\n"
        )
        file_path = self.temp_path / "broken.py"
        file_path.write_text(source, encoding="utf-8")

        chunks = self.chunker.chunk_file(file_path, max_chars=40)

        self.assertGreater(len(chunks), 0)
        reconstructed = "".join(chunk.content for chunk in chunks)
        self.assertEqual(reconstructed, source)

    # ------------------------------------------------------------------
    # Markdown chunker tests
    # ------------------------------------------------------------------

    def test_markdown_multiple_headings(self) -> None:
        """Each top-level heading becomes its own documentation chunk."""
        source = (
            "# Introduction\n"
            "\n"
            "Welcome to the project.\n"
            "\n"
            "## Installation\n"
            "\n"
            "Run `pip install`.\n"
            "\n"
            "## Usage\n"
            "\n"
            "Import and use.\n"
        )
        file_path = self.temp_path / "README.md"
        file_path.write_text(source, encoding="utf-8")

        chunks = self.chunker.chunk_file(file_path)

        self.assertEqual(len(chunks), 3)

        # All chunks must be documentation
        for chunk in chunks:
            self.assertEqual(chunk.entity_type, "documentation")

        # Heading names are captured
        names = [chunk.name for chunk in chunks]
        self.assertEqual(names, ["Introduction", "Installation", "Usage"])

        # Heading text is preserved in chunk content
        self.assertIn("# Introduction", chunks[0].content)
        self.assertIn("## Installation", chunks[1].content)
        self.assertIn("## Usage", chunks[2].content)

        # Line numbers are 1-based and sequential
        self.assertEqual(chunks[0].start_line, 1)
        self.assertEqual(chunks[1].start_line, 5)
        self.assertEqual(chunks[2].start_line, 9)

    def test_markdown_nested_headings(self) -> None:
        """Nested headings each produce a separate chunk."""
        source = (
            "# Top Level\n"
            "\n"
            "Intro text.\n"
            "\n"
            "## Sub Section\n"
            "\n"
            "Sub text.\n"
            "\n"
            "### Deep Section\n"
            "\n"
            "Deep text.\n"
        )
        file_path = self.temp_path / "nested.md"
        file_path.write_text(source, encoding="utf-8")

        chunks = self.chunker.chunk_file(file_path)

        self.assertEqual(len(chunks), 3)
        self.assertEqual(chunks[0].name, "Top Level")
        self.assertEqual(chunks[1].name, "Sub Section")
        self.assertEqual(chunks[2].name, "Deep Section")

        # Each heading must appear in its own chunk's content
        self.assertIn("# Top Level", chunks[0].content)
        self.assertIn("## Sub Section", chunks[1].content)
        self.assertIn("### Deep Section", chunks[2].content)

        # Sub-section content must NOT bleed into the top-level chunk
        self.assertNotIn("## Sub Section", chunks[0].content)

    def test_markdown_no_headings(self) -> None:
        """A Markdown file with no headings becomes a single file-level chunk."""
        source = (
            "This file has no headings at all.\n"
            "\n"
            "Just plain prose.\n"
        )
        file_path = self.temp_path / "prose.md"
        file_path.write_text(source, encoding="utf-8")

        chunks = self.chunker.chunk_file(file_path)

        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].entity_type, "documentation")
        self.assertIsNone(chunks[0].name)
        self.assertEqual(chunks[0].content, source)
        self.assertEqual(chunks[0].start_line, 1)

    def test_markdown_empty_file(self) -> None:
        """An empty Markdown file returns an empty chunk list."""
        file_path = self.temp_path / "empty.md"
        file_path.write_text("", encoding="utf-8")

        chunks = self.chunker.chunk_file(file_path)

        self.assertEqual(chunks, [])


if __name__ == "__main__":
    unittest.main()
