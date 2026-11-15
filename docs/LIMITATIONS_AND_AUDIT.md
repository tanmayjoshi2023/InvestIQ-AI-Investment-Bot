# InvestIQ Limitations and Technical Audit

**Audit date:** 2026-11-15  
**Method:** Source review, local build/type/test/lint commands, `npm audit --omit=dev`. No environment values were read. No destructive tests or third-party live API calls were performed.

## Finding Labels and Severity

- **Verified from source:** directly confirmed in repository code.
- **Verified by execution:** directly observed command result.
- **Inferred risk:** consequence follows plausibly from visible code but was not exploited or tested.
- **Not verifiable:** requires production credentials, service access, a deployed environment, legal review, or market data.
- P0 means block public production/reliance; P1 means fix before a public release; P2 means significant reliability/quality debt; P3 is future/optional.

## Executive Risk Assessment

The product's dominant risk is the mismatch between user-facing claims of verified, source-backed research and the actual evidence pipeline. The scoring implementation is deterministic but hand-tuned and uncalibrated. The verifier does not verify claims against source content. Competitor values are partly seeded from ticker characters, not measured company data. A successful build or valid JSON does not establish that a recommendation is accurate.

## Prioritized Findings

| ID | Priority | Finding and evidence | Impact | Recommendation / complexity |
|---|---|---|---|---|
| F1 | P0 | Claim verification is not implemented. `lib/agent/nodes/verifier.ts` counts positive source indexes; it does not fetch or compare source content to claims. `components/verdict-card.tsx` can state 100% grounding when the uncited list is empty. | Unsupported claims can be presented as verified. | Persist claim-to-source relations, verify source identity and entailment, remove unsupported verification language. L-XL. |
| F2 | P0 | Competitor data is synthetic. `lib/agent/nodes/competitor.ts` derives scores from ticker characters and emits generic leader/challenger labels. Search contributes only a title signal. | Moat/competition scores do not describe actual peers or market share. | Replace with measured peers and cited evidence, or return unavailable. M. |
| F3 | P0 | `npm audit --omit=dev` reported 39 production-tree advisories: 5 critical, 17 high, 14 moderate, 3 low. Next.js, authentication/email and transitive dependencies are included. | Vulnerable package code may be reachable in production; exact exploitability depends on configuration and use. | Triage advisories and reachability, update to supported versions, retest. Do not blindly force major versions. M-L. |
| F4 | P0 | `lib/auth.ts` has an in-source fallback for missing `BETTER_AUTH_SECRET`; trusted origins include wildcard Vercel/vusercontent patterns. | Misconfigured deployments can reuse a known secret; trust surface is broad. | Require production secret, fail closed, narrow origins, validate deployed cookie/session settings. S-M. |
| F5 | P1 | `financial.ts` sets `dataQualityScore` from `financials.stale`, not `dataQuality`/`missingMetrics`; initial state quality is 1 and error path leaves it unchanged. | Partial/failed evidence can pass the judge's quality gate. | Aggregate field completeness, source and freshness into quality; make degraded state visible. M-L. |
| F6 | P1 | Parallel financial/news nodes calculate citation indexes from the same pre-merge citation length; state merges arrays in parallel. Competitor output claims source 3 without adding a citation. | Citation numbers can collide or point nowhere; verifier still counts them. | Stable source IDs and validation against final source set. M. |
| F7 | P1 | `scoring.ts` uses hand-coded ratio breakpoints and a Technology substring boost without documented empirical calibration, sector peer sets, prices or outcomes. | Cross-sector and investment-worthiness comparisons may be misleading. | Define an explicit investment policy; have a qualified quant reviewer validate units, sector treatment and out-of-sample results before recommendation claims. XL. |
| F8 | P1 | `getSentiment.ts` uses keyword counts, gives text with no matches a slight positive score, and Google RSS fallback uses generic query text rather than article body. | Negation, context, duplicates, language, source credibility and conflicts are not handled reliably. | Curated sentiment evaluation, deduplication, source freshness and explicit uncertainty. L. |
| F9 | P1 | Financial collection returns five ratios, not statements. No `asOf`/fetched timestamp is propagated; several Yahoo values use `|| null`, losing valid zero. SEC results are filing metadata, not parsed statement facts. | Partial/stale data can look current and comprehensive. | Validate provider contracts; preserve zero vs null; store currency, period, source and timestamps; display missingness. L-XL. |
| F10 | P1 | Stream errors do not mark DB row failed; no durable checkpoint/job queue; client sets status complete after loop even if an error event arrived; refresh can repeat processing. | Stuck records, duplicate LLM spend and confusing UI state. | Explicit lifecycle, idempotency, cancellation, terminal failures and recovery. L. |
| F11 | P1 | Pricing plans are static and all CTAs route to sign-up. `quota.ts` distinguishes free 5 vs non-free 9999, not displayed tiers; compare persistence skips usage increments; supplied `analysisId` can bypass stream quota branch. | Paid claims are unenforceable and analysis usage can be bypassed/undercounted. | Remove paid claims or implement entitlement/payment sync and atomic quota reservation on every route. M-L. |
| F12 | P1 | Verdict UI emits score-derived claims such as balance-sheet quality and 100% verification; risk likelihood/impact are fixed transforms of one score; null confidence defaults to 75%. | Heuristics are presented as measured facts/probabilities. | Label heuristics, show actual source metrics and missing data, remove fabricated confidence defaults. M. |
| F13 | P1 | Better Auth enables email/password with minimum length 8; no explicit email verification, password recovery or app-specific auth rate limit is configured in inspected source. | Account abuse/recovery posture is unknown. | Verify library defaults, configure recovery/verification/rate controls, test cookie/origin behavior. M. |
| F14 | P1 | Public `/api/health` returns DB pool/error details; support route returns caught exception messages. Health is based on DB; Redis/LLM only report configured/disabled. | Operational details can leak and health can be green while model/cache is unavailable. | Redact, separate liveness/readiness and actively probe required services. S-M. |
| F15 | P1 | Support route has no dedicated throttle or complete schema/length validation. Feedback is inserted before SMTP delivery. | Spam, oversized payloads and duplicate records after retry. | Validation, rate limit, idempotency/outbox and stable redacted errors. M. |
| F16 | P2 | Research cache/rate limiter use process-local Maps; Redis cache helpers have no callers. | Multi-instance deployment duplicates work and does not enforce global budgets. | Decide if shared cache/limiting is required; wire it and test outage behavior or remove unused code. M. |
| F17 | P2 | `drizzle.config.ts`/`runMigrations()` point at migrations folder but no migration files were found. | Reproducible bootstrap/rollback and deployed schema state are unverified. | Reviewed migrations, schema CI, backup/restore and rollback runbook. M-L. |
| F18 | P2 | Five unit tests pass; no API integration/E2E/accessibility suite; full lint fails 39 errors and 22 warnings. | Important routes, edge cases and concurrency are unprotected. | Add layered test suite and CI gates; plan lint debt by category. L. |
| F19 | P2 | `report-export.ts` quotes CSV cells but does not neutralize spreadsheet formula prefixes. | Exported text can be interpreted as a spreadsheet formula. | Formula-safe escaping and tests for `=`, `+`, `-`, `@`, tab and CR/LF. S. |
| F20 | P2 | No app use found for `next-auth`, `mammoth`, direct `redis`, or app-side `@google/genai`; unused `AnalysisService`, `debate-graph` and Redis cache methods also found. | Larger attack/maintenance surface and misleading architecture. | Confirm against all build scripts then remove only in a separately approved cleanup. S-M. |
| F21 | P2 | Search is only a local 26-company catalog; autocomplete semantics/focus are partial; landing page has dead anchors and no legal routes found. | Usability/accessibility and product coverage gaps. | WCAG 2.2 AA audit, keyboard/screen-reader checks, real routes or remove dead links. M. |
| F22 | P2 | Most logging is `console.*`; agent token/cost fields are stored null; no tracing/error tracker/alerts found. | Weak incident, latency and cost diagnosis. | Add redacted structured logs, correlation IDs, node/provider metrics and alerts. M-L. |
| F23 | P2 | `layout.tsx` defaults metadata base to localhost while `sitemap.ts` defaults to a public-looking domain. | Environment metadata can diverge. | Validate `NEXT_PUBLIC_APP_URL` and use one source of truth. S. |
| F24 | P3 | Portfolio, holding, watchlist, backtest, API usage and source tables exist without complete workflows. | Schema can imply capabilities that are not delivered. | Build, remove or retain only based on validated product strategy. M. |

