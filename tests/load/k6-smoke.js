import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_duration: ["p(95)<1000"],
    http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";

export default function () {
  const home = http.get(`${BASE_URL}/`);
  check(home, {
    "home status is 200": (r) => r.status === 200,
    "home HTML contains Dryfruit Adda": (r) => r.body.includes("Dryfruit Adda") || r.body.includes("Nature's Finest"),
  });

  const shop = http.get(`${BASE_URL}/shop`);
  check(shop, {
    "shop status is 200": (r) => r.status === 200,
    "product list renders": (r) => r.body.includes("Shop") || r.body.includes("products"),
  });

  sleep(1);
}
