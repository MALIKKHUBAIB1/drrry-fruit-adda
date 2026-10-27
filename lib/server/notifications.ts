import "server-only";
import { updateDb, type DbNotification } from "./db";
import { newId } from "./crypto";

const MAX_NOTIFICATIONS = 200;

/** In-app notification daalo (admin audience ya specific user). Best-effort. */
export async function notify(n: {
  audience: "admin" | "user";
  userId?: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const doc: DbNotification = {
    id: newId("N-"),
    audience: n.audience,
    ...(n.audience === "user" && n.userId ? { userId: n.userId } : {}),
    title: n.title,
    body: n.body,
    link: n.link,
    readBy: [],
    createdAt: new Date().toISOString(),
  };
  await updateDb((db) => {
    db.notifications.unshift(doc);
    if (db.notifications.length > MAX_NOTIFICATIONS) {
      db.notifications.length = MAX_NOTIFICATIONS;
    }
  });
  return doc;
}
