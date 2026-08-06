# CodeGraph AI Developer Toolkit

This is an internal developer console. It is intentionally separate from the backend and frontend.

## Run

From the repository root:

```powershell
python -m pip install -r toolkit/requirements.txt
python dev_toolkit.py
```

`python toolkit.py` is also supported. The toolkit reads the repository `.env` file and supports `TOOLKIT_API_URL` and `TOOLKIT_COMPOSE_FILE` overrides.

The default local connection values match `docker-compose.yml`. Start the backend and services with `docker compose up -d` before using database, Neo4j, or API commands.

## Design

Menu entries are `MenuCommand` records in `toolkit/commands.py`. Add a command to `build_commands` without changing the menu loop. Feature integrations are kept in `database.py`, `api.py`, `neo4j.py`, `docker.py`, `project.py`, and `parser.py`.

Backups use the PostgreSQL `pg_dump` executable and are written to the path entered by the developer. Destructive actions such as clearing PostgreSQL or Neo4j are exposed explicitly as menu options.
