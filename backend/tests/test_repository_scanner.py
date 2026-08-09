"""Integration coverage for PostgreSQL-backed repository inventory scanning."""

import asyncio
import io
import os
import tempfile
import unittest
import zipfile
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

from app.database.postgres import SessionLocal, initialize_postgres
from app.database.neo4j import get_driver
from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.file import File
from app.models.metadata import Metadata
from app.models.project import Project
from app.models.relationship import FileRelationship
from app.services.repository_scanner import RepositoryScanner
from app.services.upload_service import UploadService
from fastapi import UploadFile


@unittest.skipUnless(
    os.getenv("RUN_INTEGRATION_TESTS") == "1",
    "requires a running PostgreSQL database (set RUN_INTEGRATION_TESTS=1)",
)
class RepositoryScannerIntegrationTests(unittest.TestCase):
    """Validate project, file, metadata, and import relationship persistence."""

    def setUp(self) -> None:
        initialize_postgres()
        self.temp_directory = tempfile.TemporaryDirectory()
        self.repository_root = Path(self.temp_directory.name)
        (self.repository_root / "src").mkdir()
        (self.repository_root / "node_modules").mkdir()
        (self.repository_root / "src" / "index.js").write_text(
            "import { helper } from './helper';\n"
            "export function run() { return helper(); }\n", encoding="utf-8"
        )
        (self.repository_root / "src" / "helper.js").write_text(
            "export class Helper { execute() { return helper(); } save() { return 1; } }\n"
            "export class Query { find() { return this; } populate() { return this; } exec() { return 1; } }\n"
            "export function helper() { return internal(); }\n"
            "export function update(user) { return user.save(); }\n"
            "export function load(user) { return user.find().populate().exec(); }\n"
            "export async function asyncUpdate(user) { await user.save(); return await helper(); }\n"
            "const internal = () => 1;\n",
            encoding="utf-8",
        )
        (self.repository_root / "python_helper.py").write_text(
            "def helper():\n    return 1\n", encoding="utf-8"
        )
        (self.repository_root / "main.py").write_text(
            "from python_helper import helper as imported_helper\n"
            "def main():\n    return imported_helper()\n",
            encoding="utf-8",
        )
        (self.repository_root / "node_modules" / "ignored.js").write_text(
            "throw new Error('should not be scanned');\n", encoding="utf-8"
        )
        with SessionLocal() as session:
            project = Project(
                name=f"scanner-test-{uuid4()}",
                local_path=str(self.repository_root),
            )
            session.add(project)
            session.flush()
            self.project_id = project.id
            session.commit()

    def tearDown(self) -> None:
        with SessionLocal() as session:
            project = session.get(Project, self.project_id)
            if project is not None:
                session.delete(project)
                session.commit()
        self.temp_directory.cleanup()

    def test_scan_persists_files_metadata_and_import_relationships(self) -> None:
        result = RepositoryScanner().scan_project(self.project_id)

        self.assertEqual(result.total_files, 4)
        self.assertEqual(result.supported_files, 4)
        self.assertEqual(result.ignored_files, 0)

        with SessionLocal() as session:
            files = session.scalars(
                select(File).where(File.project_id == self.project_id).order_by(File.path)
            ).all()
            metadata = {
                entry.key: entry.value
                for entry in session.scalars(
                    select(Metadata).where(Metadata.project_id == self.project_id)
                )
            }
            relationships = session.scalars(
                select(FileRelationship)
                .join(File, FileRelationship.source_file_id == File.id)
                .where(File.project_id == self.project_id)
            ).all()
            entities = session.scalars(
                select(CodeEntity)
                .join(File, CodeEntity.file_id == File.id)
                .where(File.project_id == self.project_id)
            ).all()
            entity_relationships = session.scalars(
                select(EntityRelationship)
                .join(
                    CodeEntity,
                    EntityRelationship.source_entity_id == CodeEntity.id,
                )
                .join(File, CodeEntity.file_id == File.id)
                .where(File.project_id == self.project_id)
            ).all()

        self.assertEqual(
            [(file.path, file.language) for file in files],
            [
                ("main.py", "Python"),
                ("python_helper.py", "Python"),
                ("src/helper.js", "JavaScript"),
                ("src/index.js", "JavaScript"),
            ],
        )
        self.assertTrue(all(file.project_id == self.project_id for file in files))
        self.assertEqual(metadata["total_files"], "4")
        self.assertEqual(metadata["supported_files"], "4")
        self.assertIn("scanned_at", metadata)
        self.assertEqual(len(relationships), 2)
        self.assertTrue(
            all(relationship.relationship_type == "IMPORTS" for relationship in relationships)
        )
        self.assertTrue({"function", "class", "variable", "export"}.issubset(
            {entity.entity_type for entity in entities}
        ))
        self.assertEqual(len(entity_relationships), 12)
        self.assertTrue(
            all(relationship.relationship_type == "CALLS" for relationship in entity_relationships)
        )
        entity_by_id = {entity.id: entity for entity in entities}
        self.assertEqual(
            {
                (
                    entity_by_id[relationship.source_entity_id].name,
                    entity_by_id[relationship.target_entity_id].name,
                )
                for relationship in entity_relationships
            },
            {
                ("run", "helper"),
                ("execute", "helper"),
                ("helper", "internal"),
                ("update", "save"),
                ("load", "find"),
                ("load", "populate"),
                ("load", "exec"),
                ("find", "populate"),
                ("populate", "exec"),
                ("asyncUpdate", "save"),
                ("asyncUpdate", "helper"),
                ("main", "helper"),
            },
        )

    def test_zip_upload_runs_the_complete_persisted_scan_pipeline(self) -> None:
        archive_bytes = io.BytesIO()
        with zipfile.ZipFile(archive_bytes, "w") as archive:
            archive.writestr("demo/main.py", "print('imported')\n")
            archive.writestr("demo/src/component.ts", "export const ready = true;\n")
        archive_bytes.seek(0)

        service = UploadService(
            upload_root=self.repository_root / "upload-staging",
            repository_root=self.repository_root / "imported-repositories",
        )
        uploaded = asyncio.run(
            service.upload_project(UploadFile(filename="demo.zip", file=archive_bytes))
        )
        try:
            self.assertEqual(uploaded.scan.total_files, 2)
            self.assertEqual(uploaded.scan.supported_files, 2)
            with SessionLocal() as session:
                files = session.scalars(
                    select(File)
                    .where(File.project_id == uploaded.project_id)
                    .order_by(File.path)
                ).all()
            self.assertEqual([file.path for file in files], ["main.py", "src/component.ts"])
        finally:
            if os.getenv("SYNC_NEO4J_GRAPH", "false").lower() in {"1", "true", "yes"}:
                with get_driver().session() as session:
                    session.run(
                        "MATCH (project:Project {project_id: $project_id}) "
                        "OPTIONAL MATCH (project)-[:CONTAINS]->(file:CodeFile) "
                        "DETACH DELETE project, file",
                        project_id=uploaded.project_id,
                    ).consume()
            with SessionLocal() as session:
                project = session.get(Project, uploaded.project_id)
                if project is not None:
                    session.delete(project)
                    session.commit()

    @unittest.skipUnless(
        os.getenv("RUN_NEO4J_INTEGRATION_TESTS") == "1",
        "requires a running Neo4j database (set RUN_NEO4J_INTEGRATION_TESTS=1)",
    )
    def test_scan_projects_file_graph_to_neo4j(self) -> None:
        RepositoryScanner().scan_project(self.project_id)
        try:
            with get_driver().session() as session:
                file_count = session.run(
                    "MATCH (:Project {project_id: $project_id})-[:CONTAINS]->(file:CodeFile) "
                    "RETURN count(file) AS count",
                    project_id=self.project_id,
                ).single()["count"]
                import_count = session.run(
                    "MATCH (:CodeFile {project_id: $project_id})-[:IMPORTS]->(:CodeFile) "
                    "RETURN count(*) AS count",
                    project_id=self.project_id,
                ).single()["count"]
                entity_count = session.run(
                    "MATCH (:CodeFile {project_id: $project_id})-[:DECLARES]->(entity:CodeEntity) "
                    "RETURN count(entity) AS count",
                    project_id=self.project_id,
                ).single()["count"]
                call_count = session.run(
                    "MATCH (:CodeEntity {project_id: $project_id})-[:CALLS]->(:CodeEntity) "
                    "RETURN count(*) AS count",
                    project_id=self.project_id,
                ).single()["count"]
            self.assertEqual(file_count, 4)
            self.assertEqual(import_count, 2)
            self.assertGreater(entity_count, 0)
            self.assertEqual(call_count, 12)
        finally:
            with get_driver().session() as session:
                session.run(
                    "MATCH (project:Project {project_id: $project_id}) "
                    "OPTIONAL MATCH (project)-[:CONTAINS]->(file:CodeFile) "
                    "DETACH DELETE project, file",
                    project_id=self.project_id,
                ).consume()
