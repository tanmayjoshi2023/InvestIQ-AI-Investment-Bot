# InvestIQ Future Roadmap

**Audit date:** 2026-11-15. This is a recommended sequence from the source audit, not an implementation plan already approved. No code fixes were made during the assessment.

## Priority Definitions

- **P0 - Critical:** security, financial integrity, factual misrepresentation, or severe release blockers. Must fix before production use.
- **P1 - High:** core reliability, validation, lifecycle, authorization, or essential user workflow. Fix before broad public release.
- **P2 - Medium:** maintainability, testing depth, observability, accessibility, performance and transparency improvements.
- **P3 - Low:** optional expansion after the core is trustworthy.

Complexity uses S/M/L/XL as relative engineering effort, not a schedule estimate.

## Priority Register

| ID | Priority / release gate | Evidence and impact | Recommended outcome | Complexity / dependencies |
|---|---|---|---|---|
| R1 | P0 - Must fix before production | `lib/auth.ts` has a hard-coded fallback when auth secret is absent; public deployment with missing environment configuration would share a known secret | Fail closed in production when secret is absent; separate build-time config from runtime auth; narrow trusted origins; verify cookie/session settings | S-M; deployment environment and auth integration tests |
| R2 | P0 - Must fix before production | `npm audit --omit=dev` reported 39 production-tree advisories: 5 critical, 17 high, 14 moderate, 3 low. Next.js 16.2.6, NextAuth and transitive packages are among flagged packages | Review advisories and reachability, update to supported patched versions without unreviewed force upgrades, regenerate lockfile, run full test/build/security checks | M-L; dependency compatibility, especially Next/AI/Auth, CI |
| R3 | P0 - Must fix before public investment use | `verifier.ts` counts `sourceIndex > 0`, not source validity or semantic support; `VerdictCard` can claim 100% grounding when uncited list is empty; competitor node fabricates profiles/scores | Implement source-object provenance and claim-to-source evaluation; mark unverified claims; remove # InvestIQ Future Roadmap

**Audit date:** 2026-11-15. This is a recommended sequence from the source audit, not an implementation plan already approved. No code fixes were made during the assessment.

## Priority Definitions

- **P0 - Critical:** security, financial integrity, factual misrepresentation, or severe release blockers. Must fix before production use.
- **P1 - High:** core reliability, validation, lifecycle, authorization, or essential user workflow. Fix before broad public release.
- **P2 - Medium:** maintainability, testing depth, observability, accessibility, performance and transparency improvements.
- **P3 - Low:** optional expansion after the core is trustworthy.

Complexity uses S/M/L/XL as relative engineering effort, not a schedule estimate.

## Priority Register

