// Password hashing + id/token helpers. No DB imports here
// taaki db.ts se circular dependency na bane.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string, salt?: string) {
  const s = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return { salt: s, hash };
}

export function verifyPassword(password: string, salt: string, hash: string) {
  try {
    const h = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (h.length !== expected.length) return false;
    return timingSafeEqual(h, expected);
  } catch {
    return false;
  }
}

export function newId(prefix = "") {
  return `${prefix}${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function newToken() {
  return randomBytes(32).toString("hex");
}
