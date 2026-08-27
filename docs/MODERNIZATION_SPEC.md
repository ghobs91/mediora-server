# Mediora/Bobarr Modernization Specification

This document is the handoff specification for continuing the repository overhaul in a later session. It records the target state, completed work, constraints, decisions, verification commands, and remaining milestones.

## 1. Product Intent

Mediora/Bobarr is a self-hosted Docker media manager for movies and TV shows. It searches TMDB for metadata, searches configured Jackett indexers for torrents, downloads through Transmission, optionally routes torrent traffic through OpenVPN or WireGuard, and organizes completed media under a mounted library.

The primary user is a homelab or self-hosting user who wants one simpler interface instead of configuring Sonarr/Radarr, Jackett, Transmission, and a VPN independently.

Core product values:

- One setup flow for metadata, indexers, downloads, and library organization.
- Search and manage movies and TV shows in one UI.
- Prefer configured tags and qualities when selecting releases.
- Keep the system usable as a Docker Compose deployment.

## 2. Current Architecture

### API

- Location: `packages/api`
- NestJS 7, GraphQL/Apollo Server 2, TypeORM 0.2, PostgreSQL, Bull 3, Redis, Winston.
- Entry point: `packages/api/src/main.ts`.
- GraphQL schema: generated at `packages/api/schema.gql`.
- Modules include library, jobs, TMDB, OMDb, Jackett, Transmission, Redis, health, image cache, params, and setup/auth.
- Background processors live under `packages/api/src/modules/jobs/processors`.
- Database entities and DAOs live under `packages/api/src/entities`.

### Web

- Location: `packages/web`
- Next.js 15 pages router, React 19, TypeScript 5, Apollo Client, Tailwind CSS v4, Radix UI, lucide-react, dnd-kit, Embla.
- Pages live under `packages/web/pages`.
- Shared primitives live under `packages/web/components/ui`.
- Global design tokens live under `packages/web/styles/globals.css`.
- GraphQL generated client code is `packages/web/utils/graphql.tsx`.
- UI is dark-first with a coral primary accent.

### Runtime

- `docker-compose.yml` builds local API and web images.
- API and web images use Node 22.
- PostgreSQL remains `postgres:12-alpine` to avoid an unsafe data-directory major-version change.
- Redis uses `redis:7-alpine` with `--requirepass`.
- Jackett, FlareSolverr, Transmission, and the optional VPN services remain Compose services.
- The API is directly reachable by the browser at port 4000, so it must not be bound only to loopback without adding a reverse proxy.

## 3. Completed Work

The following commits are already on `master`:

| Commit | Result |
|---|---|
| `919d5f3` | Patched image-cache traversal, removed boot-time TMDB debug call, fixed sanitize regex. |
| `19bd4ee` | Replaced legacy web UI with Next 15, React 19, Tailwind v4, Radix, lucide, dnd-kit, and Embla. |
| `f7e27a9` | Updated CI/web Docker support and ignored TypeScript build caches. |
| `7876b4a` | Updated axios/lodash/codegen dependencies and removed direct vulnerable dependency paths. |
| `73ac4cf` | Added Jest/Vitest, extracted torrent ranking logic, and added unit/property tests. |
| `f171b41` | Added zod env validation, generated TypeORM baseline migration, and disabled `synchronize`. |
| `6158d13` | Replaced legacy ESLint config with ESLint 9 flat config. |
| `04dd232` | Added JWT auth, login page, protected GraphQL/jobs, and security workflow. |
| `72cf54f` | Fixed auth test linting. |
| `b4dafbd` | Replaced deleted Redis image tag, made Compose build local images, and updated Node runtime handling. |
| `51a1bc9` | Upgraded the API runtime and framework integrations to Nest 11, GraphQL/Apollo, BullMQ, and TypeORM 0.3. |
| `a8cbcf1` | Migrated API modules, DAOs, transactions, processors, and health checks to the upgraded integrations. |