| ID | Priority / release gate | Evidence and impact | Recommended outcome | Complexity / dependencies |
|---|---|---|---|---|
| R1 | P0 - Must fix before production | `lib/auth.ts` has a hard-coded fallback when auth secret is absent; public deployment with missing environment configuration would share a known secret | Fail closed in production when secret is absent; separate build-time config from runtime auth; narrow trusted origins; verify cookie/session settings | S-M; deployment environment and auth integration tests |
| R2 | P0 - Must fix before production | `npm audit --omit=dev` reported 39 production-tree advisories: 5 critical, 17 high, 14 moderate, 3 low. Next.js 16.2.6, NextAuth and transitive packages are among flagged packages | Review advisories and reachability, update to supported patched versions without unreviewed force upgrades, regenerate lockfile, run full test/build/security checks | M-L; dependency compatibility, especially Next/AI/Auth, CI |
| R3 | P0 - Must fix before public investment use | `verifier.ts` counts `sourceIndex > 0`, not source validity or semantic support; `VerdictCard` can claim 100% grounding when uncited list is empty; competitor node fabricates profiles/scores | Implement source-object provenance and claim-to-source evaluation; mark unverified claims; remove unsupported verification/market claims; fail closed for absent evidence | L-XL; data/provider contract and source storage |
| R4 | P0 - Must fix before public recommendation claims | Score constants and thresholds have no evidence of empirical validation; inputs omit price history and sector-specific accounting | Define an explicit investment policy with qualified quant review; build frozen historical datasets and out-of-sample tests; avoid claiming calibrated advice until accepted | XL; licensed/history data, corporate actions, benchmark policy, independent review |
| R5 | P1 - Must fix before broad release | Financial node maps `stale` but ignores provider missing-metric `dataQuality`; partial response may retain `dataQualityScore=1` | Carry per-field availability, provider/source, timestamps and failure state into graph; minimum-evidence policy; reflect degradation to user | M-L; provider fixtures, result schema |
| R6 | P1 - Must fix before broad release | Parallel citation index calculations can collide; verifier accepts any positive index | Use stable citation IDs; validate index existence, source URL, claim relation and source timestamp; test graph merge ordering | M; source model and UI contracts |
| R7 | P1 - Must fix before broad release | Stream failures leave status processing; retries/refreshes can duplicate work; no graph checkpoint or cancellation | Explicit lifecycle state machine, atomic idempotent reservation, timeout/cancel handling, failed/recoverable state, durable worker if needed | L; DB schema/transactions, hosting runtime limits |
| R8 | P1 - Must fix before public release | Analysis ID branch can skip quota checks; compare persistence skips usage increments; concurrency can race read-modify-write quotas | Centralize authorization/quota reservation, make atomic, cover every analysis route, define compare charge policy, test parallel requests | M-L; subscription policy and DB transaction model |
| R9 | P1 - Must fix before public release | Paid tiers displayed without payment; pricing caps and backend plan logic disagree | Either remove paid claims or implement provider checkout/webhooks, entitlements, reconciliation, cancellation and support states | L; product/legal/payment decisions |
| R10 | P1 - Must fix before public research use | News tool uses keyword sentiment/title snippets; provider failures yield neutral results without clear report-level degraded state | Use source-quality/freshness, deduplication and article content; build curated sentiment set; show source and limitations; do not treat silence as neutral evidence | L; content rights/provider agreement, evaluation corpus |
| R11 | P1 - Must fix before public research use | Competitor search does not create actual peer set; financial ratios are not parsed statements; no market/price/technical history | Add real validated peer resolution and actual peer data; financial statement normalization; price/valuation context only if licensable and tested | XL; data contracts, sector models |
| R12 | P1 | Health endpoint exposes DB error/pool detail; support sends raw caught errors; health only probes DB | Redact responses, separate liveness/readiness, actively probe required services with short timeouts, keep detailed diagnostics private | S-M; deployment monitor contract |
| R13 | P1 | Support endpoint has no dedicated throttle/strict schema; DB insert can precede SMTP failure and be duplicated on retry | Validate body/lengths and email headers, add idempotency/throttle and durable email outbox, expose stable error codes | M; DB job/outbox and mail integration |
| R14 | P2 | Five unit tests only; no route, integration, browser, accessibility, security, concurrency or scoring evaluation suite | Adopt the plan in `TESTING_AND_EVALUATION.md`; build provider fixtures and CI gates; track measured results without claiming financial truth | L; test harness, fixtures, CI |
| R15 | P2 | Full lint has 39 errors and 22 warnings; unused wrappers/deps and standalone graph remain | Resolve issues by category; remove dead code/dependencies only after usage/build verification; lint only becomes a release gate when actionable | M-L; refactor budget, CI |
| R16 | P2 | No migration files found although migration code/config points to a directory | Establish reviewed migration generation, apply/rollback procedure, schema-diff CI and backups | M; existing DB baseline, owner/operator |
| R17 | P2 | Rate limit/research cache are process-local; Redis cache helper methods have no callers | Decide deployment topology; use shared storage for cross-instance budgets if needed; coalesce in-flight requests; bound cache memory | M; Redis SLO and cost review |
| R18 | P2 | Console-only logs and null token/cost fields; Vercel analytics does not show agent/provider failures | Add redacted structured logs, trace/correlation IDs, per-stage latency/error/token/cost and alert thresholds | M-L; privacy policy and telemetry sink |
| R19 | P2 | Report CSV quoting does not neutralize spreadsheet formulas; exports omit citations/freshness | Formula-safe escaping, add source list and as-of/disclaimer fields, test long PDF pagination and time zones | S-M; export contract |
| R20 | P2 | Search/accessibility/legal navigation gaps and untested mobile states | WCAG 2.2 AA review, keyboard/screen-reader tests, focus/error/loading/empty states, remove dead anchors | M; UX/design review |
| R21 | P3 | Portfolio/watchlist/backtest tables exist without workflows; historical score-change, alerts and earnings tools are absent | Prioritize only after core validation and user research; avoid expanding schema/UI without end-to-end product contracts | M-XL; strategy and data availability |

