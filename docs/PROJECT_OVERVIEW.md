# InvestIQ Project Overview

**Audit date:** 2026-11-15  
**Scope:** Repository source, package manifests/lockfile, current local build and tests. No environment-file values were read.  
**Purpose:** Portable technical handover. This is an independent source-based audit, not a financial, legal, or security certification.

## Evidence Labels

- **Verified from source:** directly visible in the checked-in application code.
- **Verified by execution:** observed by running a local command in this workspace.
- **Inferred:** likely intent or risk inferred from implementation; not a product requirement.
- **Not verified:** needs external infrastructure, provider credentials, deployment access, or manual UX testing.

## Executive Summary

InvestIQ is a Next.js web application for authenticated users to request a company research report with a BUY, HOLD, or PASS label. The application combines a small local company directory, external fundamental/news/filing lookups, a LangGraph workflow, heuristic scores, LLM-written bull/bear arguments and judgment, database persistence, and report exports.

The repository contains a functioning application skeleton and a complete request path for launching and viewing an analysis. It is not yet a dependable investment research platform. The largest product risk is that its UI calls outputs verified and source-backed while the verifier does not test whether a factual claim is entailed by the cited source. The competitor score is seeded from ticker characters, news sentiment is a keyword count over search headlines, financial coverage is sparse, and no market price history or valuation model is implemented. These are source-confirmed limitations, not runtime accuracy measurements.

A local production build and strict TypeScript validation pass. Five focused unit tests pass. Full-repository lint fails with 39 errors and 22 warnings. `npm audit --omit=dev` reports 39 production-tree advisories, including 5 critical and 17 high. The production build also logs database connection refusals because PostgreSQL is not configured in the audit environment. These results do not prove provider-backed workflows work in production.

**Overall assessment:** useful prototype/research workflow with meaningful auth, storage, structured output, and graceful failure scaffolding; not suitable for users to rely on for investment decisions or marketed claims of verified facts until evidence provenance, source validation, scoring methodology, auth secret configuration, dependency advisories, quota behavior, and evaluation are addressed.

## What the Product Is

1. **What is InvestIQ?** A web application that accepts a stock ticker, gathers a limited set of company-related data, runs a multi-stage research graph, stores an analysis, and presents a verdict and report. **Verified from source.**
2. **What problem does it address?** It aims to reduce the effort required to assemble a first-pass view of a publicly traded company by combining fundamentals, news, competition, and opposing investment arguments. **Inferred from implemented workflow and page copy.**
3. **Why was it developed?** No authoritative product brief or decision record remains in the current repository. The intended motivation appears to be faster AI-assisted investment research. **Inferred; not independently verifiable.**
4. **Who is it for?** The UI is aimed at individual investors and users researching public equities. No formal persona or institutional workflow is present. **Inferred.**
5. **Primary purpose:** create and display a single-company analysis with score dimensions, verdict, confidence, arguments, citations, and a disclaimer.
6. **Secondary purposes:** compare two companies, review recent analyses, export a report, manage an account, view pricing/research pages, and submit support requests.
7. **What it promises:** marketing copy claims fast analysis, multiple specialized agents, current market data, and verified/source-backed claims.
8. **What it can do today:** execute the configured analysis graph when dependencies and providers are available, produce heuristic metrics and LLM synthesis, persist results when the database is available, and render/export those results.
9. **What it cannot substantiate today:** calibrated return predictions, fair value/target prices, technical analysis, sector-normalized valuation, true competitor market share, claim-level fact verification, or a measured under-90-second service level.
10. **Difference from a traditional research platform:** it can synthesize web headlines and selected ratios into prose, but it does not provide institutional-grade statements, consensus estimates, corporate-action normalization, historical market data, or validated valuation research.
11. **Difference from a basic chatbot:** the code has a fixed graph, structured Zod outputs, deterministic score functions, explicit state, a database record, and UI progress events. Those controls improve repeatability of workflow shape, not factual correctness by themselves.

## Intended Versus Implemented

