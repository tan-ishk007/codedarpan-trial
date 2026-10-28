# Cytoscape browser benchmark

This is an isolated browser harness; it does not modify application code, add packages, or participate in the frontend build. It uses the frontend's installed Cytoscape.js dependency.

## Run

From the repository root, start the existing Vite dev server with `pnpm --filter @codedarpan/frontend dev`, then open `http://localhost:3000/scripts/graph-benchmark.html`. Use **Rebuild graph** to repeat graph creation. The page generates deterministic 600-node and 3,000-edge data, reports browser user-agent and viewport, and displays elapsed time through Cytoscape's first `render` event when available. If no render event is reported in three seconds it explicitly reports setup duration separately, not as render time.

Use the pan, zoom, and selection buttons for repeatable action-call elapsed timings; direct drag/wheel/click interaction is also available. The **Sample 3s frame rate** control records requestAnimationFrame callback cadence while inducing small pans; this is not paint-complete latency or a guaranteed displayed FPS. Browser, operating system, hardware, viewport, device pixel ratio, and load should be recorded alongside results for comparison. Export/copy the JSON shown on the page for a run record.

## Recorded run

- **Environment:** sandbox browser (Chrome 156.0.0.0, Linux x86_64); viewport 1280 × 1100 CSS px; device pixel ratio 1.0.
- **Dataset:** 600 nodes and 3,000 edges.
- **Elapsed to first Cytoscape `render` event:** 827.7 ms.
- **Pan action call (`panBy`):** 0.3 ms.
- **Zoom action call (`zoomTo`):** 1.1 ms.
- **Select first 100 nodes:** 5.0 ms.

A separate headless Chrome 156 run in this sandbox rendered the same graph in **960.5 ms** at 780 × 493 CSS px, DPR 1. The virtual-time headless run did not return a valid sustained frame-cadence sample; that control remains available for a normal browser run. Do not infer FPS or deployment performance from render setup alone.

These are single-run measurements, not a statistical benchmark. The interaction values are synchronous API-call elapsed times, not paint-complete latency. Hardware model, load, OS build, and browser rendering backend were not independently captured; results should not be generalized to other environments.