## Scoring Method and Reliability

The financial score converts five metrics to 0-100 using fixed piecewise rules, equally averages them, then deducts 7 points for each missing value up to 25. `null` metric scores are neutral 50 before the missingness deduction; an entirely absent metrics object returns 25. News score is a mean of sentiment multiplied by relevance divided by article count, scaled around 50. Competition score starts from average threat and is blended heuristically; the active competitor inputs are synthetic.

The final dimensions use additional fixed blends and a Technology substring boost. Composite weights are financial 30%, market 20%, sentiment 15%, competition 15%, risk 20%, followed by another missing-data penalty. Risk tolerance thresholds are conservative BUY/HOLD 80/60, moderate 70/45, aggressive 55/35. Judge additionally adjusts for `dataQualityScore` and gates BUY, but the upstream quality value does not reliably reflect partial provider data. Verifier recalculates confidence with different market/sentiment weight ordering and clamps confidence to 25-82; this is not a probability of investment return.

| Question | Finding |
|---|---|
| Deterministic? | The score functions are deterministic for the same numeric inputs. Full workflow is not: news, providers, current time and LLM output vary. |
| Mathematically justified? | No policy document, calibration dataset, out-of-sample results or historical outcomes were found. Constants are reproducible, not validated. |
| Missing data distortion? | Missing penalties exist, but partial quality is not reliably forwarded; neutral imputation and a confidence floor remain. |
| Fair across industries? | Not established; only a Technology text boost is sector-specific. Banks, insurers, REITs, biotech and other sectors are not modeled separately. |
| Can LLM arbitrarily change numeric scores? | The scoring node is deterministic; LLM prose and judge can change verdict, subject to a BUY gate. Verifier changes confidence. |
| Are contradictions handled? | Judge prompt requests synthesis, but no source conflict model or contradiction validator exists. |
| Are confidence and outcome probability distinct? | Code calls it confidence but does not calibrate it against realized outcomes. It should not be interpreted as probability. |
| Can verdict conflict with score? | BUY is gated; HOLD/PASS are not fully constrained by scoring, and verifier confidence does not change verdict. |
| Can score changes be explained? | Component dimensions and weights display, but there is no versioned formula, input delta or as-of comparison. |

