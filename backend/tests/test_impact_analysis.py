"""Unit and API tests for Step 6.2.4: Change Impact Analysis RAG Pipeline."""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.main import app
from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.file import File
from app.models.relationship import FileRelationship
from app.schemas.llm import LLMGenerateResponse
from app.schemas.rag import (
    AffectedEntity,
    ImpactAnalysisRequest,
    ImpactAnalysisResponse,
    RAGChunkResult,
    RAGRetrievalResponse,
)
from app.services.impact_analysis_service import ImpactAnalysisRAGService
from app.services.llm_service import LLMService
from app.services.rag_retrieval_service import RAGRetrievalService


class TestImpactAnalysisSchemas(unittest.TestCase):
    """Test suite for Impact Analysis Pydantic schemas and validations."""

    def test_01_valid_entity_request(self):
        """1. Test valid request with entity_name."""
        req = ImpactAnalysisRequest(entity_name="authenticate_user", project_id=93)
        self.assertEqual(req.entity_name, "authenticate_user")
        self.assertIsNone(req.file_path)
        self.assertEqual(req.depth, 1)
        self.assertEqual(req.top_k, 5)
        self.assertEqual(req.similarity_threshold, 0.0)
        self.assertTrue(req.include_calls)
        self.assertTrue(req.include_imports)

    def test_02_valid_file_request(self):
        """2. Test valid request with file_path."""
        req = ImpactAnalysisRequest(file_path="backend/app/auth.py")
        self.assertEqual(req.file_path, "backend/app/auth.py")
        self.assertIsNone(req.entity_name)
        self.assertEqual(req.depth, 1)

    def test_03_missing_entity_name_and_file_path_fails(self):
        """3. Test that missing both entity_name and file_path raises ValidationError."""
        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest()

    def test_04_empty_entity_name_rejection(self):
        """4. Test that empty string entity_name raises ValidationError."""
        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest(entity_name="")

    def test_05_whitespace_entity_name_rejection(self):
        """5. Test that whitespace-only entity_name raises ValidationError."""
        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest(entity_name="   \t\n  ")

    def test_06_depth_1_valid(self):
        """6. Test depth=1 is valid."""
        req = ImpactAnalysisRequest(entity_name="test_func", depth=1)
        self.assertEqual(req.depth, 1)

    def test_07_depth_3_valid(self):
        """7. Test depth=3 is valid."""
        req = ImpactAnalysisRequest(entity_name="test_func", depth=3)
        self.assertEqual(req.depth, 3)

    def test_08_depth_0_invalid(self):
        """8. Test depth=0 is invalid."""
        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest(entity_name="test_func", depth=0)

    def test_09_depth_4_invalid(self):
        """9. Test depth=4 is invalid."""
        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest(entity_name="test_func", depth=4)

    def test_10_top_k_boundaries(self):
        """10. Test top_k boundary limits (1..20)."""
        req_min = ImpactAnalysisRequest(entity_name="test", top_k=1)
        self.assertEqual(req_min.top_k, 1)
        req_max = ImpactAnalysisRequest(entity_name="test", top_k=20)
        self.assertEqual(req_max.top_k, 20)

        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest(entity_name="test", top_k=0)

        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest(entity_name="test", top_k=21)

    def test_11_similarity_threshold_boundaries(self):
        """11. Test similarity_threshold boundary limits (0.0..1.0)."""
        req_low = ImpactAnalysisRequest(entity_name="test", similarity_threshold=0.0)
        self.assertEqual(req_low.similarity_threshold, 0.0)
        req_high = ImpactAnalysisRequest(entity_name="test", similarity_threshold=1.0)
        self.assertEqual(req_high.similarity_threshold, 1.0)

        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest(entity_name="test", similarity_threshold=-0.1)

        with self.assertRaises(ValidationError):
            ImpactAnalysisRequest(entity_name="test", similarity_threshold=1.1)


