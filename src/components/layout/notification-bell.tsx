import Link from "next/link";
import { unreadCount } from "@/lib/notifications";

export async function NotificationBell({ userId }: { userId: string }) {
  const count = await unreadCount(userId);

  return (
    <Link
      href="/notifications"
      aria-label={count ? `Notifications (${count} unread)` : "Notifications"}
      className="relative grid size-10 place-items-center rounded-full hover:bg-muted"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
