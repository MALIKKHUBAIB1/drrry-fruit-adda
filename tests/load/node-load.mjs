// Node fallback for k6 (k6 not installed). Same knobs.
//   node tests/load/node-load.mjs --vus=20 --duration=20 --base=http://localhost:3100
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const VUS = Number(args.vus || 10);
const DUR = Number(args.duration || 15);
const BASE = args.base || "http://localhost:3100";
const local = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(BASE);
if (!local && process.env.ALLOW_REMOTE_LOAD !== "1") {
  console.error("Refusing non-local load test. Set ALLOW_REMOTE_LOAD=1 for staging only.");
  process.exit(1);
}
const PATHS = ["/", "/shop", "/product/premium-almonds", "/api/products", "/api/categories"];
const lat = [];
let fails = 0;
const t0 = Date.now();
while ((Date.now() - t0) / 1000 < DUR) {
  const batch = await Promise.all(
    Array.from({ length: VUS }, async () => {
      const p = PATHS[Math.floor(Math.random() * PATHS.length)];
      const s = Date.now();
      try {
        const r = await fetch(BASE + p);
        lat.push(Date.now() - s);
        if (!r.ok) fails++;
      } catch { fails++; }
    }),
  );
  void batch;
  await new Promise((r) => setTimeout(r, 200));
}
lat.sort((a, b) => a - b);
const p = (q) => lat[Math.floor(lat.length * q)] ?? 0;
console.log(JSON.stringify({
  target: BASE, vus: VUS, durationSec: DUR, requests: lat.length,
  failRate: (fails / Math.max(lat.length, 1)).toFixed(4),
  p50_ms: p(0.5), p95_ms: p(0.95), p99_ms: p(0.99), max_ms: lat.at(-1),
}, null, 2));
