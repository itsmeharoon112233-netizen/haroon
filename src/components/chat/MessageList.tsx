"use client";

import { memo } from "react";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import type { ChatMessage } from "@/types/chat";
import { ArrowDownIcon } from "../ui/Icons";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  conversationId: string;
  messages: ChatMessage[];
  isBusy: boolean;
  onRegenerate: () => void;
}

export const MessageList = memo(function MessageList({ conversationId, messages, isBusy, onRegenerate }: MessageListProps) {
  const last = messages[messages.length - 1];
  const { ref, onScroll, atBottom, scrollToBottom } = useAutoScroll<HTMLDivElement>([
    conversationId,
    messages.length,
    last?.content,
    last?.status,
  ]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={ref}
        onScroll={onScroll}
        className="scroll-quiet h-full overflow-y-auto overscroll-contain"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 pt-6 pb-10 sm:px-6">
          {messages.map((m, i) => (
            <MessageItem
              key={m.id}
              message={m}
              canRegenerate={i === messages.length - 1 && m.role === "assistant" && !isBusy}
              onRegenerate={onRegenerate}
            />
          ))}
        </div>
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute bottom-3 left-1/2 inline-flex size-10 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-soft transition-colors hover:bg-surface-2"
          aria-label="Scroll to latest message"
        >
          <ArrowDownIcon size={18} />
        </button>
      )}
    </div>
  );
});
