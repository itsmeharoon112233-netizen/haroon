"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { cn, groupConversations } from "@/lib/utils";
import type { Conversation } from "@/types/chat";
import { LogoMark } from "../brand/Logo";
import { ChatIcon, CheckIcon, CloseIcon, KeyIcon, MailIcon, PencilIcon, PhoneIcon, PinIcon, PlusIcon, TrashIcon } from "../ui/Icons";

interface SidebarProps {
  conversations: Conversation[];
  hydrated: boolean;
  activeId: string | null;
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTalkToAgent: () => void;
}

export function Sidebar(props: SidebarProps) {
  const { open, onClose } = props;
  const panelRef = useRef<HTMLElement>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  // Track the lg breakpoint so the closed mobile drawer can be made inert (unfocusable).
  useEffect(() => {
    const mq = matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Mobile drawer: close on Escape and lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        id="sidebar"
        aria-label="Chat history"
        inert={!open && !isDesktop}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(85vw,300px)] flex-col border-r border-line bg-surface transition-transform duration-200 ease-out",
          "lg:static lg:z-auto lg:w-[280px] lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent {...props} />
      </aside>
    </>
  );
}

function SidebarContent({
  conversations,
  hydrated,
  activeId,
  onClose,
  onNewChat,
  onSelect,
  onRename,
  onDelete,
  onTalkToAgent,
}: SidebarProps) {
  const groups = useMemo(() => groupConversations(conversations), [conversations]);
  const { contact } = siteConfig;

  return (
    <>
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <LogoMark size={36} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="font-display text-[17px] font-semibold">{siteConfig.assistantName}</p>
          <p className="truncate text-xs text-muted">by {siteConfig.companyName}</p>
        </div>
        <button type="button" onClick={onClose} className="icon-btn lg:hidden" aria-label="Close menu">
          <CloseIcon />
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onClose();
          }}
          className="btn-secondary w-full justify-start"
        >
          <PlusIcon size={18} /> New chat
        </button>
      </div>

      <nav className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-3 pb-3" aria-label="Previous conversations">
        {!hydrated ? (
          <div className="space-y-2 pt-3" aria-hidden="true">
            {[70, 55, 80, 45].map((w) => (
              <div key={w} className="h-9 animate-pulse rounded-lg bg-surface-2" style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            <ChatIcon className="mx-auto mb-2" />
            Your conversations will appear here.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.label} className="mt-3">
              <h3 className="px-2 pb-1 text-xs font-medium text-muted">{g.label}</h3>
              <ul className="space-y-0.5">
                {g.items.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    active={c.id === activeId}
                    onSelect={() => {
                      onSelect(c.id);
                      onClose();
                    }}
                    onRename={(t) => onRename(c.id, t)}
                    onDelete={() => onDelete(c.id)}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onTalkToAgent} className="btn-primary w-full">
          <KeyIcon size={17} /> Talk to an agent
        </button>
        <a
          href={siteConfig.mainWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex h-10 items-center justify-center rounded-xl text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          Browse listings on {siteConfig.mainWebsite.replace(/^https?:\/\//, "")}
        </a>
        {(contact.phone || contact.email || contact.office) && (
          <ul className="mt-3 space-y-1.5 px-1 text-xs text-muted">
            {contact.phone && (
              <li>
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 hover:text-ink">
                  <PhoneIcon size={14} /> {contact.phone}
                </a>
              </li>
            )}
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2 hover:text-ink">
                  <MailIcon size={14} /> {contact.email}
                </a>
              </li>
            )}
            {contact.office && (
              <li className="flex items-start gap-2">
                <PinIcon size={14} className="mt-0.5 shrink-0" /> {contact.office}
              </li>
            )}
          </ul>
        )}
      </div>
    </>
  );
}

const ConversationRow = memo(function ConversationRow({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    if (draft.trim() && draft.trim() !== conversation.title) onRename(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <li>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
          className="flex items-center gap-1 rounded-lg bg-surface-2 p-1"
        >
          <label htmlFor={`rename-${conversation.id}`} className="sr-only">
            Rename conversation
          </label>
          <input
            id={`rename-${conversation.id}`}
            ref={inputRef}
            value={draft}
            maxLength={80}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setDraft(conversation.title);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-pine bg-surface px-2 py-1.5 text-[16px] focus:outline-none sm:text-sm"
          />
          <button type="submit" className="icon-btn !size-9" aria-label="Save name" onMouseDown={(e) => e.preventDefault()}>
            <CheckIcon size={16} />
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-11 w-full items-center rounded-lg pl-3 text-left text-sm transition-colors sm:h-10",
          // Leave room for the rename/delete buttons whenever they're visible.
          active
            ? "bg-pine-soft pr-20 font-medium text-ink"
            : "pr-20 text-ink/85 hover:bg-surface-2 lg:pr-3 lg:group-focus-within:pr-20 lg:group-hover:pr-20",
        )}
      >
        <span className="truncate">{conversation.title}</span>
      </button>
      <div
        className={cn(
          "absolute inset-y-0 right-1 flex items-center gap-0.5",
          "lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
          active && "lg:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={() => {
            setDraft(conversation.title);
            setEditing(true);
          }}
          className="icon-btn !size-9"
          aria-label={`Rename "${conversation.title}"`}
          title="Rename"
        >
          <PencilIcon size={15} />
        </button>
        <button type="button" onClick={onDelete} className="icon-btn !size-9 hover:!text-danger" aria-label={`Delete "${conversation.title}"`} title="Delete">
          <TrashIcon size={15} />
        </button>
      </div>
    </li>
  );
});
