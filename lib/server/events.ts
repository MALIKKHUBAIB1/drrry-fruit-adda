// In-process pub/sub for live order updates.
// Single-process friendly (local dev / `next start`). SSE endpoint reads from here.
import type { DbOrderStatus } from "./db";

export const ORDER_STATUSES: DbOrderStatus[] = [
  "placed",
  "packed",
  "shipped",
  "out-for-delivery",
  "delivered",
  "cancelled",
];

export const STATUS_LABEL: Record<DbOrderStatus, string> = {
  placed: "Order Placed",
  packed: "Packed",
  shipped: "Shipped",
  "out-for-delivery": "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

type Listener = (evt: { orderId: string; status: string }) => void;

// Next.js bundles every route separately, so a module-level Set would be a
// *different* copy per route (dev mode especially). Storing on globalThis keeps
// one shared registry per Node process so publish() reaches every open stream.
const GLOBAL_KEY = "__dfa_order_listeners__";
const store = globalThis as unknown as Record<string, Set<Listener> | undefined>;
const listeners: Set<Listener> = (store[GLOBAL_KEY] ??= new Set<Listener>());

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function publish(evt: { orderId: string; status: string }) {
  for (const fn of [...listeners]) {
    try {
      fn(evt);
    } catch {
      // dead listener — ignore
    }
  }
}

export const isOrderStatus = (v: string): v is DbOrderStatus =>
  (ORDER_STATUSES as string[]).includes(v);