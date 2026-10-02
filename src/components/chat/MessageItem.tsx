"use client";

import { memo, useState } from "react";
import { siteConfig } from "@/config/site";
import { cn, copyText, formatDateTime, formatTime } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";
import { LogoMark } from "../brand/Logo";
import { AlertIcon, CheckIcon, CopyIcon, RefreshIcon, UserIcon } from "../ui/Icons";
import { useToast } from "../ui/Toast";
import { Markdown } from "./Markdown";

interface MessageItemProps {
  message: ChatMessage;
  /** True for the newest assistant reply — the only one that can be regenerated. */
  canRegenerate: boolean;
  onRegenerate: () => void;
}

export const MessageItem = memo(function MessageItem({ message, canRegenerate, onRegenerate }: MessageItemProps) {
  return message.role === "user" ? (
    <UserMessage message={message} />
  ) : (
    <AssistantMessage message={message} canRegenerate={canRegenerate} onRegenerate={onRegenerate} />
  );
});

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <article className="message-enter flex justify-end gap-3" aria-label="Your message">
      <div className="flex min-w-0 max-w-[85%] flex-col items-end sm:max-w-[75%]">
        <div className="rounded-2xl rounded-br-md bg-pine px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-on-pine [overflow-wrap:anywhere]">
          {message.content}
        </div>
        <time dateTime={new Date(message.createdAt).toISOString()} title={formatDateTime(message.createdAt)} className="mt-1 px-1 text-xs text-muted">
          {formatTime(message.createdAt)}
        </time>
      </div>
      <div className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted sm:flex" aria-hidden="true">
        <UserIcon size={16} />
      </div>
    </article>
  );
}

function AssistantMessage({ message, canRegenerate, onRegenerate }: MessageItemProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";
  const isEmptyStreaming = isStreaming && !message.content;

  const copy = async () => {
    if (await copyText(message.content)) {
      setCopied(true);
      toast("Response copied");
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast("Couldn't copy — select the text and copy it manually", "error");
    }
  };

  return (
    <article className="message-enter group flex gap-3" aria-label={`${siteConfig.assistantName} reply`} aria-busy={isStreaming}>
      <LogoMark size={32} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2 text-sm">
          <span className="font-display font-semibold">{siteConfig.assistantName}</span>
          <time dateTime={new Date(message.createdAt).toISOString()} title={formatDateTime(message.createdAt)} className="text-xs text-muted">
            {formatTime(message.createdAt)}
          </time>
        </div>

        {isEmptyStreaming ? (
          <TypingIndicator />
        ) : (
          message.content && (
            <div className={cn("prose-xpert text-[15px]", isStreaming && "streaming-caret")}>
              <Markdown content={message.content} />
            </div>
          )
        )}

        {message.status === "stopped" && (
          <p className="mt-2 text-xs text-muted">{message.content ? "Stopped." : "Stopped before replying."}</p>
        )}

        {isError && (
          <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-danger/25 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            <AlertIcon size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">{message.error}</span>
            {canRegenerate && (
              <button type="button" onClick={onRegenerate} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-danger/30 px-3 font-medium transition-colors hover:bg-danger/10">
                <RefreshIcon size={14} /> Retry
              </button>
            )}
          </div>
        )}

        {!isStreaming && !isError && message.content && (
          <div className="mt-1.5 -ml-2 flex items-center gap-0.5 text-muted opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
            <button type="button" onClick={copy} className="icon-btn !size-9" aria-label="Copy response" title="Copy">
              {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            </button>
            {canRegenerate && (
              <button type="button" onClick={onRegenerate} className="icon-btn !size-9" aria-label="Regenerate response" title="Regenerate">
                <RefreshIcon size={16} />
              </button>
            )}
            {message.usage && (
              <span className="ml-1.5 text-xs" title={`${message.usage.inputTokens.toLocaleString()} input tokens · ${message.usage.outputTokens.toLocaleString()} output tokens`}>
                {(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function TypingIndicator() {
  return (
    <div className="flex h-7 items-center gap-1" role="status" aria-label={`${siteConfig.assistantName} is thinking`}>
      <span className="typing-dot size-1.5 rounded-full bg-pine" />
      <span className="typing-dot size-1.5 rounded-full bg-pine" />
      <span className="typing-dot size-1.5 rounded-full bg-pine" />
    </div>
  );
}