### Verification baseline

Run from the repository root:

```sh
yarn lint
(cd packages/api && yarn build && yarn test:cov)
(cd packages/web && yarn typecheck && yarn test && yarn build)
docker compose config --quiet
docker compose build api web
```

Expected current results:

- Root lint passes.
- API build passes.
- API has 42 passing tests and coverage above configured thresholds.
- Web has 12 passing tests, typecheck passes, and all pages build.
- Local API/web images build successfully.

## 4. First-Launch Setup Wizard Specification

### Goal

On a fresh deployment, users should land in a guided setup wizard instead of an unusable settings page or a partially configured dashboard.

### Required inputs

The wizard collects:

1. Admin password, minimum 8 characters, confirmed twice.
2. TMDB API key.
3. Jackett API key.
4. Region.
5. Metadata language.
6. Completed-download organization strategy: link, copy, or move.

The wizard also explains that library mount paths and VPN configuration are Docker-level settings and cannot be safely changed from the browser.

### API contract

- `GET /setup/status` is public and returns setup state plus booleans for configured TMDB, Jackett, and password values.
- `POST /setup/complete` is public only while setup is incomplete.
- Setup completion validates input with zod, stores application settings in the existing `parameter` table, hashes the password with salted Node `scrypt`, writes `setup_completed=true`, and returns a JWT plus an httpOnly cookie.
- The `SetupGuard` blocks protected GraphQL routes until setup is complete.
- `/health`, `/auth/login`, `/image-cache`, and `/setup/*` are public.
- `/jobs` is guarded separately because Bull Board is mounted as raw Express middleware.

### Persistence and compatibility

- `ParameterKey.SETUP_COMPLETED` and `ParameterKey.AUTH_PASSWORD_HASH` are internal parameter keys.
- Existing installations with non-empty TMDB and Jackett keys are treated as legacy-configured and are not forced through the wizard.
- The environment `APP_PASSWORD` remains a bootstrap fallback. A completed wizard password takes precedence through the database hash.
- The committed `.env` remains the install script's default template. Users must change `APP_PASSWORD`, `JWT_SECRET`, database, and Redis defaults for exposed deployments.

### Web behavior

- `SetupGate` calls `/setup/status` before rendering the rest of the app.
- Fresh installations redirect all non-setup pages to `/setup`.
- Configured installations redirect `/setup` to `/login` or `/search` if a token exists.
- The wizard is a three-step dark-first page at `/setup`.
- Completion stores the returned token and redirects to `/search`.

### Known follow-up

The current wizard validates presence and shape of TMDB/Jackett keys but does not yet perform live service validation. Add a separate `POST /setup/test-connections` only after defining safe timeout, error, and SSRF rules for the service URLs.

## 5. Remaining Modernization Plan

### M5: Upgrade the API framework

Priority: P0. Effort: XL.

1. Upgrade NestJS through supported major versions rather than jumping blindly.
2. Replace Apollo Server 2 and old `@nestjs/graphql` integration with the supported Nest GraphQL adapter.
3. Replace Bull 3 and `bull-board` with BullMQ and the current Bull Board adapters.
4. Upgrade TypeORM 0.2 to 0.3, including `findOne` and DataSource API changes.
5. Resolve the Nest 7 `@Inject` typing incompatibility that appears under strict TypeScript 5.
6. Move API Dockerfile fully to the modern runtime after the framework upgrade.
7. Re-run the dependency audit; the current API audit has legacy transitive findings that cannot be fully remediated before this milestone.

Exit criteria:

- API builds and starts on Node 22.
- Existing migration history remains usable.
- GraphQL schema changes are additive or documented with a migration path.
- Background jobs and health checks work against the Compose stack.
- API audit has no unresolved critical findings without an explicit exception.

### M6: API structure and reliability

Priority: P1. Effort: L.

