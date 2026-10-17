"use client";

import { useEffect, useRef, useState } from "react";

// Live order updates via SSE, with polling fallback.
export function useOrderStream(orderId: string | null, onUpdate: () => void) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let closed = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;

    const startPolling = () => {
      if (poll || closed) return;
      poll = setInterval(() => cb.current(), 10_000);
    };

    try {
      es = new EventSource("/api/orders/stream");
      es.onopen = () => {
        if (!closed) setLive(true);
        if (poll) {
          clearInterval(poll);
          poll = null;
        }
      };
      es.onmessage = (e) => {
        if (closed) return;
        try {
          const data = JSON.parse(e.data);
          if (data.type === "order" && data.orderId === orderId) cb.current();
        } catch {
          // ignore malformed
        }
      };
      es.onerror = () => {
        if (closed) return;
        setLive(false);
        try {
          es?.close();
        } catch {}
        es = null;
        startPolling();
      };
    } catch {
      startPolling();
    }

    const initial = setTimeout(() => cb.current(), 400);

    return () => {
      closed = true;
      clearTimeout(initial);
      if (poll) clearInterval(poll);
      try {
        es?.close();
      } catch {}
    };
  }, [orderId]);

  return live;
}