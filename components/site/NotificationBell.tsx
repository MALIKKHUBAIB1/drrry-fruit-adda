"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title: string;
  body?: string;
  link?: string;
  readBy: string[];
  createdAt: string;
};

/** Site header + admin header dono me yahi bell. 30s par poll + focus refresh. */
export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    try {
      const r = await fetch("/api/notifications", { credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      setList(d.notifications ?? []);
      setUnread(d.unreadCount ?? 0);
    } catch {
      /* offline — next poll par theek */
    }
  };

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 30_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id]);

  if (!user) return null;

  const markRead = (ids?: string[]) => {
    setUnread((u) => Math.max(0, ids ? u - (ids.length) : 0));
    setList((l) =>
      l.map((n) =>
        (ids ? ids.includes(n.id) : true) && !n.readBy.includes(user.id)
          ? { ...n, readBy: [...n.readBy, user.id] }
          : n,
      ),
    );
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(ids ? { ids } : { all: true }),
    }).catch(() => {});
  };

  const onItemClick = (n: Notif) => {
    setOpen(false);
    if (!n.readBy.includes(user.id)) markRead([n.id]);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        className="relative rounded-full p-2 hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notifications
              </p>
              {unread > 0 && (
                <button
                  onClick={() => markRead()}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {list.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </li>
              )}
              {list.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => onItemClick(n)}
                    className={cn(
                      "block w-full border-b border-border/50 px-3 py-2.5 text-left last:border-0 hover:bg-muted",
                      !n.readBy.includes(user.id) && "bg-primary/[0.04]",
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm",
                        !n.readBy.includes(user.id)
                          ? "font-semibold text-foreground"
                          : "text-foreground/80",
                      )}
                    >
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;
