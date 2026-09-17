"""Projection of scanned PostgreSQL inventory into the Neo4j code graph."""

from dataclasses import dataclass
from pathlib import Path, PurePosixPath

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
from app.services.api_route_extractor import ApiRouteExtractor
from app.services.parser_service import ParserService


class Neo4jGraphPersistenceError(Exception):
    """Raised when the Neo4j projection cannot be synchronized."""


@dataclass(frozen=True)
class _GraphProjection:
    project_id: int
    project_name: str
    modules: list[dict[str, object]]
    api_routes: list[dict[str, object]]
    files: list[dict[str, object]]
    relationships: list[dict[str, object]]
    entities: list[dict[str, object]]
    entity_relationships: list[dict[str, object]]


class Neo4jGraphPersistenceService:
    """Replace one project's file graph in Neo4j from committed PostgreSQL data."""

    _ENTITY_RELATIONSHIP_TYPES = ("CALLS", "EXTENDS", "HAS_METHOD")

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
                routes = Neo4jGraphPersistenceService._extract_api_routes(project, files, entities)
                return _GraphProjection(
                    project_id=project.id,
                    project_name=project.name,
                    modules=Neo4jGraphPersistenceService._modules_for_files(files),
                    api_routes=routes,
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
    def _extract_api_routes(project: Project, files: list[File], entities: list[CodeEntity]) -> list[dict[str, object]]:
        root = getattr(project, "local_path", None)
        if not root:
            return []
        entity_by_name = {entity.name: entity for entity in entities}
        routes = []
        for file in files:
            path = Path(root) / file.path
            if path.suffix.lower() not in {".js", ".jsx", ".ts", ".tsx"} or not path.exists():
                continue
            try:
                source = path.read_bytes()
                tree = ParserService._parser_for(path.suffix.lower()).parse(source)
                for route in ApiRouteExtractor().extract(tree.root_node, source):
                    handler = entity_by_name.get(route.handler_name)
                    if handler:
                        routes.append({"route_id": route.route_id, "method": route.method, "path": route.path, "framework": route.framework, "source_file_id": file.id, "handler_entity_id": handler.id})
            except Exception:
                continue
        return list({route["route_id"]: route for route in routes}.values())

    @staticmethod
    def _modules_for_files(files: list[File]) -> list[dict[str, object]]:
        """Build the minimal deterministic directory tree containing scanned files."""
        module_paths: set[str] = set()
        for file in files:
            parent = PurePosixPath(file.path.replace("\\", "/")).parent
            while str(parent) not in {"", "."}:
                module_paths.add(parent.as_posix())
                parent = parent.parent

        return [
            {
                "path": module_path,
                "name": PurePosixPath(module_path).name,
                "parent_path": (
                    None
                    if str(PurePosixPath(module_path).parent) == "."
                    else PurePosixPath(module_path).parent.as_posix()
                ),
            }
            for module_path in sorted(module_paths, key=lambda path: (path.count("/"), path))
        ]

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
            "MATCH (node {project_id: $project_id}) "
            "WHERE node:Module OR node:CodeFile OR node:CodeEntity "
            "OR node:ApiRoute "
            "DETACH DELETE node",
            **parameters,
        ).consume()
        if projection.modules:
            transaction.run(
                "UNWIND $modules AS module "
                "CREATE (:Module {project_id: $project_id, path: module.path, "
                "name: module.name})",
                modules=projection.modules,
                **parameters,
            ).consume()
            transaction.run(
                "MATCH (project:Project {project_id: $project_id}) "
                "UNWIND $modules AS module "
                "WITH project, module WHERE module.parent_path IS NULL "
                "MATCH (child:Module {project_id: $project_id, path: module.path}) "
                "CREATE (project)-[:CONTAINS]->(child)",
                modules=projection.modules,
                **parameters,
            ).consume()
            transaction.run(
                "UNWIND $modules AS module "
                "WITH module WHERE module.parent_path IS NOT NULL "
                "MATCH (parent:Module {project_id: $project_id, path: module.parent_path}) "
                "MATCH (child:Module {project_id: $project_id, path: module.path}) "
                "CREATE (parent)-[:CONTAINS]->(child)",
                modules=projection.modules,
                **parameters,
            ).consume()
        if projection.files:
            transaction.run(
                "UNWIND $files AS file "
                "CREATE (code_file:CodeFile {project_id: $project_id, file_id: file.id}) "
                "SET code_file.path = file.path, code_file.language = file.language, "
                "code_file.size = file.size",
                files=projection.files,
                **parameters,
            ).consume()
            transaction.run(
                "MATCH (project:Project {project_id: $project_id}) "
                "UNWIND $files AS file "
                "WITH project, file WHERE NOT file.path CONTAINS '/' "
                "MATCH (code_file:CodeFile {project_id: $project_id, file_id: file.id}) "
                "CREATE (project)-[:CONTAINS]->(code_file)",
                files=projection.files,
                **parameters,
            ).consume()
            transaction.run(
                "UNWIND $files AS file "
                "WITH file, CASE WHEN file.path CONTAINS '/' "
                "THEN substring(file.path, 0, size(file.path) - size(last(split(file.path, '/'))) - 1) "
                "ELSE NULL END AS parent_path "
                "WHERE parent_path IS NOT NULL "
                "MATCH (parent:Module {project_id: $project_id, path: parent_path}) "
                "MATCH (code_file:CodeFile {project_id: $project_id, file_id: file.id}) "
                "CREATE (parent)-[:CONTAINS]->(code_file)",
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
        for relationship_type in Neo4jGraphPersistenceService._ENTITY_RELATIONSHIP_TYPES:
            relationships = [
                relationship
                for relationship in projection.entity_relationships
                if relationship["relationship_type"] == relationship_type
            ]
            if not relationships:
                continue
            transaction.run(
                "UNWIND $relationships AS relationship "
                "MATCH (source:CodeEntity {project_id: $project_id, "
                "entity_id: relationship.source_entity_id}) "
                "MATCH (target:CodeEntity {project_id: $project_id, "
                "entity_id: relationship.target_entity_id}) "
                f"CREATE (source)-[:{relationship_type}]->(target)",
                relationships=relationships,
                **parameters,
            ).consume()
        if projection.api_routes:
            transaction.run(
                "UNWIND $routes AS route MATCH (file:CodeFile {project_id: $project_id, file_id: route.source_file_id}) "
                "CREATE (api_route:ApiRoute {project_id: $project_id, route_id: route.route_id}) "
                "SET api_route.method = route.method, api_route.path = route.path, api_route.framework = route.framework "
                "CREATE (file)-[:CONTAINS]->(api_route)", routes=projection.api_routes, **parameters).consume()
            transaction.run(
                "UNWIND $routes AS route MATCH (api_route:ApiRoute {project_id: $project_id, route_id: route.route_id}) "
                "MATCH (handler:CodeEntity {project_id: $project_id, entity_id: route.handler_entity_id}) "
                "CREATE (api_route)-[:HANDLES]->(handler)", routes=projection.api_routes, **parameters).consume()