These are not proposed replacement thresholds. Any scoring policy needs domain review and empirical validation before values are selected.

## Research Quality and Data Coverage

- **Fundamentals:** selected ratios only; no period-aligned financial statements, restatement history or currency normalization.
- **Stock price/history:** no historical price or technical-indicator pipeline found.
- **Valuation:** P/E and FCF yield cannot establish fair value or whether a good company is attractively priced.
- **News:** headline/keyword sentiment; no deduplication, source ranking or conflict resolution.
- **Competitors:** no validated peer set, market-share source or sector benchmark; current profiles/scores are synthetic.
- **Sources:** SEC filing metadata and some URLs exist, but retrieved source text, quote spans, claim relations and freshness are not stored in the active result path.
- **Company identity:** local catalog has 26 rows; external resolution can accept a ticker-pattern string without proving listing/identity.
- **Freshness:** report does not consistently show source age; Yahoo/Alpha Vantage provider semantics were not checked against external docs during this repository-only audit.

## Security Review (OWASP-Oriented)

| Area | Source-based observation | Assessment and follow-up |
|---|---|---|
| OWASP A01 Broken Access Control | Server actions call `getUserId`; analysis/company queries use user filters; foreign keys bind rows. Middleware checks cookie presence, while pages/routes perform session lookup. | Positive control is visible. Test every API/action against cross-user identifiers, especially status, persistence, compare and support. |
| OWASP A02 Cryptographic Failures | Auth secret fallback exists. DB SSL is enabled only when the connection string contains `neon.tech`. | P0 config risk; require production secrets and verify TLS for the actual provider. |
| OWASP A03 Injection | Drizzle query builder and React text rendering are used. No `dangerouslySetInnerHTML` or `eval` match was found. Sanitizer removes a few prompt phrases but is not prompt-injection defense. | No direct SQL/XSS sink demonstrated in checked paths; prompt injection and CSV formulas remain. |
| OWASP A04 Insecure Design | Financial recommendation uses uncalibrated score and synthetic competitor data. | Critical product trust/safety concern. |
| OWASP A05 Security Misconfiguration | Wildcard trusted-origin entries; public health leaks DB status/error; no security-header policy found in `next.config.mjs`. | Review CSP, HSTS, frame/content/referrer policies and owned origins in deployment. |
| OWASP A06 Vulnerable Components | Production npm audit reports 39 advisories including critical/high findings. | Triage before release and map reachability; advisory count is not evidence of compromise. |
| OWASP A07 Identification/Auth Failures | Better Auth is configured with minimum password length 8; explicit verification/recovery/rate config is absent in inspected source. | Verify library defaults and deployed cookies/origin/rate controls; secret fallback remains a critical issue. |
| OWASP A08 Software/Data Integrity | Lockfile exists; no CI workflow found; `test-all.js` calls external services and writes a Redis key. | Use controlled CI, lockfile review and migration integrity checks. |
| OWASP A09 Logging/Monitoring | Console logs, request ID only on search; provider errors may be printed/returned. | Redact and correlate; no central alert/tracing evidence. |
| OWASP A10 SSRF | Server fetches fixed provider hosts and URL-encodes ticker/query; no arbitrary user URL fetch was found. | No direct SSRF finding in checked paths; triage dependency advisories separately. |
| API resource consumption | Per-process stream/compare limits; support/search/auth lack matching route-level limits; comparison launches two graphs. | Add global budgets and body-size controls; test multi-instance behavior. |
| API sensitive data | Public health route returns pool/error details; support response includes caught error message. | Redact infrastructure detail and test production response bodies. |
| CSRF | Better Auth/Next Server Actions provide library/framework behavior; custom POST routes rely on cookie session and show no explicit app-level Origin/CSRF check. | Test actual browser cross-origin behavior; do not assume protection from source alone. |
| PII/secrets | No environment values were read. Auth emails and support text are stored/sent; a contact fallback is hard-coded. | Define retention/access/privacy. Personal contact information is intentionally not reproduced here. |

