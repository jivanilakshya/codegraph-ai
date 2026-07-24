# CodeGraph AI Backend

The FastAPI backend for CodeGraph AI. This initial scaffold provides the application entry point, local-development CORS configuration, a health endpoint, and a versioned API routing boundary.

## Setup

Create and activate a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Run the development server from the `backend` directory:

```powershell
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`. Visit `/` for the health response and `/docs` for the generated OpenAPI documentation.

## Project Structure

```text
backend/
├── app/
│   ├── api/v1/endpoints/  # Versioned API endpoint modules
│   ├── core/              # Shared application configuration and utilities
│   ├── database/          # Future database integration
│   ├── models/            # Future application models
│   ├── schemas/           # Request and response schemas
│   ├── services/          # Application service layer
│   ├── parser/            # Future source-code parsing components
│   ├── utils/             # Reusable utilities
│   └── main.py            # FastAPI application entry point
├── tests/                 # Backend test suite
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## API Versioning

Versioned routes are reserved under `/api/v1`. Endpoint implementations will be added as the backend evolves.
