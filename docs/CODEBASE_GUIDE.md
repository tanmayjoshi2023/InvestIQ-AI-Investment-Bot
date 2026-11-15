# InvestIQ Codebase Guide

**Audit date:** 2026-11-15. This guide describes the current repository, not a proposed redesign. Environment variable names are listed without values.

## Repository Map

```text
app/
  actions/                 Server actions for company and analysis persistence
  analysis/[id]/           Authenticated analysis detail page
  analyze/[ticker]/        Starts a new analysis page
  api/
    analysis/compare/      Authenticated two-company analysis
    analysis/stream/       Authenticated SSE analysis endpoint
    auth/[...all]/         Better Auth handler wrapper
    health/                DB/cache/LLM configuration health response
    search/companies/      Local company autocomplete API
    support/               Authenticated support submission API
  compare/                 Comparison page and client
  pricing/                 Static plan cards
  research/                Static product workflow/features page
  sign-in/, sign-up/       Better Auth forms
  support/                 Support UI
  page.tsx                 Landing page or authenticated dashboard
  layout.tsx, globals.css, sitemap.ts, not-found.tsx
components/
  agent-progress-bar.tsx, thought-stream.tsx, streaming-analysis.tsx
  analyze-form.tsx, company-search*.tsx, analysis-list.tsx
  analysis-detail*.tsx, verdict-card.tsx, debate-view.tsx
  metrics-grid.tsx, risk-matrix.tsx, reasoning-list.tsx
  explainability-panel.tsx, disclaimer.tsx, theme-selector.tsx
  dashboard-header.tsx, auth-form.tsx, ui/*
lib/
  agent/                   Active LangGraph pipeline
    graph.ts, runner.ts, state.ts, types.ts, scoring.ts, llm.ts
    nodes/{planner,financial,news,competitor,scoring,bull,bear,judge,verifier}.ts
    prompts/index.ts, schemas/index.ts, tools/*, event-bus.ts
    debate-graph.ts         Standalone debate graph; no call site found
  agents/orchestrator.ts    Compatibility re-export of active runner/graph
  services/analysis-service.ts Thin wrapper; imported but unused by stream route
  db/{index,schema,health,migrate,connection-cache.js}
  security/sanitize.ts
  auth.ts, auth-client.ts, auth-helpers.ts
  cache.ts, quota.ts, rate-limit.ts, company-data.ts
  report-export.ts, design-tokens.ts, utils.ts
scripts/verify-e2e.js       Script name suggests E2E but is not a configured test suite
 tests/                    Two Node test files; five local tests total
 data/                      Two DOCX reference documents, no application import found
 public/                    Icons, placeholders, robots.txt
 docs/                      This audit's six handover documents
```

Root also has package/config files, generated tree/text snapshots, `README.md`, and `test-all.js`. No deployment manifest, CI workflow, Playwright/Cypress/Vitest/Jest config, or migration directory was found in the inspected workspace. `project-tree*.txt` and other root text snapshots should not be treated as authoritative because they can be stale.

## Runtime Entry Points

| Path | Purpose | Important calls/dependencies |
|---|---|---|
| `app/page.tsx` | Landing page or signed-in dashboard | `getSession`, `CompanySearchBar`, `AnalysisList` |
| `app/analyze/[ticker]/page.tsx` | Company pre-analysis page | `getSession`, local `companies` lookup, `AnalyzeForm` |
| `components/analyze-form.tsx` | Creates company and pending analysis | `createOrUpdateCompany`, `createAnalysis`, then router push |
| `app/analysis/[id]/page.tsx` | Loads and displays existing analysis | `getAnalysisWithAgents`, `getCompany`, streaming or detail view |
| `components/streaming-analysis.tsx` | Reads SSE and renders progress/results/exports | `POST /api/analysis/stream` |
| `app/api/analysis/stream/route.ts` | Starts stream and persists final result | `streamAnalysis`, Better Auth session, rate limit, Drizzle actions |
| `app/api/analysis/compare/route.ts` | Runs two graphs concurrently | `runAnalysis` twice, `Promise.allSettled` |
| `lib/agent/graph.ts` | Active graph topology | `StateGraph`, nine nodes |
| `lib/agent/runner.ts` | Invoke/stream and map graph state to UI state | `getResearchGraph`, `AsyncQueue`, `stateToOrchestratorResult` |
| `app/actions/analyses.ts` | User-scoped CRUD and transactional persistence | Drizzle, quota helpers, Better Auth user id |
| `app/actions/companies.ts` | User-scoped company upsert and lookup | Drizzle, sanitizers, unique `(userId,ticker)` |

