"use client";

import { isValidElement, memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

function textOf(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

const components: Components = {
  // Fenced code blocks: <pre><code class="language-x">…</code></pre>
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children;
    const className = isValidElement<{ className?: string }>(child) ? child.props.className ?? "" : "";
    const language = /language-([\w+#-]+)/.exec(className)?.[1] ?? "";
    return <CodeBlock language={language} code={textOf(child).replace(/\n$/, "")} />;
  },
  table({ children }) {
    return (
      <div className="table-wrap scroll-quiet">
        <table>{children}</table>
      </div>
    );
  },
  a({ href, children }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow">
        {children}
      </a>
    );
  },
  // Model output never needs images; avoids loading arbitrary remote URLs.
  img({ alt }) {
    return <span>{alt}</span>;
  },
};

/** Renders AI replies as safe Markdown (no raw HTML is executed). */
export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
});
