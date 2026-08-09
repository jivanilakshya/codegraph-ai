"""Projection of scanned PostgreSQL inventory into the Neo4j code graph."""

from dataclasses import dataclass

from neo4j.exceptions import Neo4jError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database.neo4j import get_driver
from app.database.postgres import SessionLocal
from app.models.file import File
from app.models.code_entity import CodeEntity
from app.models.entity_relationship import EntityRelationship
from app.models.project import Project
from app.models.relationship import FileRelationship


class Neo4jGraphPersistenceError(Exception):
    """Raised when the Neo4j projection cannot be synchronized."""


@dataclass(frozen=True)
class _GraphProjection:
    project_id: int
    project_name: str
    files: list[dict[str, object]]
    relationships: list[dict[str, object]]
    entities: list[dict[str, object]]
    entity_relationships: list[dict[str, object]]


class Neo4jGraphPersistenceService:
    """Replace one project's file graph in Neo4j from committed PostgreSQL data."""

    def sync_project(self, project_id: int) -> None:
        projection = self._load_projection(project_id)
        try:
            with get_driver().session() as session:
                session.execute_write(self._replace_project_graph, projection)
        except Neo4jError as error:
            raise Neo4jGraphPersistenceError(
                "Could not synchronize the project graph to Neo4j."
            ) from error

    @staticmethod
    def _load_projection(project_id: int) -> _GraphProjection:
        try:
            with SessionLocal() as session:
                project = session.get(Project, project_id)
                if project is None:
                    raise Neo4jGraphPersistenceError("Project was not found for graph sync.")
                files = session.scalars(
                    select(File).where(File.project_id == project_id).order_by(File.id)
                ).all()
                relationships = session.scalars(
                    select(FileRelationship)
                    .join(File, FileRelationship.source_file_id == File.id)
                    .where(File.project_id == project_id)
                ).all()
                entities = session.scalars(
                    select(CodeEntity)
                    .join(File, CodeEntity.file_id == File.id)
                    .where(File.project_id == project_id)
                    .order_by(CodeEntity.id)
                ).all()
                entity_relationships = session.scalars(
                    select(EntityRelationship)
                    .join(
                        CodeEntity,
                        EntityRelationship.source_entity_id == CodeEntity.id,
                    )
                    .join(File, CodeEntity.file_id == File.id)
                    .where(File.project_id == project_id)
                    .order_by(EntityRelationship.id)
                ).all()
                return _GraphProjection(
                    project_id=project.id,
                    project_name=project.name,
                    files=[
                        {
                            "id": file.id,
                            "path": file.path,
                            "language": file.language,
                            "size": file.size,
                        }
                        for file in files
                    ],
                    relationships=[
                        {
                            "source_file_id": relationship.source_file_id,
                            "target_file_id": relationship.target_file_id,
                            "relationship_type": relationship.relationship_type,
                        }
                        for relationship in relationships
                    ],
                    entities=[
                        {
                            "id": entity.id,
                            "file_id": entity.file_id,
                            "name": entity.name,
                            "entity_type": entity.entity_type,
                            "start_line": entity.start_line,
                            "end_line": entity.end_line,
                        }
                        for entity in entities
                    ],
                    entity_relationships=[
                        {
                            "source_entity_id": relationship.source_entity_id,
                            "target_entity_id": relationship.target_entity_id,
                            "relationship_type": relationship.relationship_type,
                        }
                        for relationship in entity_relationships
                    ],
                )
        except SQLAlchemyError as error:
            raise Neo4jGraphPersistenceError(
                "Could not load project data for Neo4j synchronization."
            ) from error

    @staticmethod
    def _replace_project_graph(transaction, projection: _GraphProjection) -> None:
        parameters = {"project_id": projection.project_id}
        transaction.run(
            "MERGE (project:Project {project_id: $project_id}) "
            "SET project.name = $project_name",
            project_name=projection.project_name,
            **parameters,
        ).consume()
        transaction.run(
            "MATCH (:Project {project_id: $project_id})-[:CONTAINS]->(file:CodeFile) "
            "DETACH DELETE file",
            **parameters,
        ).consume()
        if projection.files:
            transaction.run(
                "MATCH (project:Project {project_id: $project_id}) "
                "UNWIND $files AS file "
                "CREATE (code_file:CodeFile {project_id: $project_id, file_id: file.id}) "
                "SET code_file.path = file.path, code_file.language = file.language, "
                "code_file.size = file.size "
                "CREATE (project)-[:CONTAINS]->(code_file)",
                files=projection.files,
                **parameters,
            ).consume()
        if projection.relationships:
            transaction.run(
                "UNWIND $relationships AS relationship "
                "MATCH (source:CodeFile {project_id: $project_id, file_id: relationship.source_file_id}) "
                "MATCH (target:CodeFile {project_id: $project_id, file_id: relationship.target_file_id}) "
                "CREATE (source)-[:IMPORTS {relationship_type: relationship.relationship_type}]->(target)",
                relationships=projection.relationships,
                **parameters,
            ).consume()
        if projection.entities:
            transaction.run(
                "UNWIND $entities AS entity "
                "MATCH (file:CodeFile {project_id: $project_id, file_id: entity.file_id}) "
                "CREATE (code_entity:CodeEntity {project_id: $project_id, entity_id: entity.id}) "
                "SET code_entity.file_id = entity.file_id, code_entity.name = entity.name, "
                "code_entity.entity_type = entity.entity_type, "
                "code_entity.start_line = entity.start_line, code_entity.end_line = entity.end_line "
                "CREATE (file)-[:DECLARES]->(code_entity)",
                entities=projection.entities,
                **parameters,
            ).consume()
        if projection.entity_relationships:
            transaction.run(
                "UNWIND $relationships AS relationship "
                "MATCH (source:CodeEntity {project_id: $project_id, "
                "entity_id: relationship.source_entity_id}) "
                "MATCH (target:CodeEntity {project_id: $project_id, "
                "entity_id: relationship.target_entity_id}) "
                "CREATE (source)-[:CALLS]->(target)",
                relationships=projection.entity_relationships,
                **parameters,
            ).consume()
