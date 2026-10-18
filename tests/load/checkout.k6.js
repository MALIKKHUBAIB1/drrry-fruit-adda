// k6 load test — configurable VUs + duration, LOCAL/STAGING ONLY.
//   k6 run -e BASE_URL=http://localhost:3100 -e VUS=20 -e DURATION=30s tests/load/checkout.k6.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";

const BASE = __ENV.BASE_URL || "http://localhost:3100";
const VUS = Number(__ENV.VUS || 10);
const DURATION = __ENV.DURATION || "30s";

const errors = new Counter("errors");
const lat = new Trend("req_duration", true);
const failRate = new Rate("failed_requests");

export const options = {
  scenarios: {
    browse: { executor: "ramping-vus", startVUs: 0, stages: [
      { target: VUS, duration: "10s" },
      { target: VUS, duration: DURATION },
      { target: 0, duration: "5s" },
    ] },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};

const PUBLIC = ["/", "/shop", "/product/premium-almonds", "/api/products", "/api/categories"];

export default function () {
  const path = PUBLIC[Math.floor(Math.random() * PUBLIC.length)];
  const res = http.get(`${BASE}${path}`, { tags: { path } });
  lat.add(res.timings.duration);
  const ok = check(res, { "status 200": (r) => r.status === 200 });
  failRate.add(!ok);
  if (!ok) errors.add(1);
  sleep(Math.random() * 2);
}