| Area | Intended experience | Verified implementation | Assessment |
|---|---|---|---|
| Research | Broad, timely, comprehensive investment research | Five financial ratios, search headlines, SEC filing metadata, heuristic competitor profile | Partial; scope is much narrower than the copy suggests |
| Agents | Many specialized AI analysts | Nine graph nodes; four call the LLM (planner, bull, bear, judge); financial/news/competitor/scoring/verifier are deterministic or tool-driven | Multi-stage workflow exists, but not eight independent LLM analysts |
| Verification | Every claim checked against credible sources | Verifier counts positive `sourceIndex` values and citation count; it does not retrieve or compare documents to claims | UI claim is unsupported |
| Scoring | Trustworthy investment score | Deterministic hand-authored formulas and thresholds | Reproducible for fixed inputs but uncalibrated and not validated |
| Streaming | Live agent progress | Server-sent events with start, progress, agent, complete, and error events | Implemented, but status/error/retry paths have gaps |
| History | Persistent, per-user analyses | PostgreSQL tables and user-scoped server actions | Implemented when DB is healthy; production DB behavior unverified |
| Comparison | Parallel analysis of two companies | Two graph runs via `Promise.allSettled` and JSON response | Partial; accounting, quota, and cross-provider behavior need validation |
| Billing | Paid plan tiers and analysis caps | Static price cards; no payment/checkout route; backend only distinguishes free from non-free | UI present, billing not functional |
| Portfolio/watchlists/backtests | Portfolio-level product capabilities | Tables exist in schema; no corresponding UI/actions/API found | Data model only; not functional |
| Export | TXT, CSV, PDF, JSON | Browser-side export helpers and buttons | Implemented, but report omits citations and CSV formula safety is untested |

## Core Capabilities and Status

| Capability | Status | Notes |
|---|---|---|
| Email/password sign-up and sign-in | Implemented but not integration-tested here | Better Auth handlers and forms exist; requires DB and a production secret |
| Company autocomplete | Partially implemented | Searches a local list of 26 tickers; direct analysis resolution has additional provider fallbacks |
| Single-ticker analysis | Partially implemented | Full page-to-stream-to-graph path exists; requires external providers and DB for full persistence |
| Live progress and retry UI | Partially implemented | SSE exists; cancellation, duplicate prevention, failure state persistence, and browser behavior need tests |
| Financial ratios | Partially implemented | Five ratios from Yahoo Finance or Alpha Vantage; not parsed financial statements |
| News sentiment | Implemented as a heuristic, not validated | Lexical polarity, recency and relevance weighting; source content can be only a title plus generic text |
| Competitor analysis | Present but not substantively implemented | Competitor names/scores are generated heuristically from ticker/sector; search only contributes a title signal |
| Bull/bear cases | Partially implemented | LLM structured output or deterministic fallback; references are not reliably linked to exact sources |
| Composite score and verdict | Implemented but not calibrated | Fixed formulas/weights and risk-tolerance thresholds; no historical outcome validation |
| Citation verifier | Present in workflow, not a factual verifier | Source-index ratio only; not entailment, identity, freshness, or URL-content validation |
| History and details | Implemented if DB available | User-scoped database reads and stored agent outputs |
| Two-company comparison | Partially implemented | Runs two full workflows; persistence/quota behavior and result accuracy require testing |
| PDF/CSV/JSON/TXT export | Implemented | Browser-side generated file; no citation bundle or model/provider audit trail |
| Paid plans | Present in UI, not functional | No payment integration; plan cards route to sign-up; displayed caps conflict with backend |
| Portfolio/watchlist/backtesting | Planned/data model only | Schema declarations exist without a functional execution path |
| Support | Partially implemented | Authenticated API stores feedback and sends SMTP email; no ticket workflow or support rate limit |
| Observability | Minimal | Console output and Vercel page analytics; health endpoint checks DB and only configuration presence for other services |

## Feature Inventory

Statuses use the requested categories. "Implemented but not properly tested" means a source path exists, but integration or user-journey validation is absent. A component or schema by itself is not treated as a completed feature.

