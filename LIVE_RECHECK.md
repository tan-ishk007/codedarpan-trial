# CodeDarpan live website recheck

**Review date:** 2026-10-28  
**Website:** https://codedarpan-trial.onrender.com/

## Live observations

- `GET /api/health` returned HTTP 200 with JSON status `ok` and service name `CodeDarpan analyzer`. This confirms that the API process responds; it does not prove that a repository submission, authentication, or an external GitHub request will succeed.
- Direct browser visits to `/workspace`, `/privacy`, and `/terms` rendered the expected client-side pages. The workspace without a run ID showed an explicit no-analysis-selected/unavailable state.
- A public GitHub repository submission from the homepage reached the analyzer but was rejected with `Authentication required. Sign in to access analyses.` No account was created during this review. A live GitHub analysis was therefore not completed, and ZIP intake was not submitted because it is subject to the same authentication requirement.
- The live homepage showed a static `Live analyzer connected` footer label. The project source now replaces it with a shared status component backed by `GET /api/health`; that source change has not been deployed to the public website.

## Changes made in this project

- Added a validated frontend client for `GET /api/health` and a shared, accessible status indicator with checking, connected, and unavailable/error states, a five-second timeout, and periodic refresh. The homepage, workspace, privacy, and terms views use the same endpoint.
- Clarified that API liveness is distinct from authentication and analysis success. Documented the health route and its limits.
- Added backend health endpoint coverage and integration tests for malformed GitHub URLs, ZIPs without supported source files, and expanded ZIP entries above the per-file limit.
- Updated the benchmark report with a sampled analyzer-process RSS measurement and explicit caveats.

## Local verification

The final local run passed **22 backend tests** and **32 frontend tests**, both TypeScript typechecks, and both production builds. Tests used an isolated temporary SQLite database so the archived database was not used.

A synthetic 500-file TypeScript run with five imports per file indexed 500 files and returned 1,000 graph nodes and 2,500 import edges. Server analysis took 364 ms; ZIP upload through the analysis response took 517 ms; graph fetch took 15 ms; total through graph fetch took 539 ms. The analyzer process peak RSS was sampled at 180.6 MiB from `/proc` every 10 ms. This meets the under-five-second parsing target for this synthetic run only. A sustained 60 FPS browser-rendering result was not measured, so that target remains unverified.

## Remaining before public sign-off

- Complete signed-in GitHub and ZIP end-to-end analysis. This needs an authorized sign-in or permission to create a test account; the live deployment is configured to require authentication.
- Deploy the updated source before expecting the public website's status indicators to change.
- The privacy and terms pages remain review drafts. Operator identity, contact, actual data handling, retention/deletion, jurisdiction, and qualified legal review are still required before launch.
- Container image publication and production monitoring remain unverified; no hosting or Docker deployment was performed as part of this source review.


The built application was also smoke-tested in a browser through the local same-origin gateway: the homepage showed `Analyzer API connected`; direct `/workspace`, `/privacy`, and `/terms` visits rendered correctly and showed the same health result. In the empty workspace, `STATUS UNAVAILABLE` for the missing analysis remained separate from `Analyzer API connected`, as intended.