No penetration test, external reachability test, or certification was performed. OWASP references are engineering categories, not a compliance claim.

## Exception and Edge-Case Matrix

| Condition | Current behavior from source | User/data impact | Recommended test or control |
|---|---|---|---|
| Empty ticker/search | Search returns empty; stream/compare return 422 after sanitization. | Basic empty case handled. | Whitespace, punctuation-only, Unicode and truncation collisions. |
| Unknown ticker | Resolver may accept any ticker-shaped string; compare uses ticker as name and Unknown sector. | Analysis may be tied to the wrong/unverified issuer. | Confirm symbol/exchange/provider identity and reject ambiguous matches. |
| Long/special input | Ticker truncated to 10 chars, company input to 100; API bodies lack a full schema/body-size policy. | Partial validation, potentially confusing input. | Type/length/body bounds, Unicode and encoded input tests. |
| SQL injection | Inspected DB operations use Drizzle parameterized query builder. | No dynamic SQL sink observed. | Fuzz routes/actions; keep parameterization as primary protection. |
| XSS | No raw HTML sink found; React renders ordinary text. | Lower source-level risk, but not a test result. | Stored/reflected payload tests and security-header review. |
| Missing/partial financials | Null metrics returned; scoring penalizes nulls, but node ignores provider `dataQuality`. | Can look more reliable than it is. | Metric-by-metric fixtures; show degraded state and missing fields. |
| Zero/negative/outlier metrics | `|| null` can lose zero; Zod rejects some bounds; caught failures may become all-null fallback. | Real values can be mistaken for missing or bad data hidden. | Provider-contract fixtures, preserving zero, extreme values and units. |
| Invalid date/RSS | Regex parser and `toISOString()` can fail; outer handler returns empty results. | Silent neutral news result. | Malformed XML/date fixtures and explicit degraded display. |
| Provider HTTP 400/401/403/404/429/5xx | Many non-OK results become empty/null; app routes explicitly use 401/422/429/500/503. | Distinct outage vs no-data may be lost. | Mock every status and assert stable error/degraded state. |
| Network timeout | Fetch default 8s; Yahoo race 8s; LLM abort 20s with maxRetries 2. | Bounded calls, but graph can still degrade rather than fail closed. | Verify total graph deadline and cancellation. |
| Malformed request JSON | Route catch generally returns 500. | Bad request mislabeled server/model error. | Parse/validate request and return 400 with schema error. |
| Invalid/truncated model output | Structured call catches failures and returns fallback. | Fallback may be displayed as normal analysis. | Mark fallback provenance; test invalid/empty/truncated/timeout results. |
| Prompt injection/conflicts | Minimal phrase-strip sanitizer; external text enters LLM context; no conflict reconciliation. | LLM prose can be manipulated or choose one side silently. | Adversarial fixture set, quote/delimit untrusted evidence, conflict disclosure. |
| Duplicate/concurrent requests | No durable idempotency key or lock; queues/rate limits process-local. | Duplicate spend, quota race, stuck records. | Concurrent stream/compare and cross-instance tests. |
| DB outage/recovery | Auth/API checks DB; some analysis path can continue in-memory; local build logged refused connection. | No persistence/auth and incomplete rows may remain. | Down/up transitions, explicit terminal statuses, bounded retries. |
| Redis outage | Optional helper returns no-op on missing/failing config; research cache is not Redis-backed. | Core analysis mostly unaffected; no distributed cache/limit. | Test if Redis is an actual requirement; otherwise remove unused expectation. |
| SMTP failure | Support feedback is inserted before email; catch returns 500. | Retry can duplicate DB record; low-level error may be exposed. | Outbox/idempotency and redacted external error. |
| Process restart/memory pressure | No durable graph checkpoint; Maps are local. | Active run/rate state can be lost. | Restart/load tests in isolated deployment with queue recovery. |