## API Routes

| Method/path | Authentication | Behavior and caveats |
|---|---|---|
| `GET /api/search/companies?q=` | Public | Searches a fixed local list; response claims `cacheHit: false` and sends a public cache header. No provider search here. |
| `POST /api/analysis/stream` | Session required | Rate-limited in process; returns SSE. Request body has no full Zod schema. A supplied `analysisId` changes quota/status handling. Errors are emitted but DB status is not set to failed. |
| `POST /api/analysis/compare` | Session required | Runs two analyses. Per-process rate limit. Persistence is best-effort; result response can report top-level success while one/both analyses fail. Comparison persistence skips usage increment. |
| `GET /api/auth/[...all]` | Better Auth | Refuses when DB probe fails, then forwards to Better Auth. |
| `POST /api/auth/[...all]` | Better Auth | Same DB gate then Better Auth handler. |
| `GET /api/health` | Public | Checks PostgreSQL; Redis and LLM are reported as configured/disabled, not actively pinged. Database error text and pool counts are returned. |
| `POST /api/support` | Session required | Validates nonempty fields, inserts `feedback`, sends SMTP email. No route rate limit or robust field-size/schema checks. |

No dedicated export API exists; file generation is client-side in `lib/report-export.ts`.

## Database Models

Defined in `lib/db/schema.ts` using PostgreSQL/Drizzle:

| Model/table | Role | Current workflow status |
|---|---|---|
| `user`, `session`, `account`, `verification` | Better Auth identities, sessions, accounts | Active auth schema |
| `companies` | Per-user ticker/company metadata | Active; one user-specific row per ticker |
| `analyses` | Status, verdict, score fields, summary, sources and graph output | Active; user scoped in application reads/writes |
| `agent_executions` | Agent output, sources, timings, prompt/cost/token fields | Active for output and timing; prompt, token usage and cost are persisted as null |
| `sources` | Intended source records | No insert path found; citations instead live in analysis JSON |
| `subscriptions` | Plan name and monthly use count | Active but only free/non-free rough rules; no payment synchronization |
| `feedback` | Ratings/support records | Support route uses it; rating collection path not found |
| `portfolios`, `holdings`, `watchlists`, `watchlist_items`, `backtests`, `api_usage` | Future product models | Schema-only; no complete user workflows found |

Indexes exist for common ownership and FK lookups. FK cascades are present for user/analysis relationships. No migration files were found under `lib/db/migrations`, while `drizzle.config.ts` and `runMigrations()` refer to that folder. Existing database migrations and backup/recovery were not verified.

## Agent Source Map

| File | Responsibility and output |
|---|---|
| `lib/agent/state.ts` | LangGraph annotations, append reducers, state types/defaults |
| `lib/agent/graph.ts` | planner -> parallel research -> scoring -> parallel bull/bear -> judge -> verifier |
| `lib/agent/runner.ts` | `runAnalysis`, `streamAnalysis`, UI result mapping |
| `lib/agent/nodes/planner.ts` | resolve input, LLM/fallback research plan and queries |
| `lib/agent/nodes/financial.ts` | fundamentals/SEC retrieval, citations, data quality assignment |
| `lib/agent/nodes/news.ts` | web search, keyword sentiment, article citations |
| `lib/agent/nodes/competitor.ts` | ticker-derived scores and generic competitor records |
| `lib/agent/nodes/scoring.ts` | deterministic dimension/composite scores and explainability |
| `lib/agent/nodes/bull.ts`, `bear.ts` | LLM/fallback arguments with source indexes |
| `lib/agent/nodes/judge.ts` | LLM/fallback verdict; deterministic score/risk/quality BUY gate |
| `lib/agent/nodes/verifier.ts` | source-index ratio and final confidence adjustment; no semantic verification |
| `lib/agent/nodes/helpers.ts` | agent output and context construction |
| `lib/agent/llm.ts` | model ID, token budgets, 20-second timeout, retries, fallback |
| `lib/agent/prompts/index.ts` | prompts for planner/bull/bear/judge and unused-looking news/competitor/verifier prompts |
| `lib/agent/schemas/index.ts` | Zod output schemas; source index accepts zero as uncited sentinel |
| `lib/agent/tools/getFinancials.ts` | Alpha Vantage then Yahoo Finance ratio extraction |
| `lib/agent/tools/getSECFilings.ts` | SEC EDGAR filing search metadata |
| `lib/agent/tools/webSearch.ts` | Tavily then Google News RSS fallback |
| `lib/agent/tools/getSentiment.ts` | keyword lexicon and recency/relevance score |
| `lib/agent/tools/resolveTicker.ts` | local lookup, Yahoo, Alpha Vantage, LLM, ticker-pattern fallback |
| `lib/agent/tools/http.ts` | fetch timeout and 10-minute process-local TTL cache |
| `lib/agent/event-bus.ts` | process-local async queue and progress events |
| `lib/agent/debate-graph.ts` | standalone bull/bear/judge subgraph; no caller found |
| `lib/agents/orchestrator.ts` | re-exports active `lib/agent` runner, not a separate pipeline |

