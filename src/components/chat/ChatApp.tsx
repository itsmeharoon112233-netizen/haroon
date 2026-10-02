"use client";

import { useCallback, useEffect, useState } from "react";
import { siteConfig } from "@/config/site";
import { useChat } from "@/hooks/useChat";
import { conversationToMarkdown, downloadFile, slugify } from "@/lib/utils";
import { ChatHeader } from "../layout/ChatHeader";
import { Sidebar } from "../layout/Sidebar";
import { ConfirmDialog } from "../ui/Dialog";
import { useToast } from "../ui/Toast";
import { Composer } from "./Composer";
import { LeadDialog } from "./LeadDialog";
import { MessageList } from "./MessageList";
import { WelcomeScreen } from "./WelcomeScreen";

type Confirm = { kind: "delete"; id: string; title: string } | { kind: "clear"; id: string } | null;

export function ChatApp() {
  const chat = useChat();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const { active } = chat;
  const hasMessages = !!active && active.messages.length > 0;
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Ctrl/Cmd + Shift + O → new chat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        chat.newChat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chat.newChat]); // eslint-disable-line react-hooks/exhaustive-deps

  // When shown inside another site via /embed.js, Escape closes the chat panel.
  useEffect(() => {
    if (window.self === window.top) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || sidebarOpen || document.querySelector("dialog[open]")) return;
      window.parent.postMessage({ type: "xpert:close" }, "*");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const exportChat = () => {
    if (!active) return;
    downloadFile(`${slugify(active.title)}.md`, conversationToMarkdown(active, siteConfig.assistantName));
    toast("Conversation exported");
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        conversations={chat.conversations}
        hydrated={chat.hydrated}
        activeId={chat.activeId}
        open={sidebarOpen}
        onClose={closeSidebar}
        onNewChat={chat.newChat}
        onSelect={chat.select}
        onRename={(id, title) => {
          chat.rename(id, title);
          toast("Conversation renamed");
        }}
        onDelete={(id) => {
          const c = chat.conversations.find((x) => x.id === id);
          setConfirm({ kind: "delete", id, title: c?.title ?? "this conversation" });
        }}
        onTalkToAgent={() => {
          setSidebarOpen(false);
          setLeadOpen(true);
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          title={hasMessages ? active!.title : null}
          hasMessages={hasMessages}
          sidebarOpen={sidebarOpen}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNewChat={chat.newChat}
          onExport={exportChat}
          onClear={() => active && setConfirm({ kind: "clear", id: active.id })}
        />

        {hasMessages ? (
          <MessageList
            conversationId={active!.id}
            messages={active!.messages}
            isBusy={chat.isBusy}
            onRegenerate={chat.regenerate}
          />
        ) : (
          <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
            {chat.hydrated ? <WelcomeScreen onPick={chat.send} /> : <WelcomeSkeleton />}
          </div>
        )}

        <div className="shrink-0 px-3 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6">
          <Composer
            onSend={chat.send}
            onStop={chat.stop}
            isStreaming={chat.isStreaming}
            focusKey={chat.activeId ?? "new"}
          />
        </div>
      </main>

      <LeadDialog open={leadOpen} onClose={() => setLeadOpen(false)} conversation={active} />

      <ConfirmDialog
        open={confirm?.kind === "delete"}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "delete") {
            chat.remove(confirm.id);
            toast("Conversation deleted");
          }
        }}
        title="Delete conversation?"
        description={confirm?.kind === "delete" ? `"${confirm.title}" will be permanently removed from this device.` : ""}
        confirmLabel="Delete"
      />
      <ConfirmDialog
        open={confirm?.kind === "clear"}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === "clear") {
            chat.clear(confirm.id);
            toast("Conversation cleared");
          }
        }}
        title="Clear this conversation?"
        description="All messages in this chat will be removed. The chat itself stays in your history."
        confirmLabel="Clear messages"
      />
    </div>
  );
}

function WelcomeSkeleton() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16" aria-hidden="true">
      <div className="size-14 animate-pulse rounded-2xl bg-surface-2" />
      <div className="mt-6 h-8 w-72 animate-pulse rounded-lg bg-surface-2" />
      <div className="mt-3 h-4 w-60 animate-pulse rounded bg-surface-2" />
      <div className="mt-9 grid w-full gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[76px] animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
