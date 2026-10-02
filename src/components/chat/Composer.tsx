"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LIMITS } from "@/config/limits";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { SendIcon, StopIcon } from "../ui/Icons";

interface ComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  /** Changes whenever the input should be cleared and focused (e.g. new chat). */
  focusKey: string;
}

export function Composer({ onSend, onStop, isStreaming, focusKey }: ComposerProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const length = value.length;
  const tooLong = length > LIMITS.maxMessageChars;
  const canSend = value.trim().length > 0 && !tooLong && !isStreaming;
  const showCount = length > LIMITS.maxMessageChars * 0.8;

  // Grow with content up to ~8 lines, then scroll.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  // Focus on desktop when the conversation changes (not on touch devices — it pops the keyboard).
  useEffect(() => {
    if (matchMedia("(pointer: fine)").matches) ref.current?.focus();
  }, [focusKey]);

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto w-full max-w-3xl"
    >
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border bg-surface p-2 pl-4 shadow-soft transition-colors focus-within:border-pine",
          tooLong ? "border-danger" : "border-line",
        )}
      >
        <label htmlFor="chat-input" className="sr-only">
          Message {siteConfig.assistantName}
        </label>
        <textarea
          id="chat-input"
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter adds a line. Ignore Enter while an IME is composing (Urdu/Arabic keyboards).
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask about buying, selling or renting property…"
          aria-describedby="composer-hint"
          aria-invalid={tooLong}
          className="scroll-quiet max-h-[220px] min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-relaxed text-ink placeholder:text-muted/80 focus:outline-none sm:text-[15px]"
          dir="auto"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-bg transition-opacity hover:opacity-85"
            aria-label="Stop generating"
            title="Stop generating"
          >
            <StopIcon size={18} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-pine text-on-pine transition-colors hover:bg-pine-hover disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted"
            aria-label="Send message"
            title="Send (Enter)"
          >
            <SendIcon size={18} />
          </button>
        )}
      </div>
      <div id="composer-hint" className="mt-2 flex min-h-5 items-center justify-between gap-3 px-1 text-xs text-muted">
        <span className="hidden sm:inline">
          <kbd className="font-sans font-medium">Enter</kbd> to send · <kbd className="font-sans font-medium">Shift + Enter</kbd> for a new line
        </span>
        <span className="sm:hidden">{siteConfig.assistantName} can make mistakes. Verify important details.</span>
        {showCount ? (
          <span className={cn("tabular-nums", tooLong && "font-medium text-danger")} aria-live="polite">
            {length.toLocaleString()} / {LIMITS.maxMessageChars.toLocaleString()}
          </span>
        ) : (
          <span className="hidden sm:inline">{siteConfig.assistantName} can make mistakes. Verify important details.</span>
        )}
      </div>
    </form>
  );
}
