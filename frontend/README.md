# CodeGraph AI Frontend

The CodeGraph AI frontend is a Next.js application that will provide the user interface for exploring codebase knowledge graphs and AI-assisted development workflows. The current foundation contains a minimal landing page only.

## Prerequisites

- Node.js 20.9 or later
- npm 10 or later

## Installation

From the `frontend` directory, install the project dependencies:

```bash
npm install
```

Create a local environment file from the template:

```bash
cp .env.local.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

## Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser. Use `npm run lint` to run ESLint and `npm run build` to create a production build.

## Project structure

```text
frontend/
├── app/                 # App Router routes, layout, and global styles
│   └── (dashboard)/     # Reserved dashboard route group
├── components/
│   ├── common/          # Shared components
│   ├── layout/          # Layout-specific components
│   └── ui/              # Reusable interface primitives
├── hooks/               # Reusable React hooks
├── lib/                 # Shared utilities and configuration
├── public/              # Static assets
├── services/            # Future API client modules
├── store/               # Future Zustand stores
├── styles/              # Additional shared styles
└── types/               # Shared TypeScript types
```

## Environment variables

`NEXT_PUBLIC_API_URL` defines the backend base URL available to the browser. Its development default is `http://localhost:8000`.
