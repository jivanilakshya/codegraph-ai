# CodeGraph AI

CodeGraph AI is an intelligent code analysis platform that converts source-code repositories into structured knowledge graphs. It enables developers to explore code structure, inter-file relationships, abstract syntax trees (ASTs), and symbol dependencies across large codebases through an interactive web interface.

---

## Features

- **Repository Ingestion** — Clone public GitHub repositories or upload local projects as ZIP archives
- **Repository Scanning** — Detect changed files and incrementally re-analyse a codebase
- **Language Detection** — Automatically identify programming languages per file
- **Tree-sitter AST Parsing** — Parse source files into full abstract syntax trees
- **Symbol Extraction** — Extract imports, classes, functions, methods, and variables
- **Relationship Extraction** — Derive inter-file and inter-symbol dependencies
- **PostgreSQL Persistence** — Store projects, files, code entities, and relationships relationally
- **Neo4j Graph Persistence** — Persist entities and relationships as a traversable property graph
- **Interactive Graph Visualization** — Explore the knowledge graph visually in the browser
- **AST Exploration** — Inspect the raw AST of any parsed source file
- **Project & Repository Management** — Create, list, and delete projects and linked repositories
- **Developer / Database Tools** — Built-in diagnostics and database inspection utilities
- **Docker-based Environment** — All services run with a single `docker compose up` command

---

## Architecture

```
GitHub Repository / ZIP Archive
        │
        ▼
  Repository Ingestion
  (github_service / upload_service)
        │
        ▼
   Repository Scanner
   (repository_scanner)
        │
        ├──► Language Detection
        │
        └──► Tree-sitter Parsing
                    │
                    ▼
             AST Analysis
         (parser_service / parser)
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   Symbol Extraction   Relationship Extraction
   (symbol_extractor)  (relationship_extractor)
          │                   │
          └────────┬──────────┘
                   ▼
            Code Entities
      (entity_persistence / relationship_persistence)
                   │
          ┌────────┴────────┐
          ▼                 ▼
      PostgreSQL           Neo4j
   (relational store)  (graph store)
                             │
                             ▼
                   Knowledge Graph API
                   (graph_service)
                             │
                             ▼
                  Interactive Graph UI
                  (Next.js frontend)
```

---

## Technology Stack

### Backend
| Technology | Role |
|---|---|
| Python | Primary backend language |
| FastAPI | REST API framework |
| SQLAlchemy | ORM and database session management |
| Pydantic | Request/response schema validation |
| Tree-sitter | Source-code parsing and AST generation |
| PostgreSQL | Relational persistence for projects, files, and entities |
| Neo4j | Graph database for knowledge-graph storage |

### Frontend
| Technology | Role |
|---|---|
| TypeScript | Primary frontend language |
| Next.js | React framework and routing |
| React | UI component model |
| Tailwind CSS | Utility-first styling |

### Infrastructure
| Technology | Role |
|---|---|
| Docker | Containerised services |
| Docker Compose | Multi-service local orchestration |

---

## Code Analysis