class TestImpactAnalysisService(unittest.TestCase):
    """Test suite for ImpactAnalysisRAGService reverse dependency traversal and business logic."""

    def setUp(self):
        self.mock_retrieval_service = MagicMock(spec=RAGRetrievalService)
        self.mock_llm_service = MagicMock(spec=LLMService)

        self.service = ImpactAnalysisRAGService(
            rag_retrieval_service=self.mock_retrieval_service,
            llm_service=self.mock_llm_service,
        )

        self.sample_chunk = RAGChunkResult(
            score=0.88,
            file_path="backend/app/auth.py",
            start_line=10,
            end_line=30,
            language="Python",
            entity_type="function",
            name="authenticate_user",
            project_id=93,
            content="def authenticate_user(): pass",
        )

        self.sample_retrieval_response = RAGRetrievalResponse(
            query="Change impact analysis for entity authenticate_user",
            project_id=93,
            total_results=1,
            results=[self.sample_chunk],
            context="RELEVANT CODE:\ndef authenticate_user(): pass",
        )

        self.sample_llm_response = LLMGenerateResponse(
            response="Modifying authenticate_user affects the login route and security module.",
            model="qwen2.5-coder:7b",
        )

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_12_target_resolution(self, mock_session_cls):
        """12. Test target resolution for entity_name and file_path in PostgreSQL."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        target_file = File(id=1, project_id=93, path="backend/app/auth.py", size=100)
        target_entity = CodeEntity(
            id=10, file_id=1, name="authenticate_user", entity_type="function", start_line=10, end_line=30
        )

        # scalars().all() returns target entity
        mock_session.scalars.return_value.all.side_effect = [
            [target_entity],  # Target entity lookup
            [],               # Caller relationships
            [],               # Importer relationships
        ]

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(
            entity_name="authenticate_user",
            file_path="backend/app/auth.py",
            project_id=93,
        )

        self.assertEqual(res.entity_name, "authenticate_user")
        self.assertEqual(res.file_path, "backend/app/auth.py")
        self.assertEqual(res.project_id, 93)

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_13_direct_reverse_calls_dependency(self, mock_session_cls):
        """13. Test direct reverse CALLS dependency (depth=1)."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        target_file = File(id=1, project_id=93, path="backend/app/auth.py", size=100)
        target_entity = CodeEntity(id=10, file_id=1, name="authenticate_user", entity_type="function", start_line=10, end_line=30)

        caller_file = File(id=2, project_id=93, path="backend/app/api.py", size=200)
        caller_entity = CodeEntity(id=20, file_id=2, name="login_handler", entity_type="function", start_line=50, end_line=80)

        rel = EntityRelationship(id=100, source_entity_id=20, target_entity_id=10, relationship_type="CALLS")

        # Session mocks
        mock_session.scalars.return_value.all.side_effect = [
            [target_entity],  # Target entity query
            [rel],            # Reverse CALLS query
            [],               # Reverse IMPORTS query
        ]

        def mock_get(model, pk):
            if model == CodeEntity and pk == 20:
                return caller_entity
            if model == File and pk == 2:
                return caller_file
            return None

        mock_session.get.side_effect = mock_get

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(entity_name="authenticate_user", depth=1)

        self.assertEqual(len(res.affected_entities), 1)
        affected = res.affected_entities[0]
        self.assertEqual(affected.entity_name, "login_handler")
        self.assertEqual(affected.entity_type, "function")
        self.assertEqual(affected.file_path, "backend/app/api.py")
        self.assertEqual(affected.relationship, "CALLS target")
        self.assertEqual(affected.depth, 1)

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_14_reverse_imports_dependency(self, mock_session_cls):
        """14. Test reverse IMPORTS dependency (depth=1)."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        target_file = File(id=1, project_id=93, path="backend/app/config.py", size=100)
        importer_file = File(id=2, project_id=93, path="backend/app/main.py", size=200)

        rel = FileRelationship(id=100, source_file_id=2, target_file_id=1, relationship_type="IMPORTS")

        mock_session.scalars.return_value.all.side_effect = [
            [target_file],   # Target file query
            [rel],           # Reverse IMPORTS query
        ]

        def mock_get(model, pk):
            if model == File and pk == 2:
                return importer_file
            return None

        mock_session.get.side_effect = mock_get

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(file_path="backend/app/config.py", depth=1)

        self.assertEqual(len(res.affected_entities), 1)
        affected = res.affected_entities[0]
        self.assertIsNone(affected.entity_name)
        self.assertEqual(affected.entity_type, "file")
        self.assertEqual(affected.file_path, "backend/app/main.py")
        self.assertEqual(affected.relationship, "IMPORTS target file")
        self.assertEqual(affected.depth, 1)

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_15_depth_2_traversal(self, mock_session_cls):
        """15. Test multi-hop traversal at depth=2 (A calls B, B calls C)."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        file1 = File(id=1, project_id=93, path="f1.py", size=10)
        file2 = File(id=2, project_id=93, path="f2.py", size=10)
        file3 = File(id=3, project_id=93, path="f3.py", size=10)

        c_target = CodeEntity(id=10, file_id=1, name="C", entity_type="function", start_line=1, end_line=5)
        b_caller = CodeEntity(id=20, file_id=2, name="B", entity_type="function", start_line=1, end_line=5)
        a_caller = CodeEntity(id=30, file_id=3, name="A", entity_type="function", start_line=1, end_line=5)

        rel_b_calls_c = EntityRelationship(id=1, source_entity_id=20, target_entity_id=10, relationship_type="CALLS")
        rel_a_calls_b = EntityRelationship(id=2, source_entity_id=30, target_entity_id=20, relationship_type="CALLS")

        mock_session.scalars.return_value.all.side_effect = [
            [c_target],       # Target entity C
            [rel_b_calls_c],  # Depth 1: B calls C
            [],               # Depth 1 imports
            [rel_a_calls_b],  # Depth 2: A calls B
            [],               # Depth 2 imports
        ]

        def mock_get(model, pk):
            mapping = {
                (CodeEntity, 20): b_caller,
                (File, 2): file2,
                (CodeEntity, 30): a_caller,
                (File, 3): file3,
            }
            return mapping.get((model, pk))

        mock_session.get.side_effect = mock_get

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(entity_name="C", depth=2)

        self.assertEqual(len(res.affected_entities), 2)
        self.assertEqual(res.affected_entities[0].entity_name, "B")
        self.assertEqual(res.affected_entities[0].depth, 1)
        self.assertEqual(res.affected_entities[0].relationship, "CALLS target")

        self.assertEqual(res.affected_entities[1].entity_name, "A")
        self.assertEqual(res.affected_entities[1].depth, 2)
        self.assertEqual(res.affected_entities[1].relationship, "CALLS affected entity")

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_16_depth_3_traversal(self, mock_session_cls):
        """16. Test multi-hop traversal at depth=3."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        file1 = File(id=1, project_id=93, path="f1.py", size=10)
        file2 = File(id=2, project_id=93, path="f2.py", size=10)
        file3 = File(id=3, project_id=93, path="f3.py", size=10)
        file4 = File(id=4, project_id=93, path="f4.py", size=10)

        e_target = CodeEntity(id=10, file_id=1, name="Target", entity_type="function", start_line=1, end_line=5)
        e_hop1 = CodeEntity(id=20, file_id=2, name="Hop1", entity_type="function", start_line=1, end_line=5)
        e_hop2 = CodeEntity(id=30, file_id=3, name="Hop2", entity_type="function", start_line=1, end_line=5)
        e_hop3 = CodeEntity(id=40, file_id=4, name="Hop3", entity_type="function", start_line=1, end_line=5)

        r1 = EntityRelationship(id=1, source_entity_id=20, target_entity_id=10, relationship_type="CALLS")
        r2 = EntityRelationship(id=2, source_entity_id=30, target_entity_id=20, relationship_type="CALLS")
        r3 = EntityRelationship(id=3, source_entity_id=40, target_entity_id=30, relationship_type="CALLS")

        mock_session.scalars.return_value.all.side_effect = [
            [e_target],  # Target
            [r1], [],    # Depth 1 calls/imports
            [r2], [],    # Depth 2 calls/imports
            [r3], [],    # Depth 3 calls/imports
        ]

        def mock_get(model, pk):
            mapping = {
                (CodeEntity, 20): e_hop1, (File, 2): file2,
                (CodeEntity, 30): e_hop2, (File, 3): file3,
                (CodeEntity, 40): e_hop3, (File, 4): file4,
            }
            return mapping.get((model, pk))

        mock_session.get.side_effect = mock_get

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(entity_name="Target", depth=3)

        self.assertEqual(len(res.affected_entities), 3)
        self.assertEqual(res.affected_entities[0].entity_name, "Hop1")
        self.assertEqual(res.affected_entities[1].entity_name, "Hop2")
        self.assertEqual(res.affected_entities[2].entity_name, "Hop3")
        self.assertEqual(res.affected_entities[2].depth, 3)

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_17_duplicate_prevention(self, mock_session_cls):
        """17. Test that duplicate entity links are prevented."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        file1 = File(id=1, project_id=93, path="f1.py", size=10)
        target = CodeEntity(id=10, file_id=1, name="Target", entity_type="function", start_line=1, end_line=5)

        caller_file = File(id=2, project_id=93, path="f2.py", size=10)
        caller = CodeEntity(id=20, file_id=2, name="Caller", entity_type="function", start_line=1, end_line=5)

        # Duplicate relationship records in DB
        rel1 = EntityRelationship(id=1, source_entity_id=20, target_entity_id=10, relationship_type="CALLS")
        rel2 = EntityRelationship(id=2, source_entity_id=20, target_entity_id=10, relationship_type="CALLS")

        mock_session.scalars.return_value.all.side_effect = [
            [target],
            [rel1, rel2],
            [],
        ]

        def mock_get(model, pk):
            if model == CodeEntity and pk == 20: return caller
            if model == File and pk == 2: return caller_file
            return None

        mock_session.get.side_effect = mock_get

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(entity_name="Target", depth=1)

        self.assertEqual(len(res.affected_entities), 1)

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_18_cycle_prevention(self, mock_session_cls):
        """18. Test infinite loop / cycle prevention (A calls B, B calls A)."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        f1 = File(id=1, project_id=93, path="f1.py", size=10)
        f2 = File(id=2, project_id=93, path="f2.py", size=10)

        a_entity = CodeEntity(id=10, file_id=1, name="A", entity_type="function", start_line=1, end_line=5)
        b_entity = CodeEntity(id=20, file_id=2, name="B", entity_type="function", start_line=1, end_line=5)

        rel_b_calls_a = EntityRelationship(id=1, source_entity_id=20, target_entity_id=10, relationship_type="CALLS")
        rel_a_calls_b = EntityRelationship(id=2, source_entity_id=10, target_entity_id=20, relationship_type="CALLS")

        mock_session.scalars.return_value.all.side_effect = [
            [a_entity],        # Target A
            [rel_b_calls_a],   # Depth 1: B calls A
            [],                # Depth 1 imports
            [rel_a_calls_b],   # Depth 2: A calls B (A is already visited!)
            [],                # Depth 2 imports
        ]

        def mock_get(model, pk):
            mapping = {(CodeEntity, 20): b_entity, (File, 2): f2, (CodeEntity, 10): a_entity, (File, 1): f1}
            return mapping.get((model, pk))

        mock_session.get.side_effect = mock_get

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(entity_name="A", depth=3)

        # Only B should be recorded, A is ignored on depth 2 because it was visited at start
        self.assertEqual(len(res.affected_entities), 1)
        self.assertEqual(res.affected_entities[0].entity_name, "B")

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_19_include_calls_false(self, mock_session_cls):
        """19. Test include_calls=False skips CALLS dependency traversal."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        target_file = File(id=1, project_id=93, path="backend/app/auth.py", size=100)
        importer_file = File(id=2, project_id=93, path="backend/app/main.py", size=200)

        rel_import = FileRelationship(id=100, source_file_id=2, target_file_id=1, relationship_type="IMPORTS")

        mock_session.scalars.return_value.all.side_effect = [
            [target_file],   # Target file query
            [rel_import],    # Reverse IMPORTS query (CALLS is skipped)
        ]

        def mock_get(model, pk):
            if model == File and pk == 2: return importer_file
            return None

        mock_session.get.side_effect = mock_get

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(file_path="backend/app/auth.py", include_calls=False, include_imports=True)

        self.assertEqual(len(res.affected_entities), 1)
        self.assertEqual(res.affected_entities[0].relationship, "IMPORTS target file")

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_20_include_imports_false(self, mock_session_cls):
        """20. Test include_imports=False skips IMPORTS dependency traversal."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        target_file = File(id=1, project_id=93, path="backend/app/auth.py", size=100)
        target_entity = CodeEntity(id=10, file_id=1, name="authenticate_user", entity_type="function", start_line=10, end_line=30)

        caller_file = File(id=2, project_id=93, path="backend/app/api.py", size=200)
        caller_entity = CodeEntity(id=20, file_id=2, name="login_handler", entity_type="function", start_line=50, end_line=80)

        rel_call = EntityRelationship(id=100, source_entity_id=20, target_entity_id=10, relationship_type="CALLS")

        mock_session.scalars.return_value.all.side_effect = [
            [target_entity],  # Target entity query
            [rel_call],       # Reverse CALLS query (IMPORTS is skipped)
        ]

        def mock_get(model, pk):
            if model == CodeEntity and pk == 20: return caller_entity
            if model == File and pk == 2: return caller_file
            return None

        mock_session.get.side_effect = mock_get

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(entity_name="authenticate_user", include_calls=True, include_imports=False)

        self.assertEqual(len(res.affected_entities), 1)
        self.assertEqual(res.affected_entities[0].relationship, "CALLS target")

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_21_no_affected_entities(self, mock_session_cls):
        """21. Test handling when no reverse dependencies are found in DB."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session

        mock_session.scalars.return_value.all.side_effect = [
            [],  # Target not found
        ]

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(entity_name="isolated_function")

        self.assertEqual(len(res.affected_entities), 0)
        self.assertEqual(res.total_affected, 0)
        self.assertIn("No reverse dependencies were found", res.context)

    def test_22_retrieval_failure_propagates_error(self):
        """22. Test RAGRetrievalService failure raises RuntimeError."""
        self.mock_retrieval_service.retrieve.side_effect = RuntimeError("Qdrant database error")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.analyze_impact(entity_name="test_func")

        self.assertIn("Qdrant database error", str(ctx.exception))

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_23_database_failure_propagates_error(self, mock_session_cls):
        """23. Test PostgreSQL SQLAlchemyError raises RuntimeError."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.side_effect = SQLAlchemyError("PostgreSQL connection lost")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.analyze_impact(entity_name="test_func")

        self.assertIn("Database error during impact analysis", str(ctx.exception))

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_24_llm_failure_propagates_error(self, mock_session_cls):
        """24. Test LLMService failure raises RuntimeError."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session
        mock_session.scalars.return_value.all.return_value = []

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.side_effect = RuntimeError("Ollama LLM connection timeout")

        with self.assertRaises(RuntimeError) as ctx:
            self.service.analyze_impact(entity_name="test_func")

        self.assertIn("Ollama LLM connection timeout", str(ctx.exception))

    @patch("app.services.impact_analysis_service.SessionLocal")
    def test_25_successful_end_to_end_service_flow(self, mock_session_cls):
        """25. Test full successful service execution."""
        mock_session = MagicMock()
        mock_session_cls.return_value.__enter__.return_value = mock_session
        mock_session.scalars.return_value.all.return_value = []

        self.mock_retrieval_service.retrieve.return_value = self.sample_retrieval_response
        self.mock_llm_service.generate.return_value = self.sample_llm_response

        res = self.service.analyze_impact(
            entity_name="authenticate_user",
            file_path="backend/app/auth.py",
            project_id=93,
            depth=2,
            top_k=5,
        )

        self.assertEqual(res.entity_name, "authenticate_user")
        self.assertEqual(res.file_path, "backend/app/auth.py")
        self.assertEqual(res.project_id, 93)
        self.assertEqual(res.depth, 2)
        self.assertEqual(res.analysis, self.sample_llm_response.response)
        self.assertEqual(res.model, "qwen2.5-coder:7b")
        self.assertEqual(res.total_chunks, 1)


