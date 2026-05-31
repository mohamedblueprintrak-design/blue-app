"use client";

import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Clipboard } from "lucide-react";

// Code block with copy button component
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 dark:bg-slate-950 group">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>
          {language && (
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {language}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Clipboard className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code content */}
      <pre ref={codeRef} className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-slate-200 font-mono">{children}</code>
      </pre>
    </div>
  );
}

// Inline code component
function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-rose-600 dark:text-rose-400 text-[13px] font-mono font-medium">
      {children}
    </code>
  );
}

// Markdown renderer for AI messages with full styling
export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-200 dark:border-slate-700">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-2 pb-0.5 border-b border-slate-200/60 dark:border-slate-700/60">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-2.5 mb-1">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2 mb-1">
            {children}
          </h4>
        ),
        // Bold
        strong: ({ children }) => (
          <strong className="font-bold text-slate-900 dark:text-white">{children}</strong>
        ),
        // Italic
        em: ({ children }) => (
          <em className="italic text-slate-700 dark:text-slate-300">{children}</em>
        ),
        // Paragraph
        p: ({ children }) => (
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 mb-1.5 last:mb-0">
            {children}
          </p>
        ),
        // Unordered list
        ul: ({ children }) => (
          <ul className="my-2 space-y-1 text-sm text-slate-800 dark:text-slate-200 list-disc list-inside marker:text-teal-500 dark:marker:text-teal-400">
            {children}
          </ul>
        ),
        // Ordered list
        ol: ({ children }) => (
          <ol className="my-2 space-y-1 text-sm text-slate-800 dark:text-slate-200 list-decimal list-inside marker:text-teal-500 dark:marker:text-teal-400">
            {children}
          </ol>
        ),
        // List item
        li: ({ children }) => (
          <li className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 pl-1">
            {children}
          </li>
        ),
        // Code blocks
        pre: ({ children }) => {
          // Extract className from the code child
          const codeChild = children as React.ReactElement<{ className?: string; children?: React.ReactNode }>;
          const className = codeChild?.props?.className || "";
          return <CodeBlock className={className}>{codeChild?.props?.children}</CodeBlock>;
        },
        // Inline code (but not inside pre)
        code: ({ children, className }) => {
          // If inside a pre block, let the pre handler deal with it
          if (className) return <code className={className}>{children}</code>;
          return <InlineCode>{children}</InlineCode>;
        },
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="my-3 px-4 py-3 border-s-2 border-s-teal-400 dark:border-s-teal-600 bg-teal-50/50 dark:bg-teal-950/20 rounded-r-xl text-sm text-slate-700 dark:text-slate-300">
            {children}
          </blockquote>
        ),
        // Table
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-start text-xs font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
            {children}
          </td>
        ),
        // Horizontal rule
        hr: () => (
          <hr className="my-3 border-slate-200 dark:border-slate-700" />
        ),
        // Links — SECURITY: Block javascript: URIs to prevent XSS
        a: ({ children, href }) => {
          // SECURITY FIX: Only allow safe URL schemes (http, https, mailto, relative paths)
          // Block javascript:, data:, vbscript: and other dangerous URI schemes
          const isSafeUrl = (url: string | undefined): string | undefined => {
            if (!url) return undefined;
            const trimmed = url.trim().toLowerCase();
            if (
              trimmed.startsWith('http://') ||
              trimmed.startsWith('https://') ||
              trimmed.startsWith('mailto:') ||
              trimmed.startsWith('/') ||
              trimmed.startsWith('#')
            ) {
              return url;
            }
            // Block all other schemes (javascript:, data:, vbscript:, etc.)
            return undefined;
          };
          const safeHref = isSafeUrl(href);
          if (!safeHref) {
            // Render as plain text if URL is unsafe
            return <span className="text-slate-500 dark:text-slate-400">{children}</span>;
          }
          return (
            <a
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 dark:text-teal-400 underline underline-offset-2 hover:text-teal-700 dark:hover:text-teal-300 transition-colors font-medium"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