Source files are parsed using [Tree-sitter](https://tree-sitter.github.io/tree-sitter/), a fast, incremental parser that produces concrete syntax trees suitable for reliable static analysis.

### Supported Languages

- Python
- JavaScript
- TypeScript
- TSX

### Extracted Information

For each supported source file the parser extracts:

- **Imports** — module and symbol-level import declarations
- **Classes** — class definitions with names and locations
- **Functions** — top-level function definitions
- **Methods** — class-level method definitions
- **Variables** — top-level variable and constant assignments
- **Relationships** — calls, imports, and inheritance links between symbols
- **AST Nodes** — the full raw syntax tree, queryable from the UI

---

## Project Structure

```
codegraph-ai/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       └── endpoints/      # github, graph, parser, projects,
│   │   │                           #   repository_scanner, upload, workspace
│   │   ├── core/                   # Configuration and settings
│   │   ├── database/               # SQLAlchemy engine and session
│   │   ├── models/                 # ORM models (project, file, code_entity,
│   │   │                           #   entity_relationship, relationship, metadata)
│   │   ├── parser/                 # Tree-sitter integration
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Business logic
│   │   │   ├── github_service.py
│   │   │   ├── upload_service.py
│   │   │   ├── repository_scanner.py
│   │   │   ├── parser_service.py
│   │   │   ├── symbol_extractor.py
│   │   │   ├── relationship_extractor.py
│   │   │   ├── entity_persistence.py
│   │   │   ├── relationship_persistence.py
│   │   │   ├── neo4j_graph_persistence.py
│   │   │   └── graph_service.py
│   │   └── utils/
│   ├── migrations/                 # Alembic database migrations
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── app/                        # Next.js app-router pages
│   ├── components/                 # React components
│   │   ├── analysis/
│   │   ├── common/
│   │   ├── developer/
│   │   ├── graph/
│   │   ├── layout/
│   │   ├── projects/
│   │   ├── ui/
│   │   └── workspace/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   ├── store/
│   ├── types/
│   ├── Dockerfile
│   └── .env.local.example
├── toolkit/                        # Developer CLI toolkit
├── docker-compose.yml
├── .env.example
├── LICENSE
└── README.md
```

---

## Main Backend Components

| Component | Description |
|---|---|
| **Repository Ingestion** | `github_service` clones public GitHub repositories; `upload_service` unpacks ZIP archives into the working directory |
| **Repository Scanner** | `repository_scanner` walks the file tree, detects changes since the last scan, and dispatches files for analysis |
| **Tree-sitter Parser** | `parser_service` and the `parser` module use Tree-sitter grammars to produce ASTs from source files |
| **Symbol Extraction** | `symbol_extractor` queries AST nodes to identify imports, classes, functions, methods, and variables |
| **Relationship Extraction** | `relationship_extractor` derives call, import, and inheritance relationships between extracted symbols |
| **PostgreSQL Persistence** | `entity_persistence` and `relationship_persistence` write code entities and relationships to PostgreSQL via SQLAlchemy |
| **Neo4j Persistence** | `neo4j_graph_persistence` and `graph_service` mirror entities and relationships to Neo4j as a traversable property graph |

---

## Frontend

| Section | Description |
|---|---|
| **Project Management** | Create and manage analysis projects linked to one or more repositories |
| **Repository Browsing** | Browse ingested repositories and trigger or monitor scan runs |
| **AST Exploration** | Inspect the raw Tree-sitter AST of any parsed source file |
| **Symbol & Relationship Inspection** | View extracted symbols and their relationships in structured lists |
| **Interactive Graph Visualization** | Explore the knowledge graph as an interactive, force-directed node graph |
| **Developer Diagnostics** | Access database inspection and service health utilities via the developer panel |

---

## Running the Project

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/) installed

### Quick Start

```bash
git clone https://github.com/jivanilakshya/CodeGraph_AI.git
cd CodeGraph_AI
docker compose up --build
```

The backend API will be available at `http://localhost:8000` and the frontend at `http://localhost:3000`.

---

## Environment Configuration

Each service provides an `.env.example` file documenting the required environment variables:

- `backend/.env.example` — database URLs, Neo4j credentials, GitHub token, upload paths
- `frontend/.env.local.example` — backend API base URL
- `.env.example` — top-level shared variables used by Docker Compose

Copy each example file to the corresponding `.env` (or `.env.local`) file and fill in your values before starting the services.

> **Important:** Never commit `.env` files or any files containing real credentials to version control. All secret files are covered by `.gitignore`.

---

## Development Status

CodeGraph AI is an actively developed project. The core ingestion pipeline, AST parsing, symbol and relationship extraction, dual-database persistence (PostgreSQL + Neo4j), and the interactive frontend are all implemented and operational. Ongoing work focuses on expanding language support, improving graph query capabilities, and refining the UI.

---

## Project Goal

The goal of CodeGraph AI is to represent source files, code entities, and the relationships between them as a connected, queryable knowledge graph. This structured representation makes large codebases easier to navigate and understand, and provides a foundation for future context-aware developer tooling such as impact analysis, dependency tracing, and AI-assisted code comprehension.

---

## License

This project is licensed under the [MIT License](LICENSE).