## Installed Technology Inventory

Versions are the installed versions observed in `npm ls --depth=0` on the audit workspace. The package manifest may use a range rather than a fixed version.

| Technology/package | Version | Actual usage | Essential? / caveat |
|---|---:|---|---|
| Node.js | 24.19.0 observed in test output | Runtime/toolchain | Yes; deployment runtime compatibility still needs pinning |
| TypeScript | 5.7.3 | Application language and type-check | Yes; relatively behind the newest toolchain, but upgrade is separate |
| Next.js | 16.2.6 | App Router, server actions, API routes, SSR | Yes; npm audit reports critical advisories affecting this package range |
| React / React DOM | 19.2.7 | UI | Yes |
| Tailwind CSS / PostCSS | 4.3.1 / 8.5.16 | Styling/build | Yes; PostCSS advisories were reported |
| Base UI React | 1.6.0 | Headless primitives used by UI wrappers | Active |
| Lucide React | 1.22.0 | Icons | Active |
| `ai` | 7.0.4 | `generateObject` structured model call | Active; AI Gateway credential behavior not integration-tested |
| `@langchain/langgraph` | 1.4.7 | StateGraph/Annotation | Active |
| `@langchain/core` | 1.2.1 | Direct dependency | No direct app import found; possibly transitive/future need |
| `@google/genai` | 2.10.0 | Root integration smoke script only | Not used in app analysis path |
| `yahoo-finance2` | 3.15.3 | Quote summary fundamentals | Active; provider API is external/uncontract-tested |
| Alpha Vantage | REST, no SDK | Financial overview and symbol search | Optional API key; field semantics/freshness need verification |
| Tavily | REST, no SDK | Search API | Optional; falls back to Google News RSS |
| Google News RSS | External RSS | Search fallback | Active; parsing is regex-based and content is not article text |
| SEC EDGAR | External HTTPS | Filing search | Active but retrieves filing metadata, not full statement data |
| `pg` | 8.22.0 | PostgreSQL pool | Active |
| Drizzle ORM / Kit | 0.45.2 / 0.31.10 | Schema, queries, migrations tooling | Active; migrations directory absent in workspace |
| Better Auth | 1.6.22 | Auth/session | Active; secret fallback is a release blocker |
| NextAuth | 4.24.14 | Direct dependency | No app use found; audit reports critical advisory path |
| `@upstash/redis` | 1.38.0 | Optional Redis proxy helpers | Only config health check is active; read/write cache functions have no callers found |
| `redis` | 6.0.1 | Direct dependency | No app import found |
| `@vercel/analytics` | 1.6.1 | Production analytics component | Active; no error/trace telemetry |
| `jsPDF` | 4.2.1 | Client-side PDF export | Active |
| `mammoth` | 1.12.0 | Direct dependency | No app import found |
| `uuid` | 14.0.1 | IDs in DB/server actions | Active |
| Zod | 4.4.3 | Agent output and financial validation | Active; audit reports high advisory for versions below 4.6.6 |
| `dotenv` | 17.4.2 | `test-all.js` local env loading | Not part of runtime path |
| shadcn CLI | 4.12.0 | UI setup CLI dependency | Not a runtime component |
| ESLint / Next config | 9.39.5 / 16.2.6 | Lint | Active; full lint has 39 errors/22 warnings |
| `tsx` | 4.23.15 | TypeScript Node tests | Active |

