# InvestIQ Testing and Evaluation

**Audit date:** 2026-11-15. Test results below are observed local command results. No credentials were used, no network integration suite was run, and no market correctness claim is made.

## Current Test Infrastructure

| Item | Observed state |
|---|---|
| Unit framework | Built-in Node `node:test` and `node:assert`; TypeScript tests run with `tsx` |
| Unit files | `tests/agent-scoring.test.ts` (3 tests); `tests/db-connection-cache.test.js` (2 tests) |
| Package scripts | `npm run test:agent`; the DB cache test is invoked directly with `node --test` |
| Test coverage | No coverage tool or coverage report/configuration found |
| Integration tests | `test-all.js` is a live smoke script, not a hermetic test suite. It calls Gemini, Alpha Vantage, Tavily, Upstash Redis and PostgreSQL; it writes a Redis health-check key. It was intentionally not run. |
| E2E tests | No Playwright/Cypress browser config or E2E package script found. `scripts/verify-e2e.js` is not wired to an E2E runner. |
| CI | No workflow/config found in the inspected root |
| Production build | `npm run build` passed with TypeScript checking; it logged DB `ECONNREFUSED` during page-data generation because no local Postgres was available. |
| TypeScript | `npx tsc --noEmit` passed |
| Focused tests | `npm run test:agent`: 3 passed; `node --test tests/db-connection-cache.test.js`: 2 passed |
| Lint | `npm run lint` failed: 39 errors and 22 warnings across the repo. Changed scoring/judge/metadata files passed a focused ESLint invocation in prior validation. |
| Dependency audit | `npm audit --omit=dev --audit-level=moderate` exited nonzero with 39 reported advisories: 3 low, 14 moderate, 17 high, 5 critical. No updates were made. |

Five passing tests are not meaningful coverage evidence for all routes, integrations, or financial correctness. There is no defensible coverage percentage.

## Functional Test Gaps

| Workflow/condition | Current check | Missing test and expected evidence |
|---|---|---|
| Sign-up/sign-in/sign-out | No browser test | Real DB-backed account/session lifecycle, invalid password, duplicate email, cookie flags, email verification behavior |
| Company search | Local 26-item filter only | Keyboard/screen-reader behavior, empty/long/special input, outside click, network failure, unsupported ticker handling |
| Start analysis | No end-to-end test | Pending record creation, quota, redirect, stream events, provider success/failure, persisted completion |
| Existing analysis/history | No end-to-end test | User A cannot read/update/delete user B's analysis; pending, processing, failed and missing states |
| Comparison | No integration test | Partial provider failures, both failures, same ticker twice, quota accounting, DB persistence and concurrent calls |
| Exports | No unit/browser tests | Unicode, long reports/page breaks, malicious formula values in CSV, Blob download behavior, citations in export |
| Support | No route tests | Missing/oversized fields, SMTP failure after DB insert, replay/spam, recipient privacy, meaningful response and retry |
| Database outage | DB cache tests only | Auth, page, stream, support and comparison behavior when DB is down and recovers; stuck record recovery |
| API malformed bodies | No route tests | Invalid JSON, wrong field types, extra fields, oversized body, invalid ticker and HTTP response contract |
| Duplicate requests | No test | Two stream submissions for same ID, page refresh while processing, client disconnect and retry race |

## Unit Testing Priorities

1. **Financial data parsers:** provider response fixtures for missing, zero, negative, malformed and string-number values; reject unknown ticker/period/currency assumptions; assert partial source quality is preserved.
2. **Score functions:** table-driven boundary tests around every piecewise threshold, NaN/infinity, missing values, 0 values, weights sum, clamping, and property tests for invariants.
3. **Sentiment:** lexical negation, mixed headlines, duplication, empty text, invalid/future/stale dates, relevance weights, neutral baseline and language/sector bias.
4. **Verdict policy:** each risk tolerance boundary; BUY gates for missing/partial/stale evidence; deterministic fallback; judge/verifier consistency; non-BUY claims should not be overconfident.
5. **Citation mapping:** source index uniqueness across parallel node updates; invalid/out-of-range index; claim-to-source entailment fixtures; uncited claims must lower confidence and be accurately described.
6. **Quota and idempotency:** atomic reservation/increment under concurrent requests, repeated completion, compare accounting and rollback when analysis persistence fails.
7. **Security helpers:** sanitizer length/Unicode behaviors, HTML text display, CRLF in support subject/name, CSV formula escaping, URL protocol restrictions.
8. **Cache/rate limiter:** expiration boundary, concurrent requests, memory cleanup, multiple instances and reset behavior.
9. **Report transforms:** timezone determinism, CSV injection, JSON round-trip, PDF long content/page breaks, null values and score 0 display.
10. **State mappers:** confidence scale (0-100 to 0-1), no default fabricated confidence, `hallucinations` naming/semantics, report fields and source preservation.

## Integration Test Plan

Use provider adapters/mocks and a disposable PostgreSQL schema. Never run production requests or write to a shared Redis key in tests.

