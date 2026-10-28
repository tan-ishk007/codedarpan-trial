# CodeDarpan analyzer (Node.js + TypeScript + Express)

## Run

From the repository root, use `pnpm install`, `pnpm dev` (API :3001 and Vite :3000), `pnpm test`, `pnpm typecheck`, and `pnpm build`. Vite proxies `/api` to the API during development. Production needs a same-origin reverse proxy. The API listens on `PORT` (default 3001).

## API and analysis

`POST /api/analyses` accepts JSON `{ repositoryUrl, ref? }` for public GitHub repositories or multipart `file` for ZIP. At present, each analysis is computed synchronously; the response is returned after it reaches `ready`, while `/events` emits a terminal SSE notification. The frontend documents all routes in `frontend/src/lib/api.ts`.

`GET /api/health` returns JSON with `status: "ok"`, the service name and the current in-memory analysis count. It is a process/API liveness check only; it does not validate GitHub availability, authentication, or a particular analysis submission. The frontend uses this route for public analyzer API status indicators.

The parser supports JavaScript, JSX, TypeScript and TSX through Babel. Python, Go, Rust, Java, C/C++, Ruby and PHP files are also ingested with deterministic heuristic extraction of file structure, imports, functions and branch counts; their responses carry an explicit heuristic-parser warning instead of claiming language-specific AST semantics. It extracts import/export paths, declaration symbols, cyclomatic estimate and call expressions. Relative imports resolve by exact path, common extensions, or `index` candidates. Import edges point importer → dependency. Declared functions are graph nodes; call edges follow Babel lexical bindings for local declarations and named/default imported functions with a resolved source. This avoids same-name global matching, but dynamic imports, member/namespace calls, dependency-package calls, complex re-exports and runtime dispatch remain unresolved. Searchable symbols focus on declarations.

Token count is a lexical approximation (identifiers, numeric literals, operators and punctuation; comments/whitespace excluded), not model tokenization. Complexity is `1 +` if/loop/catch/ternary/logical branches and switch cases after the first. These metrics are estimates, not formal proof of runtime behavior.

ZIP safeguards: 25 MiB upload, 100 MiB total expanded source, 5,000 accepted source files, 2 MiB per file, path traversal/symlink rejection, and ignored dependency/build folders. GitHub intake uses public API and codeload; rate limits and network failures surface as errors.

Public GitHub issue lookup retrieves up to 100 open issues and filters the requested labels; exact path/filename mentions are returned as explainable file matches. PR analysis obtains public changed-file lists and walks reverse import relationships. These are structural hints, not predictions of runtime breakage. Set `GITHUB_TOKEN` in deployment secrets to avoid shared-host anonymous GitHub API limits; the token is used only for outbound GitHub requests and is never returned to the browser.

## Persistence, limitations and privacy

SQLite (`better-sqlite3`) persists analysis metadata and source snapshots so run IDs survive process restarts. Default database path is `data/codedarpan.sqlite` relative to the API process working directory; override with `CODEDARPAN_DB_PATH`. Records expire after seven days by default at server startup; configure `CODEDARPAN_RETENTION_DAYS`. Set an appropriate writable persistent volume and retention policy in deployment. When `CODEDARPAN_REQUIRE_AUTH=true`, account sessions and owner-scoped analysis access are enforced; local development defaults to a shared local workspace. Private repository support is not implemented. Request/body and archive limits are enforced.

For GitHub analyses, health computes per-file additions/deletions across the analyzed revision and up to four first-parent commits (one request per examined commit, bounded to five). It is a recent-history measure, not lifetime churn. Rate limits, missing revisions and capped commit file lists surface as unavailable/null counts, never guessed zero. ZIP history is inherently unavailable. No AI model is used. Optional account endpoints provide self-service signup/login, scrypt password hashes, signed 12-hour same-site HttpOnly sessions and owner-scoped analysis access. Local development defaults to a shared local workspace; Compose requires authentication. Signup currently lacks verification/recovery. Public repository source persists in SQLite until expiry/cleanup; operators must inform users and secure/delete that data. Privacy/terms drafts need owner details and legal review before public launch.

## Benchmark

Run the API (`pnpm dev`) and in another terminal execute `node backend/scripts/benchmark.mjs`. Configure `CODEDARPAN_API`, `BENCH_FILES`, and `BENCH_FANOUT` if desired. It synthesizes a deterministic TypeScript ZIP and records intake+analysis response, server analysis, graph fetch and counts. It does not measure browser Cytoscape paint/frame rate.

A local run on 2026-10-28 with Node 22.23.4 and a 6-vCPU Intel Xeon Processor @ 2.50GHz used 500 files, fanout 5, 133,290-byte archive and returned 500 nodes/2,500 edges. Three consecutive warm runs had median server analysis 225 ms, median upload+analysis response 321 ms, median graph fetch 14 ms and median end-to-graph 339 ms (ranges respectively 215–242, 295–344, 13–16 and 315–362 ms). These are environment-specific, local synthetic measurements, not a general guarantee. No browser frame-rate result is claimed.

## Google sign-in

Google sign-in uses the authorization-code flow and links a verified Google email to the existing CodeDarpan user record. Configure these runtime secrets and do not commit them:

```sh
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-domain.example/api/auth/google/callback
CODEDARPAN_PUBLIC_HTTPS=true
```

Register the exact callback URI in Google Cloud Console. The start route validates configuration, generates a short-lived state, and uses an HttpOnly state cookie; the callback exchanges the code server-side, requires a verified email, reuses or creates the local account, and issues the same CodeDarpan session used by email login. `CODEDARPAN_PUBLIC_HTTPS=true` enables `SameSite=None; Secure` cookies for cross-site embedded HTTPS previews; local HTTP development uses `SameSite=Lax`.