| Feature | Description | Implementation status | Relevant files | Dependencies | Limitations |
|---|---|---|---|---|---|
| Account sign-up/sign-in/sign-out | Email/password account and session workflow | Implemented but not properly tested | `components/auth-form.tsx`, `lib/auth.ts`, `lib/auth-client.ts`, `app/api/auth/[...all]/route.ts` | Better Auth, PostgreSQL, Drizzle | Requires DB and production secret; email verification/recovery not configured explicitly; no auth E2E tests |
| Protected dashboard and analysis history | Show a user's recent reports | Implemented but not properly tested | `app/page.tsx`, `components/analysis-list.tsx`, `app/actions/analyses.ts` | Next.js server actions, Better Auth, PostgreSQL | DB outage prevents persistence/history; UI catches list errors as empty state |
| Company autocomplete | Search and select a ticker | Partially implemented | `components/company-search-autocomplete.tsx`, `app/api/search/companies/route.ts`, `lib/company-data.ts` | Local 26-company catalog, Next route | Despite copy, this endpoint is not a broad external directory; unresolved queries are limited |
| Ticker resolution | Resolve symbols/names for analysis | Partially implemented | `lib/agent/tools/resolveTicker.ts`, `lib/security/sanitize.ts` | Yahoo search, optional Alpha Vantage, optional LLM | Permissive ticker-pattern fallback can accept unverified symbols; Alpha Vantage fields are mis-mapped to sector |
| Financial fundamentals | Collect ratios for scoring and arguments | Partially implemented | `lib/agent/tools/getFinancials.ts`, `lib/agent/nodes/financial.ts` | Yahoo Finance, optional Alpha Vantage, Zod | Five ratios only; no statement series, currency normalization, period validation or report freshness; partial quality not carried forward |
| SEC filings | Find recent filing references | Partially implemented | `lib/agent/tools/getSECFilings.ts`, `lib/agent/nodes/financial.ts` | SEC EDGAR | Search metadata/URLs only; filing contents are not parsed or used to validate claims |
| News retrieval and sentiment | Find headlines and summarize direction | Partially implemented | `lib/agent/tools/webSearch.ts`, `getSentiment.ts`, `lib/agent/nodes/news.ts` | Tavily optional, Google News RSS fallback | Headline keyword heuristic; no article-body or source-quality validation; RSS fallback content is generic |
| Competitor analysis | Identify peers, moat and threats | Partially implemented, but score is synthetic | `lib/agent/nodes/competitor.ts`, `lib/agent/tools/webSearch.ts` | Search results | Generic competitor names and ticker-seeded scores are not real peer research |
| Multi-stage agent research | Plan, research, score, debate, judge and verify | Partially implemented | `lib/agent/graph.ts`, `lib/agent/nodes/*`, `lib/agent/runner.ts` | LangGraph, AI SDK, providers | Four LLM calls, deterministic tool nodes; fallback outputs are not consistently surfaced as degraded |
| Bull/bear cases | Produce opposing arguments | Implemented but not properly tested | `lib/agent/nodes/bull.ts`, `bear.ts`, `lib/agent/prompts/index.ts` | AI SDK/Gemini model route, Zod | No verified claim-to-source mapping; model can introduce unsupported arguments |
| Composite score and verdict | Produce score dimensions and BUY/HOLD/PASS | Partially implemented | `lib/agent/scoring.ts`, `lib/agent/nodes/scoring.ts`, `judge.ts`, `verifier.ts` | Internal heuristics, LLM synthesis | Uncalibrated thresholds, sector mismatch, partial-data quality gap; confidence is not outcome probability |
| Factual claim verification | Validate each claim against primary sources | Present in UI/workflow but not functionally implemented | `lib/agent/nodes/verifier.ts`, `components/verdict-card.tsx`, `components/explainability-panel.tsx` | Citation indexes and counts only | Verifier does not inspect source content or entailment; UI may claim 100% grounding |
| Live analysis progress | Stream graph events to browser | Partially implemented | `app/api/analysis/stream/route.ts`, `lib/agent/runner.ts`, `lib/agent/event-bus.ts`, `components/streaming-analysis.tsx` | SSE, LangGraph, process-local queue | No durable checkpoint/cancellation/idempotency; errors can leave processing records |
| Analysis persistence and detail view | Save report and agent outputs per user | Implemented but not properly tested | `app/actions/analyses.ts`, `app/analysis/[id]/page.tsx`, `components/analysis-detail-view.tsx`, `lib/db/schema.ts` | Better Auth, Drizzle, PostgreSQL | No DB integration test; migrations directory absent; source table is not populated |
| Two-company comparison | Run two analyses and compare scores/verdicts | Implemented but not properly tested | `app/compare/compare-client.tsx`, `app/api/analysis/compare/route.ts` | Two graph executions, DB, providers, LLM | Parallel provider load; compare quota increment skipped; not peer-normalized valuation |
| Report exports | Download TXT/CSV/JSON/PDF | Implemented but not properly tested | `lib/report-export.ts`, `components/analysis-detail-view.tsx`, `components/streaming-analysis.tsx` | Browser Blob APIs, jsPDF | Export omits source bundle/freshness; CSV formula neutralization and long PDF layout untested |
| Pricing and paid plans | Display Starter/Growth/Pro prices and entitlements | Present in UI but not functional | `app/pricing/page.tsx`, `lib/quota.ts`, `lib/db/schema.ts` | Static UI, subscription table | No payment/checkout/webhook; UI caps do not match backend plan logic |
| Portfolio, holdings, watchlists, backtests | Portfolio-level analysis features | Planned but not implemented | `lib/db/schema.ts` only | PostgreSQL schema declarations | No UI, API or service execution path found |
| Support submissions | Save feedback and send email | Partially implemented | `app/support/page.tsx`, `app/api/support/route.ts`, `lib/db/schema.ts` | PostgreSQL, Nodemailer/SMTP | No ticket workflow/rate limit; insert-before-email can duplicate on retry; user-facing contact text differs from configurable recipient |
| Health monitoring | Report service readiness | Partially implemented | `app/api/health/route.ts`, `lib/db/health.ts`, `lib/cache.ts`, `lib/agent/llm.ts` | PostgreSQL, optional Redis/LLM config | Only DB is actively probed; LLM/Redis report configuration presence only; public response includes operational detail |
| Distributed cache and rate limiting | Share cache and request budgets across instances | Present in code but not operationally connected | `lib/cache.ts`, `lib/rate-limit.ts`, `lib/agent/tools/http.ts` | Upstash package, process-local Maps | Analysis cache helpers have no callers; active cache/limiter are process-local |
| Legal, privacy and terms pages | Provide real policy content and routes | Missing entirely in inspected app routes | Landing-page anchors in `app/page.tsx`; no matching route found | None | Anchors do not provide actual policy documents; legal readiness needs separate review |

