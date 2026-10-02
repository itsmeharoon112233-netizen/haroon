"use client";

import { siteConfig } from "@/config/site";
import { LogoMark } from "../brand/Logo";
import { useTheme } from "../theme/ThemeProvider";
import { DownloadIcon, EraserIcon, MenuIcon, MoonIcon, PlusIcon, SunIcon } from "../ui/Icons";

interface ChatHeaderProps {
  title: string | null;
  hasMessages: boolean;
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  onNewChat: () => void;
  onExport: () => void;
  onClear: () => void;
}

export function ChatHeader({ title, hasMessages, sidebarOpen, onOpenSidebar, onNewChat, onExport, onClear }: ChatHeaderProps) {
  const { theme, toggle } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-line bg-bg/85 px-2 backdrop-blur sm:px-3">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="icon-btn lg:hidden"
        aria-label="Open chat history"
        aria-expanded={sidebarOpen}
        aria-controls="sidebar"
      >
        <MenuIcon />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1">
        {title ? (
          <h1 className="truncate text-[15px] font-medium">{title}</h1>
        ) : (
          <>
            <LogoMark size={26} className="lg:hidden" />
            <p className="min-w-0 truncate text-[15px]">
              <span className="font-display font-semibold">{siteConfig.assistantName}</span>
              <span className="ml-2 hidden text-muted sm:inline">{siteConfig.tagline}</span>
            </p>
          </>
        )}
      </div>

      {hasMessages && (
        <>
          <button type="button" onClick={onExport} className="icon-btn" aria-label="Export conversation" title="Export as Markdown">
            <DownloadIcon />
          </button>
          <button type="button" onClick={onClear} className="icon-btn" aria-label="Clear conversation" title="Clear conversation">
            <EraserIcon />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={toggle}
        className="icon-btn"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
      <button type="button" onClick={onNewChat} className="icon-btn lg:hidden" aria-label="New chat" title="New chat">
        <PlusIcon />
      </button>
    </header>
  );
}