class TestImpactAnalysisAPI(unittest.TestCase):
    """Integration test suite for POST /api/v1/rag/impact endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    @patch("app.api.v1.endpoints.rag.ImpactAnalysisRAGService")
    def test_26_successful_http_200(self, mock_service_cls):
        """26. Test successful POST /api/v1/rag/impact request (HTTP 200)."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service

        affected = AffectedEntity(
            entity_name="login_handler",
            entity_type="function",
            file_path="backend/app/api.py",
            relationship="CALLS target",
            depth=1,
        )

        chunk = RAGChunkResult(
            score=0.9,
            file_path="backend/app/auth.py",
            start_line=1,
            end_line=20,
            language="Python",
            entity_type="function",
            name="authenticate_user",
            project_id=93,
            content="def authenticate_user(): pass",
        )

        mock_service.analyze_impact.return_value = ImpactAnalysisResponse(
            entity_name="authenticate_user",
            file_path="backend/app/auth.py",
            query="Change impact analysis for entity authenticate_user in file backend/app/auth.py",
            project_id=93,
            analysis="Modifying authenticate_user affects login_handler.",
            model="qwen2.5-coder:7b",
            affected_entities=[affected],
            total_affected=1,
            depth=1,
            total_chunks=1,
            sources=[chunk],
            context="FULL CONTEXT PROMPT",
        )

        response = self.client.post(
            "/api/v1/rag/impact",
            json={
                "entity_name": "authenticate_user",
                "file_path": "backend/app/auth.py",
                "project_id": 93,
                "depth": 1,
            },
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["entity_name"], "authenticate_user")
        self.assertEqual(data["file_path"], "backend/app/auth.py")
        self.assertEqual(data["project_id"], 93)
        self.assertEqual(data["total_affected"], 1)
        self.assertEqual(len(data["affected_entities"]), 1)
        self.assertEqual(data["affected_entities"][0]["entity_name"], "login_handler")

    def test_27_missing_target_http_422(self):
        """27. Test missing target parameters returns HTTP 422 validation failure."""
        response = self.client.post("/api/v1/rag/impact", json={})
        self.assertEqual(response.status_code, 422)

    def test_28_invalid_depth_http_422(self):
        """28. Test invalid depth (depth=5) returns HTTP 422 validation failure."""
        response = self.client.post(
            "/api/v1/rag/impact",
            json={"entity_name": "authenticate_user", "depth": 5},
        )
        self.assertEqual(response.status_code, 422)

    @patch("app.api.v1.endpoints.rag.ImpactAnalysisRAGService")
    def test_29_service_failure_http_500(self, mock_service_cls):
        """29. Test internal service error returns HTTP 500 status code."""
        mock_service = MagicMock()
        mock_service_cls.return_value = mock_service
        mock_service.analyze_impact.side_effect = RuntimeError("Ollama LLM service unreachable")

        response = self.client.post(
            "/api/v1/rag/impact",
            json={"entity_name": "authenticate_user"},
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn("Impact analysis service error", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
