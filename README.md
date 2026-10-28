# CodeDarpan

CodeDarpan is a React + TypeScript application with a Node.js/Express analyzer for public GitHub repositories and ZIP uploads. It parses JavaScript, JSX, TypeScript and TSX with Babel, resolves static relative imports, and serves a normalized dependency graph, source, search results, structural health evidence, onboarding suggestions and impact estimates.

## Repository layout

```text
codedarpan/
├── backend/                 # Express API, Babel parsing and analysis routes
├── frontend/                # React + TypeScript + Vite application
├── package.json             # Workspace scripts
├── pnpm-lock.yaml           # Shared dependency lockfile
└── pnpm-workspace.yaml      # Frontend and backend workspace declaration
```

## Requirements and local setup

Use Node.js 22+ and pnpm 11.25.0. From the repository root:

```sh
pnpm install
pnpm dev          # API on :3001 and frontend on :3000; Vite proxies /api
pnpm typecheck
pnpm test
pnpm build
```

The API can be started alone with `pnpm --filter @codedarpan/backend dev`. Set `PORT` to change its port. Production requires a same-origin reverse proxy to route `/api` to the API and other paths to the built frontend. Set `CODEDARPAN_PUBLIC_ORIGIN` to the actual HTTPS origin only when building for a public deployment.

## Analysis conventions

Imports are directed from importer to dependency. The graph includes file and declared function nodes. Function calls use Babel lexical bindings, local declaration identity, and matching imported/exported function symbols to avoid linking ambiguous same-name functions; dynamic/member/dependency-package calls and unresolved imports remain omitted, so it is not a complete runtime call graph. File token count is a lexical approximation rather than a model tokenizer. Complexity is a cyclomatic estimate, convention `1 + if/loops/catch/ternary/non-default switch cases/logical operators`. The graph's confidence and caveats are static-analysis evidence, not runtime predictions.

ZIP constraints and limitations are described in [`backend/README.md`](backend/README.md). Analysis snapshots persist in SQLite for seven days by default; configure `CODEDARPAN_DB_PATH` and `CODEDARPAN_RETENTION_DAYS`. GitHub health computes bounded churn over up to five recent first-parent commits; ZIP and unavailable history stay unknown, not zero. Public GitHub issue lookup, tailored onboarding, function-level static call edges, and PR changed-file impact are implemented with documented limitations and structural estimates. Account sessions and per-user analysis isolation are available; self-service signup currently has no email verification/password reset. Private GitHub repositories are unsupported. Operators must define deployment retention and privacy controls.

## Deployment and performance checks

The single-origin container configuration is in [`Dockerfile`](Dockerfile), [`compose.yaml`](compose.yaml), and [`backend/DEPLOYMENT.md`](backend/DEPLOYMENT.md). Local gateway/API smoke tests passed in this environment. A Docker image build was not verified because no Docker/Podman daemon is installed here. The isolated Cytoscape harness is [`frontend/scripts/graph-benchmark.html`](frontend/scripts/graph-benchmark.html). A single headless Chrome run rendered 600 nodes/3,000 edges in about 960 ms; action timing is available, but this environment could not produce a credible sustained FPS/paint-complete measure. Do not treat one render sample as a deployment performance guarantee.

## Tools and external services

The application uses React, React DOM, React Router, Vite, TypeScript, Cytoscape.js, highlight.js, lucide-react, Express, Babel parser/traverse/types, Multer, yauzl, and uuid. GitHub public REST API and codeload are used for public repository metadata, snapshots and PR file lists. No AI model is used. Review package manifests and licenses before distribution.

The UI includes a demo atlas explicitly labeled as sample data; live-analysis errors do not fall back to demo content. Privacy/terms pages are drafts and need operator details and legal review before public deployment.
