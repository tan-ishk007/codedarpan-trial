# CodeDarpan local benchmark report

**Run:** 2026-10-28 (UTC) · **Runtime:** Node.js v22.23.4 · **Host exposed to process:** 6 vCPUs, Intel Xeon Processor @ 2.50 GHz, 23 GiB total memory · **Dataset:** deterministic ZIP with 500 TypeScript files, 5 relative imports per file, 2,500 expected import edges, 133,290 compressed bytes.

The API ran locally at `http://127.0.0.1:3001`. Three consecutive warm runs returned exactly 500 indexed files/nodes and 2,500 edges. Medians (min–max) were:

| Measurement | Median | Range |
| --- | ---: | ---: |
| Server analysis (parse/index/resolve/metrics) | 225 ms | 215–242 ms |
| ZIP upload through analysis response | 321 ms | 295–344 ms |
| Fetch normalized graph payload | 14 ms | 13–16 ms |
| Total through graph fetch | 339 ms | 315–362 ms |

This is a local synthetic benchmark with warm processes and does not establish cold-start, real repository, network download, peak-memory or browser-rendering performance. In particular, no FPS/60 FPS claim is made. To reproduce, start `pnpm dev` and run `node backend/scripts/benchmark.mjs`; configure `BENCH_FILES` and `BENCH_FANOUT` for a different deterministic dataset. The script prints exact counters and per-run timings. Timing boundaries are defined in the script; ZIP upload+analysis response includes local HTTP upload, extraction and analysis work, while server analysis is measured from source ingestion through AST/graph metric construction.
