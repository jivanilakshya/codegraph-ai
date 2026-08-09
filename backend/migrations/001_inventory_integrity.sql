-- Run once against existing CodeGraph AI databases before deploying the
-- inventory integrity constraints. Fresh databases get these from SQLAlchemy.

CREATE UNIQUE INDEX IF NOT EXISTS uq_files_project_path
    ON files (project_id, path);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_metadata_project_key
    ON project_metadata (project_id, key);

CREATE TABLE IF NOT EXISTS file_relationships (
    id SERIAL PRIMARY KEY,
    source_file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    target_file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    relationship_type VARCHAR(64) NOT NULL,
    CONSTRAINT uq_file_relationships_source_target_type
        UNIQUE (source_file_id, target_file_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS ix_file_relationships_source_file_id
    ON file_relationships (source_file_id);
CREATE INDEX IF NOT EXISTS ix_file_relationships_target_file_id
    ON file_relationships (target_file_id);

CREATE TABLE IF NOT EXISTS code_entities (
    id SERIAL PRIMARY KEY,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    name VARCHAR(512) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    CONSTRAINT uq_code_entities_file_name_type_line
        UNIQUE (file_id, name, entity_type, start_line)
);

CREATE INDEX IF NOT EXISTS ix_code_entities_file_id ON code_entities (file_id);
CREATE INDEX IF NOT EXISTS ix_code_entities_entity_type ON code_entities (entity_type);

CREATE TABLE IF NOT EXISTS entity_relationships (
    id SERIAL PRIMARY KEY,
    source_entity_id INTEGER NOT NULL REFERENCES code_entities(id) ON DELETE CASCADE,
    target_entity_id INTEGER NOT NULL REFERENCES code_entities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(64) NOT NULL,
    CONSTRAINT uq_entity_relationships_source_target_type
        UNIQUE (source_entity_id, target_entity_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS ix_entity_relationships_source_entity_id
    ON entity_relationships (source_entity_id);
CREATE INDEX IF NOT EXISTS ix_entity_relationships_target_entity_id
    ON entity_relationships (target_entity_id);
