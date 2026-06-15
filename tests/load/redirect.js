/**
 * k6 redirect benchmark — measures GET /:code latency under load.
 *
 * Prerequisites: docker compose up -d && npm run dev && npm run db:seed
 *
 * Via Docker (no local k6 install needed):
 *   docker run -i grafana/k6 run -e BASE_URL=http://host.docker.internal:3000 - < tests/load/redirect.js
 *   Note: host.docker.internal resolves to the host on Docker Desktop (Windows/Mac).
 *         On Linux, use the Docker bridge IP (e.g. 172.17.0.1) instead.
 *
 * With k6 installed locally:
 *   k6 run tests/load/redirect.js
 *
 * Against production (warm up the instance first — Render free tier sleeps):
 *   docker run -i grafana/k6 run -e BASE_URL=https://linkforge-538y.onrender.com - < tests/load/redirect.js
 *
 * Rate-limit note:
 *   @fastify/rate-limit caps the redirect endpoint at 100 req/min per IP.
 *   This is a production safeguard, not a server capacity limit.
 *   To measure raw throughput locally, temporarily raise RATE_LIMIT_MAX in your .env.
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
// 'launch1' is always present after `npm run db:seed`.
const SHORT_CODE = __ENV.SHORT_CODE || 'launch1';

export const options = {
  stages: [
    { duration: '20s', target: 100 }, // ramp 0 → 100 VUs
    { duration: '30s', target: 100 }, // hold at peak
    { duration: '10s', target: 0 },   // ramp down
  ],
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    // Informational targets — not enforced in CI (load tests are manual only).
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/${SHORT_CODE}`, {
    // Stop at the 302 — we measure the server response, not the target URL.
    redirects: 0,
  });

  check(res, { 'status is 302': (r) => r.status === 302 });
}
