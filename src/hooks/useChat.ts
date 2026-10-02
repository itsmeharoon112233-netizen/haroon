"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ChatRequestError, streamChat } from "@/lib/chat-client";
import { getChatStore } from "@/lib/storage/chat-store";
import { makeTitle, uid } from "@/lib/utils";
import type { ChatMessage, Conversation, Usage } from "@/types/chat";

interface State {
  conversations: Conversation[];
  activeId: string | null;
  hydrated: boolean;
}

type Action =
  | { type: "hydrate"; conversations: Conversation[] }
  | { type: "select"; id: string | null }
  | { type: "create"; conversation: Conversation }
  | { type: "delete"; id: string }
  | { type: "rename"; id: string; title: string }
  | { type: "clear"; id: string }
  | { type: "add"; convId: string; messages: ChatMessage[] }
  | { type: "patch"; convId: string; msgId: string; patch: Partial<ChatMessage> }
  | { type: "append"; convId: string; msgId: string; text: string }
  | { type: "remove"; convId: string; msgId: string };

function updateConv(state: State, id: string, fn: (c: Conversation) => Conversation): State {
  return { ...state, conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)) };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, conversations: action.conversations, hydrated: true };
    case "select":
      return { ...state, activeId: action.id };
    case "create":
      return { ...state, conversations: [action.conversation, ...state.conversations], activeId: action.conversation.id };
    case "delete":
      return {
        ...state,
        conversations: state.conversations.filter((c) => c.id !== action.id),
        activeId: state.activeId === action.id ? null : state.activeId,
      };
    case "rename":
      return updateConv(state, action.id, (c) => ({ ...c, title: action.title }));
    case "clear":
      return updateConv(state, action.id, (c) => ({ ...c, messages: [], updatedAt: Date.now() }));
    case "add":
      return updateConv(state, action.convId, (c) => ({
        ...c,
        messages: [...c.messages, ...action.messages],
        updatedAt: Date.now(),
      }));
    case "patch":
      return updateConv(state, action.convId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === action.msgId ? { ...m, ...action.patch } : m)),
      }));
    case "append":
      return updateConv(state, action.convId, (c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === action.msgId ? { ...m, content: m.content + action.text } : m)),
      }));
    case "remove":
      return updateConv(state, action.convId, (c) => ({
        ...c,
        messages: c.messages.filter((m) => m.id !== action.msgId),
      }));
  }
}

/** Messages that should be sent to Claude as conversation context. */
function toContext(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.content.trim() && !(m.role === "assistant" && m.status === "error"))
    .map((m) => ({ role: m.role, content: m.content }));
}

export function useChat() {
  const [state, dispatch] = useReducer(reducer, { conversations: [], activeId: null, hydrated: false });
  const [streaming, setStreaming] = useState<{ convId: string; msgId: string } | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const abortRef = useRef<AbortController | null>(null);

  // Load saved history once on mount.
  useEffect(() => {
    dispatch({ type: "hydrate", conversations: getChatStore().load() });
  }, []);

  // Persist history (debounced, so streaming doesn't write on every token).
  useEffect(() => {
    if (!state.hydrated) return;
    const t = setTimeout(() => getChatStore().save(state.conversations), streaming ? 1500 : 250);
    return () => clearTimeout(t);
  }, [state.conversations, state.hydrated, streaming]);

  // Abort any in-flight request when the page unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const active = useMemo(
    () => state.conversations.find((c) => c.id === state.activeId) ?? null,
    [state.conversations, state.activeId],
  );

  /** Stream a new assistant reply for `convId`, given the context so far. */
  const runReply = useCallback(async (convId: string, context: ChatMessage[]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const reply: ChatMessage = { id: uid(), role: "assistant", content: "", createdAt: Date.now(), status: "streaming" };
    dispatch({ type: "add", convId, messages: [reply] });
    setStreaming({ convId, msgId: reply.id });

    // Batch incoming tokens into one state update per animation frame.
    let pending = "";
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (!pending) return;
      dispatch({ type: "append", convId, msgId: reply.id, text: pending });
      pending = "";
    };

    let usage: Usage | undefined;
    try {
      await streamChat(
        toContext(context),
        {
          onText: (t) => {
            pending += t;
            if (!frame) frame = requestAnimationFrame(flush);
          },
          onUsage: (u) => (usage = u),
        },
        controller.signal,
      );
      cancelAnimationFrame(frame);
      flush();
      dispatch({ type: "patch", convId, msgId: reply.id, patch: { status: "done", usage } });
    } catch (err) {
      cancelAnimationFrame(frame);
      flush();
      if (controller.signal.aborted) {
        dispatch({ type: "patch", convId, msgId: reply.id, patch: { status: "stopped" } });
      } else {
        const message = err instanceof ChatRequestError ? err.message : "Something went wrong. Please try again.";
        dispatch({ type: "patch", convId, msgId: reply.id, patch: { status: "error", error: message } });
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setStreaming(null);
      }
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content) return;
      const now = Date.now();
      const userMsg: ChatMessage = { id: uid(), role: "user", content, createdAt: now, status: "done" };

      let conv = stateRef.current.conversations.find((c) => c.id === stateRef.current.activeId);
      if (!conv) {
        conv = { id: uid(), title: makeTitle(content), messages: [], createdAt: now, updatedAt: now };
        dispatch({ type: "create", conversation: conv });
      } else if (conv.messages.length === 0) {
        dispatch({ type: "rename", id: conv.id, title: makeTitle(content) });
      }
      dispatch({ type: "add", convId: conv.id, messages: [userMsg] });
      void runReply(conv.id, [...conv.messages, userMsg]);
    },
    [runReply],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Replace the last assistant reply in the active chat with a fresh one. */
  const regenerate = useCallback(() => {
    const conv = stateRef.current.conversations.find((c) => c.id === stateRef.current.activeId);
    if (!conv) return;
    const msgs = [...conv.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") {
      const removed = msgs.pop()!;
      dispatch({ type: "remove", convId: conv.id, msgId: removed.id });
    }
    if (!msgs.length) return;
    void runReply(conv.id, msgs);
  }, [runReply]);

  const newChat = useCallback(() => dispatch({ type: "select", id: null }), []);
  const select = useCallback((id: string) => dispatch({ type: "select", id }), []);
  const rename = useCallback((id: string, title: string) => {
    const t = title.trim().slice(0, 80);
    if (t) dispatch({ type: "rename", id, title: t });
  }, []);
  const remove = useCallback((id: string) => {
    if (streaming?.convId === id) abortRef.current?.abort();
    dispatch({ type: "delete", id });
  }, [streaming]);
  const clear = useCallback((id: string) => {
    if (streaming?.convId === id) abortRef.current?.abort();
    dispatch({ type: "clear", id });
  }, [streaming]);

  return {
    conversations: state.conversations,
    hydrated: state.hydrated,
    active,
    activeId: state.activeId,
    isStreaming: streaming !== null && streaming.convId === state.activeId,
    isBusy: streaming !== null,
    streamingMessageId: streaming?.msgId ?? null,
    send,
    stop,
    regenerate,
    newChat,
    select,
    rename,
    remove,
    clear,
  };
}

export type ChatController = ReturnType<typeof useChat>;
