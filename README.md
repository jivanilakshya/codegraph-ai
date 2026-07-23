# CodeGraph AI

CodeGraph AI is a planned platform for turning source-code repositories into navigable knowledge graphs and providing intelligent, context-aware developer assistance.

## Planned Architecture

The project will be organized as a service-oriented system:

- A backend service will ingest repositories, analyze source code, and expose APIs.
- A frontend application will provide repository exploration and assistant workflows.
- PostgreSQL will store application and operational data.
- Neo4j will model code relationships as a graph.
- Ollama will provide locally hosted language-model integration.
- Docker Compose will orchestrate development services when they are introduced.

## Planned Tech Stack

- Backend: Python (framework to be selected)
- Frontend: TypeScript and a web framework (to be selected)
- Databases: PostgreSQL and Neo4j
- AI runtime: Ollama
- Infrastructure: Docker and Docker Compose

## Folder Structure

```text
codegraph-ai/
├── backend/             # Planned backend services
├── frontend/            # Planned frontend application
├── docker/              # Container configuration
├── docs/                # Project documentation
├── uploads/             # Runtime upload storage (not versioned)
├── repositories/        # Runtime repository storage (not versioned)
├── scripts/             # Development and operational scripts
├── .github/workflows/   # CI/CD workflows
├── .env.example         # Environment-variable template
├── .gitignore           # Repository ignore rules
├── docker-compose.yml   # Future local service orchestration
├── README.md
└── LICENSE
```

## Development Roadmap

Planned milestones will be documented here as the project scope and implementation sequence are finalized.

## License

This project is licensed under the [MIT License](LICENSE).
