# CodeDarpan Project TODO

## 1. Landing, repository intake and sample entry
- [x] Build `/` with the supplied CodeDarpan identity, a GitHub repository URL field and optional ref, a ZIP upload/drop zone, capability navigation, an Ingest → Parse → Resolve → Explore flow, supplied technical atlas artwork, and a compact footer.
- [x] Submit GitHub URLs to documented `POST /api/analyses` as JSON `{ repositoryUrl, ref? }`; submit ZIP files to the same route using multipart field `file`. Validate obvious URL and `.zip`-suffix issues in the browser; do not claim client-side validation replaces backend ZIP safety/size checks.
- [x] Show honest validating/upload/queued/running/stage/ready/failed/rate-limit/invalid-input/network/API-unavailable outcomes using returned server state/messages where available. Never invent a percentage, result or progress stage, and never silently open demo data after a live failure.
- [x] Open the local sample fixture only from the explicit **Explore sample atlas** action. Keep a persistent **DEMO DATA** label on every sample workspace view and state that its evidence is illustrative.

## 2. Workspace, graph, source and coordinated navigation
- [x] Build `/workspace` with returned repository/revision/status and summary only, global file/function/symbol search, Explore/Diagnose/Onboard/Impact modes, a file tree, a real interactive Cytoscape graph, relationship legend/filters, graph fit/reset/depth controls, and a selected-entity source/evidence inspector.
- [x] Keep file-tree, graph, search, source and mode navigation synchronized. Support keyboard selection, graph pan/zoom/select/hover, one stable layout, empty/loading/error/partial/large-graph states, and search-result centering/highlighting.
- [x] Use relationship arrows and styles in addition to color: imports point importer → dependency; calls point caller → callee; import/call edges have distinct solid/dashed/dotted paths; impact follows reverse relationships. Do not substitute a static graph image for Cytoscape.
- [x] Show only returned source and facts: repository-relative path, entity kind/language, source range/line numbers, token count and counting convention only when supplied, LOC/complexity only when supported, returned imports/dependents, confidence, parser warnings and unsupported/missing-source states. Do not fabricate live source snippets or metrics.

## 3. Evidence-backed diagnosis, onboarding and impact
- [x] Diagnose uses only documented `GET /api/analyses/:runId/health` response data, including score/confidence/factors/findings/history availability when present. Explain available factor definitions, cycles/hotspot evidence and churn × complexity only when returned. If history is unavailable, say so using the actual backend wording where provided; never infer zero churn.
- [x] Onboarding uses only ordered contributor steps returned by `GET /api/analyses/:runId/onboarding?role=...&issueUrl=...`, with evidence-based reasons and clickable file/module links. Public issues appear only when available through documented `GET /api/analyses/:runId/issues?labels=good-first-issue,help-wanted`; report issue failure/no relevant issue clearly.
- [x] Selected-file impact uses documented `GET /api/analyses/:runId/impact?nodeId=...&depth=3`; public PR impact uses documented `POST /api/analyses/:runId/pr-impact` with `{ prUrl }`. Show only returned changed files, mapped nodes, direct/transitive dependents, related tests, unresolved relationships and caveats; clicks focus graph/source. Describe results as structural blast-radius estimates, not predictions of all runtime failures.
- [x] For private/malformed/unavailable/different-repository/rate-limited/partial responses, state the limitation; unsupported/missing response shapes are errors/unavailable states rather than invented UI content.

## 4. Design, accessibility, responsive behavior and pages
- [x] Follow the supplied Astral Cartographer direction and exact palette: parchment `#F2EBDD`, ink `#1D1A18`, oxblood `#8F3030`, brass `#AF8C57`, sage `#7C8980`, paper `#FAF7F0`, border `#D8CCB7`, muted `#6E6961`. Use Instrument Serif, DM Sans and IBM Plex Mono; reuse supplied glyph and relevant supplied artwork.
- [x] Replace the four `/` capability-card illustrations with separate, coordinated light-mode, softly lit isometric 3D-style scenes on parchment/paper backgrounds. Make Explore, Diagnose, Onboard and Impact visually distinct; avoid black backgrounds and neon glow; retain meaningful alternative text; keep these conceptual images separate from the interactive live graph.
- [x] Use restrained cartographic lines and brass rules around real evidence; square-corner controls; no purple/neon, generic dashboard cards, fake metrics/reviews, AI badges, emoji icons, pill buttons or excessive motion. Keep graph edge cues non-color-dependent; honor reduced motion and meaningful image alt text.
- [x] Make inputs, file upload, tabs, menus, graph controls and search keyboard-accessible, with visible focus, readable contrast and useful accessible labels. Below 900px, use selectable Files/Atlas/Details panel tabs instead of compressed columns; prevent clipped controls and text.
- [x] Add unique title/description metadata, branded 404, privacy and terms review drafts, favicon, Open Graph artwork, robots, sitemap, web manifest, and `GET /manus-routes.json` for `/`, `/workspace`, `/privacy`, `/terms` only. Do not invent the public domain, operator/contact, jurisdiction, backend retention/processing policy or legal guarantees; state the unresolved items and requirement for qualified legal review. Canonical links and `sitemap.xml` are generated only when the owner configures a real HTTPS public origin; neither contains a placeholder domain.

## 5. Full-stack architecture and delivery
- [x] Preserve the modular React + TypeScript + Vite frontend, same-origin API client, typed response validation, explicitly labeled sample data, and visible live API failures.
- [x] Add a TypeScript/Express analyzer with JS/JSX/TS/TSX Babel parsing, ZIP/public-GitHub intake, normalized import/call graph, SQLite persistence with expiry, source/search/health/onboarding/issue/impact/PR routes, and documented limitations.
- [x] Add integration tests for real ZIP analysis, graph/source/metrics, ZIP traversal rejection and SQLite process-restart restoration; run all tests, typechecks and production builds. Add a reproducible 500-file/2,500-edge benchmark; reported timings do not include browser graph rendering.
- [x] Add signed account sessions and owner-scoped analyses, bounded GitHub churn/history evidence, role-/issue-specific onboarding routes, function-level lexical call resolution, a containerized same-origin deployment, and a reproducible browser graph benchmark harness.
- [ ] Build/publish the image and complete production monitoring, owner privacy/legal review and real-domain configuration. Docker/Podman and a hosting account/domain are unavailable in this environment; do not treat local gateway smoke tests as a deployed production launch.

## External prerequisites before a public live launch
- The API/analyzer, account-scoped access and single-origin gateway run locally. Container build/publish remains unverified; public deployment still requires infrastructure and a durable encrypted volume.
- The owner must supply the real HTTPS public origin before canonical URLs and a production sitemap can be emitted.
- Operator/contact, actual data flows, processing/retention/deletion, jurisdiction and any third-party disclosures remain unresolved; privacy/terms are review drafts and require qualified legal review before launch.
- Site-level analytics and Manus badge scripts are disabled. Other provider, platform or CDN measurement outside these settings may still exist; this project does not claim that all tracking has stopped.

## 6. Motion polish — deferred by the final checklist
- [x] Keep the existing 3D/isometric hero artwork conceptual and static, with all headline and intake copy as real HTML; it does not represent live repository data or replace the interactive graph.
- [ ] Defer scroll-linked reveals and choreographed motion until the core interactive graph, source synchronization and required acceptance tests are verified. Any later motion must remain optional, respect `prefers-reduced-motion`, avoid scroll hijacking, and never animate invented progress or repository evidence.
