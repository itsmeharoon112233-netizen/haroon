"use client";

import { memo, useState } from "react";
import { copyText } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "../ui/Icons";

export const CodeBlock = memo(function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="not-prose overflow-hidden rounded-xl border border-line bg-code-bg">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5 text-xs text-muted">
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={async () => {
            if (await copyText(code)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-surface-2 hover:text-ink"
          aria-label={copied ? "Code copied" : "Copy code"}
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="scroll-quiet overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
});