| Boundary | Test cases |
|---|---|
| Frontend -> search API | Response schema, debounce, invalid/empty query, rate/caching headers, keyboard selection |
| Analysis action -> DB | Authenticated ownership, uniqueness/upsert, quota transaction, rollback, migration compatibility |
| Stream route -> graph | Authentication, rate limit, request validation, initial progress, complete/error events, disconnect cleanup, failed status update |
| Graph -> tools | Provider success/timeout/429/500/malformed JSON/empty result and fallback provenance |
| Graph -> LLM | No key, gateway key, invalid structured output, timeout, rate limit, retries exhausted, prompt injection fixtures; assert fallback is marked as fallback |
| Graph parallel nodes -> state | Deterministic reducer behavior, citation index uniqueness, error array merging, node concurrency |
| Persistence -> UI | All result fields loaded for the owning user; no cross-user access; agent execution replacement idempotency |
| Redis | If retained, enabled/disabled mode, failure bypass, serialized values, TTL; otherwise remove unused cache scaffolding in a separately approved implementation phase |
| Auth -> protected routes | Missing/invalid/expired session, valid user, mismatched owner, malicious origin/CSRF checks, auth rate limits |

## End-to-End Journeys

Build browser coverage for desktop and mobile:

1. Register a new account, verify or document email behavior, sign out, sign in.
2. Search a local ticker, select it, start analysis, observe all expected progress events, load persisted result.
3. Refresh a processing analysis, open it in a second tab, submit a duplicate, and confirm only one durable job runs.
4. Open another user's analysis ID and attempt server-action/API reads and writes; expect no data disclosure.
5. Compare valid companies; inject one-provider and one-analysis failure; verify partial results and status messaging.
6. Export a completed report in each supported format and open it; validate citation/freshness/disclaimer content.
7. Simulate DB down, provider down, LLM disabled, Redis disabled, SMTP down, then recovery; verify terminal status and safe retry.
8. Test support form with ordinary and boundary input; ensure no personal address is rendered or server error leaked.
9. Test mobile viewport, keyboard only, screen reader landmarks, focus visibility and contrast.
10. Confirm pricing and support links route to real operations rather than static or dead destinations.

No browser journeys were run in this audit because no E2E harness was configured and database/provider services were unavailable.

## Exception and Edge-Case Matrix

| Category | Source behavior observed | Current handling quality / user effect | Recommended coverage |
|---|---|---|---|
| Empty search/ticker | Search returns empty; stream/compare return 422 for missing ticker after sanitization | Basic case handled | Test empty whitespace, Unicode, punctuation-only and truncation collisions |
| Unsupported/unknown ticker | Resolver can accept any ticker-shaped string after provider lookups; comparison falls back to ticker as name | Can create analysis for an unverified symbol | Confirm symbol/exchange/provider identity, do not imply verified company |
| Oversized/special input | Ticker max 10 chars after sanitizer; company text max 100; API body has no explicit schema/body limit | Some length limiting, no complete input schema | Validate types, max body, field bounds and Unicode; test encoded input |
| SQL injection | Drizzle query builder and parameterized conditions are used in inspected actions | No obvious string-built SQL sink found | Fuzz route/server-action inputs; do not treat sanitization as a substitute for parameterization |
| XSS | No `dangerouslySetInnerHTML`/`eval` sink found in source search; React renders ordinary strings | React escaping is beneficial | Add stored/reflected payload tests and security headers review |
| Missing/partial financials | Null metrics returned; provider quality fields exist | Scoring penalizes nulls, but node only maps `stale` into global quality; partial fields may appear quality 1 | Test every metric combination and set report status from provider quality |
| Zero values | Yahoo parsing often uses `value || null` | Valid zero values become null for several metrics | Use nullish checks and source-specific contract tests |
| Negative/outlier metrics | Zod bounds reject some values; catch/fallback can turn invalid provider data into all-missing metrics | User may see fallback report rather than a clear provider data error | Record rejected response, keep degraded state, test extremes and currencies |
| Invalid date/RSS XML | Regex parser and `toISOString()` can fail; outer fetch catches and returns empty results | Graceful but silent; user sees neutral sentiment | Malformed XML/date fixtures; show degraded source status |
| HTTP 400/401/403/404/429/5xx | Provider non-OK often maps to empty/null; app routes explicitly use 401, 422, 429, 500/503 | Many upstream failures become neutral/fallback output; status is not consistently persisted | Mock each status and assert user-safe distinction and telemetry |
| Timeout/network outage | Fetch helper aborts at 8s; Yahoo has 8s race; LLM has 20s abort and maxRetries 2 | Bounded calls, but pipeline may degrade rather than fail closed | Verify total end-to-end deadline and graph-level cancellation |
| Malformed request JSON | Route outer catch returns 500 | Invalid client input mislabeled as server/LLM error | Return 400 with schema validation and stable error codes |
| LLM invalid/truncated output | `generateObject` schema validation errors are caught and fallback used | Workflow continues, but generated-vs-fallback provenance is not reliably shown | Add malformed/empty/truncated output fixtures and explicit degraded reason |
| Prompt injection | Sanitizer removes a few exact phrases; provider snippets enter prompt context | Not robust isolation; no tool side-effect path was observed, but output can be manipulated | Treat external text as untrusted data; adversarial prompt evaluation and source quoting |
| Contradictory claims/citations | Bull/bear outputs are judged by model; verifier counts nonzero indexes | Contradiction and source support are not independently validated | Pairwise contradiction tests and exact evidence claim checks |
| Duplicate/concurrent requests | No durable idempotency key/lock; progress queue is process-local | Duplicate work/cost, race on status/quota, possible stuck records | DB unique job key/atomic reservation and concurrent integration tests |
| DB unavailable/recovery | Auth/API probes DB; some route paths continue in-memory; local build logged refused connection | Public pages can render, but auth and persistence unavailable; incomplete state can remain | Test down/up transitions, mark failed/degraded, bounded retries |
| Redis unavailable | Cache helper is no-op when absent/failing | Optional helpers degrade, but Redis is not active analysis cache | Test if Redis is product requirement; otherwise remove claims/dependency |
| SMTP unavailable | Support insert precedes email; catch returns 500 | Retry may create duplicate feedback rows; SMTP error may leak | Outbox/idempotency and redacted public errors |
| Process shutdown/memory | No durable workflow checkpoint; Maps are process-local | Stream and rate-limit state lost; active run not recoverable | Durable job queue/checkpoints and restart tests |
| Memory exhaustion/cost abuse | Two full graphs for comparison; request body limits and global cost caps not evident | Resource consumption risk | Load test only in isolated environment; concurrency limits and budget enforcement |

