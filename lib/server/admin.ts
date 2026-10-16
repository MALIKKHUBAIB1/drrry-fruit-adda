import type { NextRequest } from "next/server";
import { getSessionUser } from "./auth";

/** Admin-only routes ke liye guard. null = allowed, Response init = deny. */
export async function requireAdmin(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return { status: 401 as const, user: null };
  if (!user.isAdmin) return { status: 403 as const, user: null };
  return { status: 200 as const, user };
}

export const ADMIN_DENIED = (status: 401 | 403) =>
  status === 401 ? "Login required." : "Admin access required.";