These are source-based assessments. Provider, deployment, browser, high-load and destructive tests were not run.

### Observed HTTP status behavior

| Status | Observed app behavior |
|---|---|
| 400 | No consistent explicit malformed-body response was found. `request.json()` errors reach route-level catches and are generally returned as 500. |
| 401 | Stream, compare, and support routes return an authentication-required response when no session user exists. |
| 403 | No explicit custom 403 response was found in the inspected app routes. Ownership misses may become null/redirect behavior instead. |
| 404 | No explicit analysis API 404 contract found. The analysis page redirects home when lookup returns no record. Provider 404s generally become null/empty fallback data. |
| 422 | Stream/compare use 422 for a missing/invalid sanitized ticker. |
| 429 | Stream/compare apply in-process rate limits; stream also uses quota response in one branch. The analysis-ID branch can bypass quota handling. |
| 500 | Auth DB-offline response, malformed JSON and broad route exceptions can be 500. Support returns a caught error string. |
| 502 | No dedicated 502 mapping found. Upstream non-OK responses often become empty/null research data instead. |
| 503 | Support returns 503 when DB probe is offline; health returns 503 when DB is offline. |

### Data integrity and recovery behavior

| Failure point | Persisted state and recovery observed |
|---|---|
| Provider returns empty/invalid data | Tool often returns empty/null and the graph can still complete; no consistent degraded report status is stored. The user can receive a report with missing data treated as neutral. |
| LLM timeout/schema failure | Wrapper returns deterministic fallback, but fallback provenance is not consistently persisted/displayed. Retrying starts another run; there is no model-call audit trail. |
| Graph/SSE failure | Route emits an error and closes stream but does not mark the analysis record `failed`; record may remain pending/processing. User can retry, potentially duplicating work. |
| Client disconnect/server restart | No cancellation/checkpoint path; state and event queue are in memory. Recovery depends on a new request and available DB record. |
| Result persistence error | Transaction should roll back its own writes, but stream route catches/handles errors around persistence incompletely; completion event may already have reached the client. Verify against a disposable DB. |
| SMTP failure | Feedback row is inserted before email. API can return an error despite the row being committed; user retry can create another row. |
| Concurrent quota requests | Quota uses read-modify-write and usage is incremented later than pending record creation; overrun/race is plausible. No data loss test exists. |

User-facing errors are meaningful for basic auth/ticker/rate-limit cases, but provider degradation is often represented as neutral/partial results rather than a clear failure. Recovery is generally manual retry; durable resume and idempotent retry are absent.

## Database, Reliability, Performance and Operations

**Strengths:** foreign keys/cascades, user-specific company uniqueness, analysis/user indexes, parameterized Drizzle operations, transactional analysis creation/persistence.  
**Risks:** no migrations found; `sources` and usage tables are not fully used; status/verdict values are cast at server-action boundary; quota increment is read-modify-write; no durable queue/checkpoint; DB backups/restore, TLS and retention are unverified.

- Network helper defaults to 8 seconds; LLM wrapper uses 20-second abort and retry count 2; Yahoo uses an 8-second race.
- Research and debate stages partly parallelize; compare doubles graph work.
- No p50/p95, load, memory, token/cost or provider quota measurement exists. Under-90-second claims are unverified.
- No circuit breaker, distributed limiter, durable queue, replay or idempotency framework found.
- Redis is optional and does not serve the research cache or limiter in current call sites.
- Health actively checks PostgreSQL only. Vercel Analytics is not error tracking; structured logs, alerting and cost telemetry are absent.

## Frontend and Accessibility

- Responsive Tailwind layouts and loading/error indicators exist; no automated WCAG 2.2 AA run was performed.
- Search has combobox labeling and some key handling, but full listbox/option semantics and focus management are incomplete.
- Support/auth have labels, but static pages include dead anchor links and legal policy routes were not found.
- Confidence defaults, source mappings and heuristic verdict-driver text can mislead; price target props are not populated by the active pipeline.
- Pricing cards are not connected to payment.

## Not Verified in This Environment

- Real provider/model quality and availability.
- Deployed auth origins/cookies, DB TLS/schema/migrations/backups, Redis and SMTP delivery.
- Concurrency, cost, latency percentiles, multi-instance behavior and browser/accessibility results.
- Exact exploitability of every npm advisory; the audit count is advisory-database output, not proof of compromise.
- Financial outcomes, recommendation hit rate, calibration, suitability, regulatory status or licensing.