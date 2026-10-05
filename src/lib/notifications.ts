import "server-only";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { Notification } from "@/lib/db/models/notification";
import { isFrontend, remoteCall } from "@/lib/remote";

type Id = string | Types.ObjectId;

/** Send an in-app notification to one or more users. Never throws — notifications are best-effort. */
export async function notify(
  users: Id | Id[],
  notification: { title: string; body?: string; href?: string },
) {
  if (isFrontend()) return remoteCall("notifications.notify", [users, notification]);
  const ids = (Array.isArray(users) ? users : [users]).map(String);
  if (!ids.length) return;
  try {
    await Notification.insertMany(ids.map((user) => ({ user, ...notification })));
  } catch (error) {
    console.error("Failed to send notification", error);
  }
}

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  href?: string;
  read: boolean;
  createdAt: string;
};

export async function unreadCount(userId: string) {
  if (isFrontend()) return remoteCall("notifications.unreadCount", [userId]);
  await connectDB();
  return Notification.countDocuments({ user: userId, read: false });
}

export async function listNotifications(userId: string): Promise<NotificationItem[]> {
  if (isFrontend()) return remoteCall("notifications.listNotifications", [userId]);
  await connectDB();
  const items = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean();
  return items.map((n) => ({
    id: String(n._id),
    title: n.title,
    body: n.body ?? undefined,
    href: n.href ?? undefined,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
}
