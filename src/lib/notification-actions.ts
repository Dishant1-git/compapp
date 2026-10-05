"use server";

import { revalidatePath } from "@/lib/revalidate";
import { requireUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Notification } from "@/lib/db/models/notification";
import { isFrontend, remoteAction } from "@/lib/remote";

export async function markAllNotificationsRead() {
  if (isFrontend()) return remoteAction("notification-actions.markAllNotificationsRead", []);
  const user = await requireUser("/notifications");
  await connectDB();
  await Notification.updateMany({ user: user.id, read: false }, { read: true });
  revalidatePath("/", "layout");
}