## Recommended Implementation Sequence

### Gate 0: Contain release risk

1. Confirm production environment and auth secret requirements; remove reliance on a built-in secret fallback and narrow origins.
2. Triage dependency advisories and establish supported patched versions. Do not run force upgrades without compatibility review.
3. Suspend or rewrite UI claims that imply verified facts, accurate competitors, measured probabilities or guaranteed latency until evidence supports them.
4. Decide whether this is an informational research prototype or an advice-adjacent product; obtain legal/compliance review before public recommendations.

**Exit criteria:** no known critical package advisory left untriaged; auth fails closed on bad configuration; report output is explicitly informational and does not label unchecked claims verified.

### Gate 1: Make evidence auditable

1. Define canonical schemas for source, claim, metric, period, currency, retrieval timestamp and quality.
2. Make all nodes return explicit available/partial/unavailable/error states and source provenance.
3. Resolve stable citation IDs before or after parallel merge; add claim/source tests.
4. Replace synthetic competitor score and empty-result neutral assumptions with real evidence or explicit unavailable output.
5. Add stale-data and source-conflict behavior.

**Dependency:** reliable provider mappings and a documented source policy.

### Gate 2: Review and validate scoring

1. Write down the intended meaning of each score and whether higher risk means safer or riskier.
2. Quantitative review of ratios, units, thresholds and sector-specific applicability.
3. Build a survivorship-aware, corporate-action-aware historical fixture and freeze inputs/labels.
4. Compare to simple baselines; evaluate sector and market-cap subgroups; version every score policy.
5. Keep recommendation confidence separate from source/data quality and calibrated outcome probability.

**Exit criteria:** published methodology, known limitations, deterministic tests, out-of-sample results with uncertainty; no threshold is accepted solely because it looks intuitive.

### Gate 3: Harden workflow and billing

1. Add analysis state transitions, failure persistence, cancellation and idempotency.
2. Make quota reservation atomic and apply it uniformly to stream and compare.
3. Define free/paid entitlements; connect payment events or remove payment language.
4. Integrate durable queues/checkpointing only if hosting/request constraints require them.

### Gate 4: Add testing and production operations

1. Unit/property tests for data parsing, scoring, citations, policy and exports.
2. Integration tests with mocked provider contracts and disposable PostgreSQL.
3. E2E tests for auth, analyze, history, compare, export, support and failures.
4. Security checks for ownership, auth, CSRF/origins, rate limits, XSS/CSV, dependency lockfile.
5. Structured redacted logs, provider/agent metrics, health/readiness and alarms.
6. CI gates for typecheck, lint, test, build, migration check and dependency audit.

### Gate 5: Improve product UX, then expand

1. Show data coverage/freshness/source quality and why each score changed.
2. Improve search and all loading/empty/error states; complete WCAG and mobile checks.
3. Add sector benchmarks/price history only with defensible data rights and validation.
4. Consider earnings/event monitoring, thesis tracking, portfolio and watchlists after the core meets evidence/reliability gates.

## Before Production / Public Release / Later

- **Must fix before production:** R1-R4; also triage every critical dependency advisory and confirm database/TLS/auth configuration.
- **Should fix before public release:** R5-R13 and R14 baseline tests; evidence quality, workflow terminal states and quota consistency are product-critical.
- **Important follow-up:** R14-R20 operational quality, migrations, distributed limits, observability and accessibility.
- **Optional expansion:** R21 and additional advanced financial products. Do not add a portfolio/backtesting promise based only on schema tables.

## Decision Gates and Owners

Before implementation, assign accountable owners for security/auth (R1-R2), research/data contracts (R3/R5/R6/R10/R11), quantitative policy (R4), backend workflow/billing (R7-R9), quality/operations (R14-R20), and product/legal review. Re-run the audit after each gate and update evidence labels; do not mark a feature complete because a table or component exists.