# ADR 0007 — Redirect latency baseline

**Status:** accepted • **Date:** 2026-06

## Context

ADR 0005 decided that `GET /:code` should enqueue the click fire-and-forget so
that redirect latency is bounded by the Redis cache lookup, not by DB writes,
UA parsing, or geo-resolver calls. The reasoning is sound, but the claim was
never backed by a measurement.

Without a documented baseline, it is impossible to detect regressions or verify
that the architectural bet paid off.

## Decision

Establish a reproducible baseline using a k6 script (`tests/load/redirect.js`):
100 VUs, ~60 s total (20 s ramp, 30 s plateau, 10 s ramp-down). The reference
run is done locally against Docker Compose so that the Render free-tier rate
limit (100 req/min per IP) does not cap the results.

The redirect URL (`redirects: 0` in k6) measures only the server response time,
not the latency of the target URL.

Results — local run, Docker Compose (Postgres + Redis), cache warm, 2026-06-15:

| Metric | Value    |
|--------|----------|
| p50    | 45 ms    |
| p90    | 83 ms    |
| p95    | 88 ms    |
| p99    | 103 ms   |
| req/s  | ~1 530   |

_Reproduce with (see script header for full prerequisites):_
```bash
docker run -i grafana/k6 run -e BASE_URL=http://host.docker.internal:3000 - < tests/load/redirect.js
```

All 91 936 requests returned 302. Zero failures. Both thresholds passed
(`p(95)<200ms`, `error rate<1%`).

## Consequences

- Numbers confirm ADR 0005's claim: redirect latency is bounded by the Redis
  cache lookup, not by downstream side effects (DB writes, UA parsing, geo).
  Even at 100 VUs the p99 stays under 110 ms.
- Figures are measured through Docker Desktop networking (k6 container → host →
  app → Redis), which adds a network hop vs. a native run. Real latency on a
  co-located server would be lower.
- The production rate limit (100 req/min per IP, via `@fastify/rate-limit`) caps
  Render throughput at ~1.7 req/s — not representative of server capacity.
  Set `RATE_LIMIT_MAX=1000000` in `.env` to disable it for local benchmarking.
- Load tests are **manual only** — Render free tier sleeps after 15 min, which
  would make automated CI runs noisy and misleading.
- The baseline is a snapshot, not a contract. Re-run the script if the redirect
  path or cache strategy changes significantly.