**Alternatives consideration:** retain Next/React and Drizzle unless requirements change. The most useful future architecture changes are not framework swaps: production-safe authentication configuration, robust data adapters with schemas/freshness, a distributed rate limiter/job strategy when scaling, and a test/evaluation harness. Any provider replacement requires licensing, coverage, cost, and data-rights review.

## Technology Trade-offs

Versions and source locations are in the inventory above. Alternatives below are options to evaluate, not automatic recommendations.

| Technology | Why used / advantage in this repo | Disadvantages or evidence-based caveat | Essentiality and alternative to evaluate |
|---|---|---|---|
| Node.js | Runs Next.js, route handlers and scripts; one runtime across server and tooling | Production runtime is not pinned in a runtime manifest; native module/deployment compatibility must be checked | Essential for current stack; pin supported runtime in deployment/CI |
| TypeScript | Types agent state, DB-facing APIs and UI contracts; strict mode catches errors | A few `any` and unchecked casts remain; build can pass while behavioral contracts remain wrong | Essential to current app; continue strict typing rather than switch languages |
| Next.js | Provides App Router, server actions, route handlers, SSR and SSE integration | Framework-specific behavior, serverless lifecycle limits; middleware convention is deprecated; audit flags apply | Essential unless product moves framework; alternatives would add migration cost without fixing evidence issues |
| React | Reusable client/server UI and interaction model | Client state/effect patterns are lint findings; no component tests | Essential with Next; no near-term alternative justified |
| Tailwind CSS / PostCSS | Rapid responsive styling and build integration | Utility-heavy class strings can be hard to audit; PostCSS advisories reported | Active; CSS Modules or another system possible but not needed to address top risks |
| Base UI React | Headless interaction primitives used by UI wrappers | Accessibility still depends on correct usage; no component-level tests found | Helpful, not an architectural requirement; native controls or another maintained headless library are options |
| Lucide React | Consistent icon components | Adds package weight but actively used | Convenience dependency; inline CSS/text/native symbols are not a meaningful system-level replacement |
| AI SDK (`ai`) | Structured generation and Zod integration reduce manual JSON parsing | Provider gateway behavior and credentials are unverified; fallback can hide model failure | Active; could use a provider SDK directly, but that would increase provider coupling |
| LangGraph | Explicit state graph, parallel fan-out/join and streaming updates | Adds abstraction; current graph lacks durable checkpoint/replay and citation-safe reducer design | Active and useful for current workflow; a simpler typed pipeline may suffice if graph branching remains small |
| LangChain core | Listed dependency adjacent to LangGraph | No direct app import found | Not currently essential; confirm transitive/build need before removal |
| Google GenAI SDK | Used by `test-all.js` smoke script | Not used in the active AI SDK pipeline; test script is side-effectful | Not essential to app path; remove only after test strategy is redesigned |
| Gemini model via AI SDK | One model ID for planner/bull/bear/judge; consistent output contract | Single model/provider creates availability, cost, policy and reproducibility concentration; not benchmarked | Provider/model choice is replaceable; evaluate alternatives via fixed dataset and cost/latency measurements |
| Yahoo Finance | Convenient ratio/quote-summary source and ticker search | Provider contract, licensing, freshness and zero semantics are not tested; dependency audit applies | Current fallback source, not a guaranteed data-quality service; evaluate licensed financial-data vendors |
| Alpha Vantage | Optional API key fallback for overview and symbol search | Rate limits/field mapping and coverage unverified; sector mapping bug exists in resolver | Optional; alternative depends on needed markets, licensing and freshness |
| Tavily | Search endpoint can return snippets and relevance values | Optional service/API key, source quality not validated | Optional; evaluate direct licensed/news providers or omit when unavailable |
| Google News RSS | No-key fallback for headline search | Regex parsing, generic content, no full article retrieval or contract guarantee | Resilience fallback only; replace with a stable licensed feed for production research |
| SEC EDGAR | Primary regulator source for filing metadata | Current code searches by ticker and does not parse filing facts/periods | Valuable but current use is narrow; use SEC submissions/company facts with validated CIK mapping if expanding |
| PostgreSQL / `pg` | Relational persistence, transactions, indexes, JSONB | Requires managed DB operations, migrations, backup/TLS configuration | Essential for accounts/history; managed PostgreSQL is appropriate; no reason to replace before correctness work |
| Drizzle ORM / Drizzle Kit | Typed schema and parameterized query builder | Migration directory absent; some transaction parameters cast to `any` | Active; Prisma/SQL are alternatives, but not root-cause fixes |
| Better Auth | Auth/session integration with Next and Drizzle | In-source fallback secret and broad origins need correction; integration behavior not tested | Active; choose one auth library. NextAuth is also installed but unused and should not be treated as a second auth system |
| NextAuth | Present in dependencies and audit tree | No app use found; advisory exposure adds unnecessary maintenance surface | Not essential to observed runtime; remove after lockfile/build verification in approved cleanup |
| Upstash Redis | Serverless-friendly optional REST client | Cache read/write methods have no app caller; health only checks env presence | Not essential for single-instance prototype; useful if distributed cache/limits become a measured requirement |
| `redis` client | Direct package dependency | No app import found | Not essential to observed code; likely removable after dependency audit |
| In-process Maps | Simple short-TTL research cache and sliding-window rate limiter | Per-process only, no cross-instance enforcement, no durable state | Fine for development/single process; use shared Redis/DB-backed controls only when deployment topology requires it |
| Vercel Analytics | Lightweight production page analytics | No error, agent trace, latency or cost monitoring | Optional hosting-specific analytics; retain only if Vercel is the selected host, add separate operational telemetry |
| jsPDF | Client-side PDF generation without server service | Long content/page breaks and citation completeness are untested | Active export dependency; HTML-to-PDF/browser print are alternatives |
| Mammoth | DOCX conversion package present | No application import found; two DOCX files exist under `data/` but no importer path was found | Not essential to the current app workflow; remove only after confirming docs are not used in an external script |
| Zod | Runtime validation for agent outputs and financial metrics | Not all HTTP request bodies have a schema; audit reports high advisory for installed version | Essential to current contract validation; alternatives include Valibot or TypeBox, but consistent use matters more |
| UUID | Generates DB IDs | IDs are opaque but there is no request-level idempotency strategy | Current DB convenience; PostgreSQL-generated UUIDs are an alternative if schema changes are approved |
| ESLint / eslint-config-next | Static lint and React/Next rules | Full repo currently has 39 errors/22 warnings; rule changes alone would conceal debt | Development-only but useful release gate; address findings rather than disabling rules wholesale |
| `tsx` + Node `node:test` | Runs TypeScript unit tests without a large test framework | Only five unit tests and no browser/integration coverage | Adequate starter; Playwright/Vitest are alternatives to add when the test suite needs them |
| shadcn CLI / class-variance / clsx / tailwind-merge | UI component setup and class composition | CLI is not a runtime UI system; direct package use varies | Keep only utilities with actual call sites; standard React class helpers are alternatives |
| `dotenv` | Loads `.env.local` for `test-all.js` | Used by a live smoke script, not by normal Next runtime | Not essential to the production request path; Next loads its own environment files |