## Technology Summary

Exact installed top-level versions were read from `npm ls --depth=0`; package ranges are in `package.json`.

| Layer | Technology | Role and assessment |
|---|---|---|
| Language | TypeScript 5.7.3; JavaScript for a few scripts/helpers | Main application is strict TypeScript. Some `any` remains and runtime validation is inconsistent. |
| Web framework | Next.js 16.2.6, React 19.2.7 | App Router, Server Components, route handlers, server actions and SSE. Build passes locally; middleware convention emits a deprecation warning. |
| Styling/UI | Tailwind CSS 4.3.1, Base UI React 1.6.0, Lucide React 1.22.0 | Utility styling and accessible primitives/icons. Custom components are under `components/ui`; no component test suite. |
| LLM | Vercel AI SDK `ai` 7.0.4, model ID `google/gemini-2.5-flash` | Structured generation through `generateObject`; credential/provider routing requires integration testing. |
| Orchestration | LangGraph 1.4.7; LangChain core 1.2.1 | LangGraph is used for the active graph. No direct LangChain core usage was found in the app source. |
| Data providers | yahoo-finance2 3.15.3, Alpha Vantage REST, Tavily REST, Google News RSS, SEC EDGAR | Limited fundamentals, search results/headlines and filing metadata; freshness and provider contracts are not tested. |
| Persistence | PostgreSQL `pg` 8.22.0, Drizzle ORM 0.45.2 / Drizzle Kit 0.31.10 | User, analysis, agent, subscription, feedback and future-product tables. DB unavailable in local build environment. |
| Authentication | Better Auth 1.6.22 | Email/password with Drizzle adapter; NextAuth is also installed but unused by application code. |
| Cache/rate limiting | Upstash Redis package 1.38.0 plus in-process Maps | Research cache and limiter are process-local. Redis helper is mostly unused; health checks only report configuration. |
| Reports | jsPDF 4.2.1 | PDF and text/CSV/JSON exports. `mammoth` 1.12.0 has no application call site found. |
| Analytics | `@vercel/analytics` 1.6.1 | Client analytics included in production layout. No error tracking or tracing integration found. |
| Validation | Zod 4.4.3 | Agent output schemas and financial metric validation. Not all HTTP bodies use a complete request schema. |
| Tooling/tests | ESLint 9.39.5, eslint-config-next 16.2.6, TypeScript, tsx 4.23.15, Node `node:test` | Current local checks: build/type-check pass; 5 unit tests pass; full lint fails; no browser/E2E framework configured. |
| Hosting | No deployment manifest or CI workflow found | Vercel is implied by analytics and environment fallbacks, not proven as deployed. |

