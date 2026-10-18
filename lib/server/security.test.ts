import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rateLimit, safeUrl } from "./security.ts";

describe("safeUrl", () => {
  it("rejects dangerous javascript and protocol-relative URLs", () => {
    assert.equal(safeUrl("javascript:alert(1)"), "");
    assert.equal(safeUrl("//evil.example"), "");
    assert.equal(safeUrl("https://example.com/products"), "https://example.com/products");
    assert.equal(safeUrl("/products"), "/products");
  });
});

describe("rateLimit", () => {
  it("resets the bucket once the time window expires exactly", () => {
    const key = "rate-limit-window-boundary";
    const realNow = Date.now;
    let now = 1_000;
    Date.now = () => now;

    try {
      const first = rateLimit(key, 2, 1_000);
      const second = rateLimit(key, 2, 1_000);

      assert.equal(first.ok, true);
      assert.equal(second.ok, true);
      assert.equal(second.remaining, 0);

      now = 2_000;
      const reset = rateLimit(key, 2, 1_000);

      assert.equal(reset.ok, true);
      assert.equal(reset.remaining, 1);
    } finally {
      Date.now = realNow;
    }
  });
});
