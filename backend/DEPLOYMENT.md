# Docker deployment

CodeDarpan is packaged as a single Node 22 container. A lightweight Node gateway serves the compiled frontend and forwards `/api` requests to the Express backend, so the browser uses one origin. The backend source (`backend/src/server.ts`) is not changed. SQLite and its WAL files live under the mounted `/data` volume.

## Requirements

- Docker Engine with Compose v2 (`docker compose`).
- A free host TCP port, default `3000`.

From the repository root:

```sh
# Optional: choose an available host port and retention period (days).
export HOST_PORT=3000
export CODEDARPAN_RETENTION_DAYS=7

docker compose -f compose.yaml config
docker compose -f compose.yaml up --build -d
docker compose -f compose.yaml ps
curl --fail http://127.0.0.1:${HOST_PORT}/api/health
```

Open `http://127.0.0.1:${HOST_PORT}/`. The health endpoint should return JSON with `status: "ok"`; Compose and the image health check poll this endpoint. Follow startup logs with `docker compose -f compose.yaml logs -f codedarpan` and stop the service with `docker compose -f compose.yaml down`.

The app's SQLite retention cleanup uses `CODEDARPAN_RETENTION_DAYS` at startup (minimum effective value is one day). Older analysis rows are pruned on startup. The named `codedarpan-data` volume survives ordinary container replacement and `docker compose down`; `docker compose down -v` **deletes** that volume and all persisted analyses. The image runs as an unprivileged `app` user; the volume is mounted at `/data`.

## Backup and restore

For a consistent SQLite backup, pause writes by stopping the app, then archive the named volume with a temporary container. Substitute the actual Compose project volume name if the project has a custom name (default is `<directory>_codedarpan-data`):

```sh
docker compose -f compose.yaml stop codedarpan
VOLUME_NAME="$(docker volume ls -q --filter name=codedarpan-data | head -n 1)"
test -n "$VOLUME_NAME"
mkdir -p backups
docker run --rm -v "$VOLUME_NAME:/data:ro" -v "$PWD/backups:/backup" alpine:3.20 \
  tar -czf /backup/codedarpan-data-$(date +%F-%H%M%S).tgz -C /data .
docker compose -f compose.yaml start codedarpan
```

Keep backup archives private and encrypted at rest. To restore, stop the service, extract the archive into the same volume using a trusted utility container, then start the service again. Test backups by restoring to a separate volume before relying on them.

## Security and secrets

- The Compose deployment enables account authentication by default. Users can register/sign in at `/account`; passwords are scrypt-hashed, sessions are signed 12-hour bearer tokens, and analysis access is isolated by account. Account creation is open to anyone who can reach the site, with no email verification or password reset yet. Configure a trusted identity-aware proxy or access allowlist if signup must be restricted. Put registration behind an invite/proxy policy before broad exposure, terminate TLS at a trusted reverse proxy, and apply rate limits appropriate for uploads and analysis work. Set `CODEDARPAN_REQUIRE_AUTH=false` only for a trusted local environment.
- Bind the published port to loopback when the reverse proxy runs on the same host by changing the Compose port mapping to `127.0.0.1:${HOST_PORT:-3000}:3000`. Restrict network access with host firewall rules. Configure TLS at the proxy; the container itself serves plain HTTP.
- A token-signing secret is stored in the protected SQLite settings table unless `CODEDARPAN_TOKEN_SECRET` is supplied via runtime secrets. Protect the database volume and back-ups. Do not add credentials to the Dockerfile, image, source control, or command-line arguments. If deployment later requires API tokens or proxy credentials, inject them at runtime via a protected secrets manager or Docker secrets, restrict their access, and rotate them. The current public GitHub repository lookups are unauthenticated and are subject to GitHub's anonymous API rate limits.
- Submitted source archives and persisted analysis payloads may contain proprietary source code. Protect the Docker host, volume, backups, and logs accordingly; encrypt storage/backups and define a suitable retention period. Persistent SQLite data is not automatically encrypted.
- The browser-facing gateway forwards all `/api/` traffic to Express. Keep both internal processes inside this container/network boundary; do not publish backend port `3001` separately.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST_PORT` | `3000` | Host-side published port (Compose interpolation). |
| `CODEDARPAN_RETENTION_DAYS` | `7` | Age in days after which stored analyses are removed at backend startup. |
| `CODEDARPAN_REQUIRE_AUTH` | `true` in Compose | Require account bearer token for all analysis endpoints. |
| `GITHUB_TOKEN` | unset | Optional least-privilege token for authenticated GitHub API requests; inject as a runtime secret and never commit it. |

`CODEDARPAN_DB_PATH`, container `PORT`, and internal `BACKEND_PORT` are set by Compose to `/data/codedarpan.sqlite`, `3000`, and `3001`. Keep the database path under the mounted `/data` directory to preserve it across container recreation.

## Rebuild and inspect

```sh
docker compose -f compose.yaml build --no-cache
docker compose -f compose.yaml up -d
docker compose -f compose.yaml ps
docker inspect --format '{{json .State.Health}}' "$(docker compose -f compose.yaml ps -q codedarpan)"
```

A Compose `restart` does not delete the named volume. Use `docker compose -f compose.yaml down -v` only when intentionally deleting all saved analysis data.