See [CODEBASE_GUIDE.md](CODEBASE_GUIDE.md) for the full dependency and file inventory.

## Agent Responsibilities

| Graph stage | Actual responsibility | LLM? |
|---|---|---:|
| Planner | Resolves ticker/name, creates plan/search strings | Yes, with fallback |
| Financial Analyst | Calls ratio providers and SEC filing search | No |
| News Analyst | Searches headlines and computes keyword sentiment | No |
| Competitor Analyst | Uses a ticker-derived score and generic competitor labels | No |
| Scoring Engine | Applies fixed deterministic formulas | No |
| Bull Case | Creates supporting arguments from context | Yes, with fallback |
| Bear Case | Creates risk arguments from context | Yes, with fallback |
| Judge | Synthesizes cases and returns verdict | Yes, with deterministic fallback and BUY gate |
| Verifier | Counts citations/source indexes and recalculates confidence | No; does not verify factual entailment |

## Strengths

- Clear staged graph with parallel research and bull/bear branches.
- Structured LLM output schemas and bounded LLM calls (`20s` timeout, `maxRetries: 2` in the wrapper).
- External fetch helper has an 8-second default timeout.
- Analysis and agent outputs have database structures for audit/history.
- Core analysis actions include per-user filtering; analysis result persistence is transactional.
- A small deterministic test suite and a type-checked production build exist.
- The UI includes a visible investment disclaimer.

## Principal Limitations

- Factual verification is not implemented despite user-facing claims.
- Competitor scoring is synthetic; fundamental inputs are sparse; news sentiment is simplistic.
- Confidence and scores are heuristic, not calibrated to historical outcomes or investor utility.
- Incomplete provider data does not consistently lower `dataQualityScore`.
- Price history, valuation targets, technical indicators, earnings/event analysis, sector benchmarks and portfolio workflows are absent.
- Citations can be duplicated/misaligned across parallel graph nodes.
- Streaming errors can leave database records in processing state; retries/duplicates are not durably coordinated.
- Quota and plan enforcement are inconsistent; pricing cards are not connected to payment.
- Full lint and production dependency audit fail; no E2E suite or CI was found.
- Local database connectivity and provider-backed behavior could not be tested without infrastructure/credentials.

## Ideal Future Direction

The defensible near-term product is an evidence-aware research assistant, not an automated investment adviser. It should first provide source-level provenance and freshness, validated/normalized data with missingness, transparent reproducible score definitions, uncertainty and sector context, and report language that never implies verification that was not performed. Historical outcome evaluation and human review should precede stronger recommendation or performance claims. Portfolio, notifications, paid tiers and backtests should wait until the core evidence and reliability contracts are measurable.
