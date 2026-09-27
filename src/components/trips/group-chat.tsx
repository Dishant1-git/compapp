"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { sendMessage } from "@/lib/trips/actions";
import type { ChatMessage } from "@/lib/trips/chat";
import type { ActionState } from "@/lib/trips/types";
import { cn } from "@/lib/utils";

const POLL_MS = 4000;

const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });
const day = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

export function GroupChat({
  tripId,
  initial,
  canPost,
}: {
  tripId: string;
  initial: ChatMessage[];
  canPost: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const listRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(initial.at(-1)?.createdAt);

  const poll = useCallback(async () => {
    const after = lastRef.current ? `?after=${encodeURIComponent(lastRef.current)}` : "";
    try {
      const res = await fetch(`/api/trips/${tripId}/messages${after}`, { cache: "no-store" });
      if (!res.ok) return;
      const { messages: fresh } = (await res.json()) as { messages: ChatMessage[] };
      if (!fresh.length) return;
      lastRef.current = fresh.at(-1)!.createdAt;
      setMessages((current) => {
        const seen = new Set(current.map((m) => m.id));
        return [...current, ...fresh.filter((m) => !seen.has(m.id))];
      });
    } catch {
      // Offline or server hiccup — try again on the next tick.
    }
  }, [tripId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [poll]);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await sendMessage(tripId, prev, formData);
      if (result.success) await poll();
      return result;
    },
    {},
  );

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-96 flex-col overflow-hidden rounded-xl border bg-card md:h-[calc(100dvh-13rem)]">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3 sm:p-5" aria-live="polite">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Say hi to your group!
          </p>
        )}
        {messages.map((m, i) => {
          const d = day.format(new Date(m.createdAt));
          const prev = messages[i - 1];
          const showDay = !prev || day.format(new Date(prev.createdAt)) !== d;
          return (
            <div key={m.id}>
              {showDay && (
                <p className="my-3 text-center text-xs font-medium text-muted-foreground">{d}</p>
              )}
              {m.kind === "system" ? (
                <p className="text-center text-xs text-muted-foreground">{m.body}</p>
              ) : (
                <div className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 sm:max-w-[70%]",
                      m.mine ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {!m.mine && m.author && (
                      <p className="mb-0.5 text-xs font-semibold">
                        {m.author.name}
                        {m.author.isAgency && <span className="font-normal opacity-70"> · Agency</span>}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={cn("mt-0.5 text-right text-[10px]", m.mine ? "opacity-70" : "text-muted-foreground")}>
                      {time.format(new Date(m.createdAt))}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canPost ? (
        <form action={action} className="flex items-end gap-2 border-t p-2 sm:p-3">
          <label htmlFor="chat-body" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-body"
            name="body"
            rows={1}
            maxLength={1000}
            required
            placeholder="Message the group…"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button type="submit" disabled={pending} className="shrink-0">
            Send
          </Button>
        </form>
      ) : (
        <p className="border-t p-3 text-center text-sm text-muted-foreground">
          You&apos;re viewing this group as an admin (read-only).
        </p>
      )}
      {state.message && <p className="px-3 pb-2 text-sm text-destructive">{state.message}</p>}
    </div>
  );
}
