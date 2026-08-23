"""AST-based semantic code chunker."""

import logging
import re
from pathlib import Path
from tree_sitter import Node

from app.services.parser_service import ParserService, UnsupportedLanguageError
from app.schemas.chunk import CodeChunk

logger = logging.getLogger(__name__)

# ATX heading pattern: 1-6 `#` characters followed by a space and the title.
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)", re.MULTILINE)


class CodeChunker:
    """AST-based semantic code chunker."""

    def chunk_file(self, file_path: Path, max_chars: int = 1000) -> list[CodeChunk]:
        """Chunk a file into semantic units, falling back to line-based chunking if needed."""
        if not file_path.is_absolute():
            raise ValueError("An absolute file path is required.")
        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"File not found: {file_path}")

        try:
            source_bytes = file_path.read_bytes()
        except OSError as error:
            logger.exception("Failed to read file: %s", file_path)
            raise RuntimeError(f"File could not be read: {file_path}") from error

        # --- Markdown: heading-based chunking (before AST path) ---------------
        if file_path.suffix.lower() == ".md":
            source_text = source_bytes.decode("utf-8", errors="replace")
            return self._chunk_markdown(source_text)

        # Try to parse the file using ParserService
        try:
            extension = file_path.suffix.lower()
            language = ParserService.detect_language(file_path)
            parser = ParserService._parser_for(extension)
            tree = parser.parse(source_bytes)
        except (UnsupportedLanguageError, Exception) as err:
            logger.warning("Falling back to line-based chunking for %s: %s", file_path, err)
            source_text = source_bytes.decode("utf-8", errors="replace")
            return self._split_text_by_lines(source_text, max_chars, start_line=1, start_byte=0)

        if tree is None or tree.root_node.has_error:
            logger.warning("Syntax errors found or tree is None for %s. Falling back to line-based chunking.", file_path)
            source_text = source_bytes.decode("utf-8", errors="replace")
            return self._split_text_by_lines(source_text, max_chars, start_line=1, start_byte=0)

        # Parse AST and get raw chunks
        raw_chunks = self._partition(tree.root_node, source_bytes, language, max_chars)

        # Merge contiguous chunks up to max_chars
        return self._merge_chunks(raw_chunks, source_bytes, max_chars)

    # ------------------------------------------------------------------
    # Markdown chunking
    # ------------------------------------------------------------------

    @staticmethod
    def _chunk_markdown(source_text: str) -> list[CodeChunk]:
        """Split a Markdown document into heading-based documentation chunks.

        Each ATX heading (``#`` … ``######``) starts a new chunk that spans
        from the heading line to the line before the next same-or-higher-level
        heading (or the end of the file).  Files with no headings are returned
        as a single file-level chunk.  Empty files return an empty list.
        """
        if not source_text.strip():
            return []

        lines = source_text.splitlines(keepends=True)
        total_lines = len(lines)

        # Locate every heading: (line_index_0based, heading_text)
        heading_positions: list[tuple[int, str]] = []
        for match in _HEADING_RE.finditer(source_text):
            # Count newlines before the match to get the 0-based line index
            line_idx = source_text[: match.start()].count("\n")
            heading_text = match.group(2).strip()
            heading_positions.append((line_idx, heading_text))

        # No headings → single file-level chunk
        if not heading_positions:
            content = source_text
            byte_content = content.encode("utf-8", errors="replace")
            return [
                CodeChunk(
                    content=content,
                    start_line=1,
                    end_line=total_lines,
                    start_byte=0,
                    end_byte=len(byte_content),
                    name=None,
                    entity_type="documentation",
                )
            ]

        chunks: list[CodeChunk] = []

        # Build (start_line_0, end_line_0_inclusive, heading_text) spans
        spans: list[tuple[int, int, str]] = []
        for i, (line_idx, heading_text) in enumerate(heading_positions):
            if i + 1 < len(heading_positions):
                end_idx = heading_positions[i + 1][0] - 1
            else:
                end_idx = total_lines - 1
            spans.append((line_idx, end_idx, heading_text))

        # Accumulate byte offset as we walk lines
        byte_cursor = 0
        line_byte_starts: list[int] = []
        for line in lines:
            line_byte_starts.append(byte_cursor)
            byte_cursor += len(line.encode("utf-8", errors="replace"))
        # Sentinel for end-of-file byte
        line_byte_starts.append(byte_cursor)

        for start_idx, end_idx, heading_text in spans:
            chunk_lines = lines[start_idx : end_idx + 1]
            content = "".join(chunk_lines)
            start_byte = line_byte_starts[start_idx]
            end_byte = line_byte_starts[end_idx + 1]
            chunks.append(
                CodeChunk(
                    content=content,
                    start_line=start_idx + 1,       # 1-based
                    end_line=end_idx + 1,            # 1-based
                    start_byte=start_byte,
                    end_byte=end_byte,
                    name=heading_text,
                    entity_type="documentation",
                )
            )

        return chunks

    def _partition(self, node: Node, source_bytes: bytes, language: str, max_chars: int) -> list[CodeChunk]:
        """Recursively partition AST nodes into chunks."""
        node_len = node.end_byte - node.start_byte
        node_text = source_bytes[node.start_byte : node.end_byte].decode("utf-8", errors="replace")

        # If the node itself fits in max_chars, keep it as a single chunk
        if node_len <= max_chars:
            name = self._get_node_name(node, source_bytes) if self._is_semantic_node(node, language) else None
            entity_type = node.type if self._is_semantic_node(node, language) else None
            return [
                CodeChunk(
                    content=node_text,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    start_byte=node.start_byte,
                    end_byte=node.end_byte,
                    name=name,
                    entity_type=entity_type,
                )
            ]

        # Node exceeds max_chars. Find outermost semantic children
        semantic_children = self._find_semantic_children(node, language)

        if not semantic_children:
            # No semantic children to split by. Split this node's text by lines.
            start_line = node.start_point[0] + 1
            return self._split_text_by_lines(node_text, max_chars, start_line, node.start_byte)

        chunks: list[CodeChunk] = []
        current_byte = node.start_byte

        for child in semantic_children:
            # 1. Process gap before child
            if child.start_byte > current_byte:
                gap_bytes = source_bytes[current_byte : child.start_byte]
                gap_text = gap_bytes.decode("utf-8", errors="replace")
                if gap_text.strip():
                    gap_start_line = self._get_line_for_byte(source_bytes, current_byte)
                    chunks.extend(
                        self._split_text_by_lines(gap_text, max_chars, gap_start_line, current_byte)
                    )

            # 2. Process child recursively
            chunks.extend(self._partition(child, source_bytes, language, max_chars))

            # Update current cursor
            current_byte = child.end_byte

        # 3. Process trailing gap after last child
        if node.end_byte > current_byte:
            trailing_bytes = source_bytes[current_byte : node.end_byte]
            trailing_text = trailing_bytes.decode("utf-8", errors="replace")
            if trailing_text.strip():
                trailing_start_line = self._get_line_for_byte(source_bytes, current_byte)
                chunks.extend(
                    self._split_text_by_lines(trailing_text, max_chars, trailing_start_line, current_byte)
                )

        return chunks

    def _split_text_by_lines(self, text: str, max_chars: int, start_line: int, start_byte: int) -> list[CodeChunk]:
        """Split a text block by lines such that each chunk is <= max_chars."""
        chunks = []
        lines = text.splitlines(keepends=True)
        current_chunk_lines = []
        current_chunk_len = 0
        chunk_start_line = start_line
        chunk_start_byte = start_byte

        for line in lines:
            line_len = len(line)
            if current_chunk_len + line_len > max_chars:
                if current_chunk_lines:
                    content = "".join(current_chunk_lines)
                    chunks.append(
                        CodeChunk(
                            content=content,
                            start_line=chunk_start_line,
                            end_line=chunk_start_line + len(current_chunk_lines) - 1,
                            start_byte=chunk_start_byte,
                            end_byte=chunk_start_byte + len(content),
                        )
                    )
                    chunk_start_byte += len(content)
                    chunk_start_line += len(current_chunk_lines)
                    current_chunk_lines = []
                    current_chunk_len = 0

                if line_len > max_chars:
                    # Single line is too large, split by characters
                    for j in range(0, line_len, max_chars):
                        sub_line = line[j : j + max_chars]
                        chunks.append(
                            CodeChunk(
                                content=sub_line,
                                start_line=chunk_start_line,
                                end_line=chunk_start_line,
                                start_byte=chunk_start_byte,
                                end_byte=chunk_start_byte + len(sub_line),
                            )
                        )
                        chunk_start_byte += len(sub_line)
                    chunk_start_line += 1
                else:
                    current_chunk_lines.append(line)
                    current_chunk_len = line_len
            else:
                current_chunk_lines.append(line)
                current_chunk_len += line_len

        if current_chunk_lines:
            content = "".join(current_chunk_lines)
            chunks.append(
                CodeChunk(
                    content=content,
                    start_line=chunk_start_line,
                    end_line=chunk_start_line + len(current_chunk_lines) - 1,
                    start_byte=chunk_start_byte,
                    end_byte=chunk_start_byte + len(content),
                )
            )

        return chunks

    def _merge_chunks(self, chunks: list[CodeChunk], source_bytes: bytes, max_chars: int) -> list[CodeChunk]:
        """Greedily merge contiguous chunks as long as they stay under max_chars."""
        if not chunks:
            return []

        merged = []
        current = chunks[0]

        for next_chunk in chunks[1:]:
            # Retrieve the gap text between current and next_chunk to preserve spaces/newlines
            gap = source_bytes[current.end_byte : next_chunk.start_byte].decode("utf-8", errors="replace")
            combined_len = len(current.content) + len(gap) + len(next_chunk.content)

            if combined_len <= max_chars:
                merged_content = current.content + gap + next_chunk.content
                name = current.name or next_chunk.name
                entity_type = current.entity_type or next_chunk.entity_type
                current = CodeChunk(
                    content=merged_content,
                    start_line=current.start_line,
                    end_line=next_chunk.end_line,
                    start_byte=current.start_byte,
                    end_byte=next_chunk.end_byte,
                    name=name,
                    entity_type=entity_type,
                )
            else:
                merged.append(current)
                current = next_chunk

        merged.append(current)
        return merged

    @staticmethod
    def _is_semantic_node(node: Node, language: str) -> bool:
        """Check if a node type represents a class, function, or method."""
        nt = node.type
        if language == "Python":
            return nt in {"class_definition", "function_definition"}
        elif language in {"JavaScript", "TypeScript"}:
            return nt in {
                "class_declaration",
                "class",
                "function_declaration",
                "function",
                "method_definition",
                "generator_function_declaration",
                "arrow_function",
            }
        return False

    @staticmethod
    def _get_node_name(node: Node, source: bytes) -> str | None:
        """Extract name of class or function node."""
        name_node = node.child_by_field_name("name")
        if name_node is None:
            name_node = next(
                (
                    child
                    for child in node.named_children
                    if child.type in {"identifier", "property_identifier", "type_identifier"}
                ),
                None,
            )
        if name_node is not None:
            return source[name_node.start_byte : name_node.end_byte].decode("utf-8", errors="replace")
        return None

    def _find_semantic_children(self, node: Node, language: str) -> list[Node]:
        """Find the outermost semantic descendants under the given node."""
        semantic_children = []

        def visit(n: Node):
            if n == node:
                for child in n.named_children:
                    visit(child)
                return
            if self._is_semantic_node(n, language):
                semantic_children.append(n)
                return
            for child in n.named_children:
                visit(child)

        visit(node)
        semantic_children.sort(key=lambda c: c.start_byte)
        return semantic_children

    @staticmethod
    def _get_line_for_byte(source_bytes: bytes, byte_offset: int) -> int:
        """Return the 1-based line number for a byte offset."""
        return source_bytes[:byte_offset].count(b"\n") + 1