## Environment Variable Names

Names observed in source only; values were not read or included:

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL`, `V0_RUNTIME_URL`, `NEXT_PUBLIC_APP_URL`, `AI_GATEWAY_API_KEY`, `GEMINI_API_KEY`, `VERCEL_OIDC_TOKEN`, `ALPHA_VANTAGE_API_KEY`, `TAVILY_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `SUPPORT_TO`, `SUPPORT_FROM`, `NODE_ENV`.

The application auth module substitutes a hard-coded development fallback when `BETTER_AUTH_SECRET` is absent. Do not copy that fallback into production configuration.

## Local Development and Audit Commands

| Command | Purpose | Observed outcome |
|---|---|---|
| `npm run dev` | Start Next dev server | Not run during this audit |
| `npm run build` | Production build and Next TypeScript validation | Passed; build page-data phase logged PostgreSQL `ECONNREFUSED` and auth fallback messages |
| `npx tsc --noEmit` | Strict standalone type check | Passed |
| `npm run test:agent` | Agent scoring tests | 3 passed |
| `node --test tests/db-connection-cache.test.js` | DB cache tests | 2 passed |
| `npm run lint` | Whole-repository ESLint | Failed: 39 errors, 22 warnings |
| `npm audit --omit=dev --audit-level=moderate` | Production dependency advisory scan | Failed: 39 vulnerabilities (3 low, 14 moderate, 17 high, 5 critical) |
| `npm run db:generate`, `npm run db:push`, `npm run db:studio` | Drizzle commands | Not run; database not available |
| `node test-all.js` | Live service smoke script | Not run: calls external services and writes a Redis health-check key |

The test script named `scripts/verify-e2e.js` is not wired to a browser test framework and was not treated as an E2E suite.
