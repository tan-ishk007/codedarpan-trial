# CodeDarpan

CodeDarpan is an evidence-first repository intelligence engine. It accepts a public GitHub repository URL or ZIP archive, parses the source it can support, resolves static relationships, and presents the result as an interactive atlas with source context, architectural health evidence, onboarding guidance and structural impact estimates.

The landing experience is a cinematic royal atlas: ivory surfaces, brass relationship paths, oxblood accents, architectural graph modules and reversible scroll-driven transitions. The application includes email authentication and a production-style Google OAuth authorization-code flow.

## What is included

- Public GitHub URL and ZIP archive ingestion.
- Babel AST analysis for JavaScript, JSX, TypeScript and TSX.
- Deterministic heuristic parsing for Python, Go, Rust, Java, C/C++, Ruby and PHP, with visible caveats instead of overstated AST certainty.
- Static import/dependency relationships, function nodes, circular dependency detection and architectural health evidence.
- Explore, Diagnose, Onboard and Impact views.
- Source inspection, search, relationship tracing and selected-node context.
- Email registration/login with account-scoped analysis access.
- Google OAuth with state validation, HttpOnly state cookie, verified-email requirement and account reuse/linking.
- Framer Motion landing narrative with reversible scroll animation and reduced-motion support.
- SQLite persistence with configurable retention.
- Docker Compose deployment with a same-origin frontend/API gateway.

## Requirements

- Node.js 22 or newer.
- pnpm 11.25.0, as declared by `package.json`.
- For Docker deployment: Docker Engine and Compose v2.
- A Google Cloud project only if Google sign-in is required.

## Local development

From the repository root:

```sh
pnpm install
cp backend/.env.example backend/.env
pnpm dev
```

The development frontend runs at `http://localhost:3000`; the Express API runs at `http://localhost:3001`. Vite proxies `/api` requests to the API, so the browser uses the frontend origin.

Useful commands:

```sh
pnpm typecheck   # TypeScript checks for backend and frontend
pnpm test        # Backend and frontend Vitest suites
pnpm build       # Production backend/frontend build and prerendering
pnpm preview     # Preview the frontend production build
pnpm start       # Start the backend build
```

The API health check is:

```sh
curl http://localhost:3001/api/health
```

A successful health response confirms API reachability. It does not guarantee that a particular GitHub request or repository submission will succeed.

## Google OAuth setup

Google sign-in is intentionally disabled until all three Google variables are configured. Email authentication still works without Google credentials.

### 1. Create a Google OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Configure the OAuth consent screen under **Google Auth Platform**. For a competition/demo deployment, choose the appropriate external or internal audience and add the app name, support email and developer contact email.
4. Add the scopes `openid`, `email` and `profile` if Google asks for scope configuration. CodeDarpan only uses the verified email/profile identity needed to create or reuse an account.
5. Create an OAuth client under **Credentials → Create credentials → OAuth client ID**.
6. Select **Web application**.
7. Add the exact callback URL for every environment:

   Local development:

   ```text
   http://localhost:3000/api/auth/google/callback
   ```

   Production behind the same-origin gateway:

   ```text
   https://YOUR_DOMAIN/api/auth/google/callback
   ```

   Do not add a trailing slash unless it is also present in `GOOGLE_REDIRECT_URI`. Google requires an exact match.

8. Copy the generated Client ID and Client Secret. Never commit the secret or place it in frontend code.

### 2. Configure the backend

Edit `backend/.env`:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# false for local HTTP; true for public HTTPS
CODEDARPAN_PUBLIC_HTTPS=false

# Keep authentication enabled for a real deployment
CODEDARPAN_REQUIRE_AUTH=true
CODEDARPAN_TOKEN_SECRET=replace-with-a-long-random-secret

# Optional GitHub API token for higher rate limits
GITHUB_TOKEN=
```

For production, use the production callback and enable secure cookies:

```dotenv
GOOGLE_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/google/callback
CODEDARPAN_PUBLIC_HTTPS=true
```

Restart the backend after changing `.env`:

```sh
pnpm dev
```

Visit `http://localhost:3000/account`. The Google button appears when this endpoint returns `enabled: true`:

```sh
curl http://localhost:3001/api/auth/google/status
```

Expected response:

```json
{"enabled":true}
```

The callback flow is: CodeDarpan creates a short-lived state value, stores it in an HttpOnly cookie, redirects to Google, exchanges the returned code server-side, verifies the Google email, creates or reuses the CodeDarpan account, sets the CodeDarpan session cookie and returns to `/account?oauth=success`.

## Docker Compose deployment

The recommended production shape is the included single-origin container. It serves the built frontend and forwards `/api` to the internal Express API. SQLite is stored in the named `codedarpan-data` volume.

