# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
RUN corepack enable
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --frozen-lockfile
COPY backend backend
COPY frontend frontend
RUN pnpm --filter @codedarpan/backend build && pnpm --filter @codedarpan/frontend build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000 BACKEND_PORT=3001 CODEDARPAN_DB_PATH=/data/codedarpan.sqlite CODEDARPAN_RETENTION_DAYS=7 CODEDARPAN_REQUIRE_AUTH=true
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home-dir /app app && mkdir -p /data && chown app:app /data
# Keeping the pnpm virtual store intact preserves better-sqlite3's native binding symlinks.
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/backend/package.json ./backend/package.json
COPY --from=build --chown=app:app /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=app:app /app/backend/dist ./backend/dist
COPY --from=build --chown=app:app /app/frontend/dist ./frontend/dist
COPY --chown=app:app deploy/entrypoint.mjs ./deploy/entrypoint.mjs
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
USER app
CMD ["node", "/app/deploy/entrypoint.mjs"]