The full set of possible HTTP/provider and production failures cannot be exercised without isolated infrastructure and credentials. The table is a code-based handling assessment, not a completed stress or penetration test.

## Financial/LLM Evaluation Dataset

Use immutable fixtures with source URLs/content/timestamps and an adjudicated expected set of facts. Include multiple sectors and conditions:

- Identical company and identical frozen evidence replayed repeatedly.
- Same company with only changed earnings/news evidence to measure score movement and explanation.
- Large technology, bank, insurer, utility, industrial, healthcare/biotech, REIT and energy companies to expose sector comparability assumptions.
- Profitable slow-growth company, fast-growth/negative-cash-flow company, declining revenue, high leverage, negative margins, extreme/zero ratios.
- Conflicting positive/negative headlines and stale/future/malformed publication dates.
- Small/illiquid company, foreign listing/ADR, symbol collision, delisted/unsupported issuer, missing provider fields.
- Provider disagreement, stale vs current filings, empty search and rate-limited provider.
- Prompt injection embedded in article snippets and irrelevant high-scoring search results.

Do not treat any expected BUY/HOLD/PASS as objectively true without a named, documented investment policy and qualified review. Use labeled facts and explicit rubric separately from investment judgment.

## Metrics and Provisional Acceptance Gates

Acceptance values must be agreed and calibrated to the product risk policy before release; no metric below proves financial correctness.

| Metric | Measurement | Proposed release gate |
|---|---|---|
| Citation resolution | Percent of nonzero source indexes mapping to one retrieved source | 100% on deterministic unit/integration fixtures |
| Claim support precision | Human-adjudicated factual claims entailed by linked source | Publish measured result by claim category; zero unsupported critical factual assertions in release fixtures |
| Citation coverage | Factual claims with a valid supporting citation / all factual claims | Report numerator/denominator and confidence interval; no claims of 100% unless verified claim-by-claim |
| Data freshness | Age of each source at report time | Always display timestamp/age and explicit stale/missing state; policy maximum must be provider-specific |
| Score reproducibility | Same frozen structured inputs -> identical score outputs | Exact equality for deterministic scoring tests |
| Score sensitivity | Output change when a single validated input changes | Document expected direction; reject unexplained discontinuities outside declared thresholds |
| Confidence calibration | Brier score/reliability curve on labeled historical decisions | Require held-out dataset and uncertainty interval before displaying as probability; otherwise label as heuristic confidence |
| Sector bias | Score distributions and error by sector/market cap/listing | Report subgroup results; no cross-sector comparison claims until normalized and validated |
| Contradiction handling | Unsupported/contradictory claims and unresolved conflict rate | Conflicts represented explicitly; no silent selection of one source |
| Availability/latency | p50/p95 complete/degraded/failed duration under defined load | Set SLO before release; measure on deployed provider/DB setup, not local build |
| Failure recovery | Failed streams reaching terminal state and safe retry | 100% of injected failures end in explicit terminal status; retries must be idempotent |

## Safe Security and Performance Testing

- Run static dependency scanning regularly and track transitive advisories; do not use `npm audit fix --force` blindly.
- Add route tests with local mocks for unauthorized access, rate limits, injection strings, oversized body and ownership boundaries.
- Run concurrency/load testing only against isolated services with spending limits and explicit provider test credentials.
- Do not test SSRF against external hosts or execute destructive payloads. Validate that server fetches stay on fixed provider hosts.
- Check performance by graph stage, provider, model tokens/cost, and persistence time. Current code records some stage timings but cost/token fields are persisted as null.
- Use axe/WCAG checks plus keyboard and screen-reader testing; no automated accessibility result exists today.