```sh
export HOST_PORT=3000
export CODEDARPAN_RETENTION_DAYS=7

docker compose -f compose.yaml config
docker compose -f compose.yaml up --build -d
docker compose -f compose.yaml ps
curl --fail http://127.0.0.1:${HOST_PORT}/api/health
```

Open `http://127.0.0.1:${HOST_PORT}/`. For a public HTTPS deployment, place a trusted TLS reverse proxy in front of the container, configure the public domain in Google Cloud, and set the following runtime secrets/environment variables:

```dotenv
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://YOUR_DOMAIN/api/auth/google/callback
CODEDARPAN_PUBLIC_HTTPS=true
CODEDARPAN_REQUIRE_AUTH=true
CODEDARPAN_TOKEN_SECRET=a-long-random-secret
CODEDARPAN_RETENTION_DAYS=7
```

Do not expose the internal backend port separately. Route the browser through the single public origin so auth cookies and `/api` requests remain same-origin.

Useful Docker commands:

```sh
docker compose -f compose.yaml logs -f codedarpan
docker compose -f compose.yaml restart codedarpan
docker compose -f compose.yaml down
```

`docker compose down -v` deletes the named database volume and all persisted analyses. Use it only when intentionally destroying stored data.

## Configuration reference

| Variable | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret; keep server-side only. |
| `GOOGLE_REDIRECT_URI` | Exact callback registered in Google Cloud. |
| `CODEDARPAN_PUBLIC_HTTPS` | Set `true` for public HTTPS or embedded previews so secure auth-cookie settings are used. |
| `CODEDARPAN_REQUIRE_AUTH` | Require login before analysis endpoints; keep `true` for deployment. |
| `CODEDARPAN_TOKEN_SECRET` | Secret used to sign sessions. Use a long random value. |
| `GITHUB_TOKEN` | Optional runtime GitHub token for authenticated API requests and higher limits. |
| `CODEDARPAN_DB_PATH` | SQLite path; keep it on persistent storage in production. |
| `CODEDARPAN_RETENTION_DAYS` | Analysis retention period; default is seven days in Compose. |
| `PORT` | Backend port when running outside Compose; default is 3001. |

## Repository layout

```text
codedarpan/
├── backend/                 # Express API, OAuth, SQLite and analysis pipeline
├── frontend/                # React, Vite, Framer Motion and Cytoscape UI
├── compose.yaml             # Single-origin Docker deployment
├── Dockerfile               # Node 22 production image
├── package.json              # Workspace scripts
├── pnpm-lock.yaml            # Locked dependency graph
└── pnpm-workspace.yaml       # Workspace declaration
```

## Analysis scope and honest limitations

JavaScript-family files receive the AST-grade Babel pipeline. Other supported languages are ingested through deterministic heuristic adapters and carry an explicit warning. The graph is a static structural map, not a complete runtime call graph: dynamic imports, package exports, aliases, runtime dispatch and unresolved relationships can remain unknown. Complexity and token counts are estimates. Impact and churn evidence is bounded and should not be treated as a prediction of every runtime failure.

Only public GitHub repositories are supported by the frontend. Private repository access is not implemented. Uploaded archives and persisted analysis payloads may contain proprietary source code, so operators must protect the host, database, backups and logs and must publish accurate privacy/retention terms before launch.

Account signup currently has no email verification or password-reset flow. For a public deployment, consider an identity-aware proxy, invite policy, rate limits, TLS termination and reviewed legal/privacy documents.

## Verification

The final handoff was verified with:

```text
pnpm typecheck   passed
pnpm test        55 tests passed
pnpm build       passed, including Vite build and prerendering
```

## Troubleshooting

**Google button is missing:** check `GET /api/auth/google/status`, confirm all three `GOOGLE_*` values are present in the backend environment, then restart the backend.

**Google says redirect URI mismatch:** copy the callback URL exactly from `GOOGLE_REDIRECT_URI` into the Google OAuth client's authorized redirect URIs. Check protocol, host, port, path and trailing slash.

**OAuth state is invalid or expired:** start the flow again in the same browser origin. Do not mix `localhost` and `127.0.0.1`; browser cookies are origin-specific.

**The frontend cannot reach the API:** confirm the backend is listening on port 3001, Vite is running on port 3000, and `/api/health` responds.

**Authentication works locally but not in production:** use the public HTTPS callback, set `CODEDARPAN_PUBLIC_HTTPS=true`, terminate TLS at the reverse proxy, and keep frontend/API traffic on one origin.

**Analysis is unavailable:** inspect the returned error and backend logs. The interface intentionally does not replace failed live analysis with sample data.

## License and launch review

Review package licenses and confirm the project’s intended license before distribution. Replace the draft Privacy and Terms pages with deployment-specific, professionally reviewed documents before public launch.