- Split the 744-line `LibraryService` into query, download, and organization services. **Completed:** `LibraryQueryService`, `LibraryDownloadService`, and `LibraryOrganizationService` now own those responsibilities while preserving the GraphQL and job APIs.
- Add explicit state-transition helpers for media lifecycle states.
- Add bounded concurrency to library scanning and Jackett fan-out. **Completed:** scan job enqueueing is limited by `LIBRARY_SCAN_CONCURRENCY` (default 4), and indexer requests by `JACKETT_SEARCH_CONCURRENCY` (default 3), while retaining per-search timeouts.
- Add composite indexes for frequent state/resource-type queries.
- Replace shell execution through `child-command` with validated `spawn` argument arrays.
- Add structured job failure persistence and retry visibility.

### M7 follow-up: Security hardening

Priority: P0. Effort: M.

- Replace default secrets in deployment instructions with generated values.
- Add a documented secret rotation process.
- Restrict CORS from `origin: true` to configured web origins once deployment topology is defined.
- Add rate limiting to login and setup completion.
- Add request body validation DTOs or zod pipes for all public endpoints.
- Add GraphQL depth/complexity limits.
- Ensure auth failures and setup attempts are logged without logging credentials or tokens.
- Replace public image-cache SVG support with a safe raster-only policy unless SVG sanitization is added.

### M8: Observability and performance

Priority: P1. Effort: M.

- Add API request latency, queue depth, job failure, and database timing metrics.
- Profile `getDownloading`, library scans, Jackett searches, and organization jobs.
- Batch Transmission RPC calls.
- Use concurrent but bounded Jackett indexer requests.
- Benchmark with 200, 1,000, and 10,000 tracked media records.
- Set p95 targets before implementing optimizations.

### M9: Product features

Priority order:

1. TV monitoring loop for newly aired episodes.
2. Failure notifications through webhook/Discord/Telegram adapters.
3. Release blacklist and retry history.
4. Quality upgrade cycle.

Each feature needs an integration test, a migration if schema changes, a failure-state design, and a UI path.

### M10: UI polish and productization

The broad styling migration is complete. Remaining UI work is a visual QA pass against the live stack:

- Check desktop and mobile navigation.
- Check setup/login redirect behavior with a fresh database.
- Check empty, loading, error, and long-title states.
- Check keyboard navigation and dialog focus trapping.
- Add responsive navigation for narrow screens; the current navbar is desktop-oriented.
- Add a persisted theme toggle only if light mode becomes a product requirement.
- Remove remaining browser warnings and improve accessibility labels.

## 6. Required Decisions Before Large Changes

1. Keep TypeORM or switch ORM during M5. Staying on TypeORM minimizes migration risk.
2. Keep GraphQL private to the bundled web app or support external API consumers. Public consumers require schema deprecation/versioning policy.
3. Define deployment origin(s) before tightening CORS.
4. Decide whether Docker images should remain local-build-only or be published under the fork's own registry namespace.
5. Decide whether legacy `.env` defaults remain part of the curl installer or the installer generates secrets interactively.

## 7. Session Handoff Procedure

At the start of a future session:

```sh
```

Do not touch these existing local changes without confirmation:

- `packages/transmission/config/settings.json` is deployment/runtime state.
- `.serena/` is local agent metadata and should not be committed.

Before committing:

```sh
(cd packages/api && yarn build && yarn test:cov)
(cd packages/web && yarn typecheck && yarn test && yarn build)
```

Commit each completed phase with a Conventional Commit message. Stage explicit paths and inspect the staged diff. Push only after checking the remote and branch.

## 8. Definition Of Done

A modernization phase is complete only when:

- Its behavior is implemented and documented here.
- Relevant tests exist and pass.
- Root lint and affected package builds pass.
- Migration and rollback implications are known.
- Docker behavior is verified when runtime/configuration changes are involved.
- No secrets, generated caches, or user-owned runtime files are committed.
- A cohesive commit exists and has been pushed if requested.
