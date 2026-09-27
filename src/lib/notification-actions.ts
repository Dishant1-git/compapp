"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/dal";
import { connectDB } from "@/lib/db/mongoose";
import { Notification } from "@/lib/db/models/notification";

export async function markAllNotificationsRead() {
  const user = await requireUser("/notifications");
  await connectDB();
  await Notification.updateMany({ user: user.id, read: false }, { read: true });
  revalidatePath("/", "layout");
}
