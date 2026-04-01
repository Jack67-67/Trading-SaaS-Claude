"use client";

import { useRef, useState, useCallback, type KeyboardEvent, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  className?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "python",
  placeholder = "# Write your strategy code here...",
  readOnly = false,
  minHeight = 400,
  className,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  const lines = value.split("\n");
  const lineCount = lines.length;

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd } = textarea;

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const before = value.slice(0, selectionStart);
        const after = value.slice(selectionEnd);
        onChange(before + "    " + after);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 4;
        });
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const before = value.slice(0, selectionStart);
        const after = value.slice(selectionEnd);
        const currentLine = before.slice(before.lastIndexOf("\n") + 1);
        const indent = currentLine.match(/^(\s*)/)?.[1] || "";
        const extraIndent = currentLine.trimEnd().endsWith(":") ? "    " : "";
        const insertion = "\n" + indent + extraIndent;
        onChange(before + insertion + after);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insertion.length;
        });
      }
    },
    [value, onChange, readOnly]
  );

  return (
    <div
      className={cn(
        "relative rounded-lg border overflow-hidden transition-colors",
        focused ? "border-accent ring-1 ring-accent/30" : "border-border",
        className
      )}
    >
      <div className="absolute top-2 right-2 z-10">
        <span className="text-2xs font-mono text-text-muted bg-surface-2 px-1.5 py-0.5 rounded">
          {language}
        </span>
      </div>

      <div className="flex" style={{ minHeight }}>
        <div
          ref={lineNumbersRef}
          className="shrink-0 bg-surface-0 border-r border-border overflow-hidden select-none"
          aria-hidden="true"
        >
          <div className="py-3 px-1">
            {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "text-right font-mono text-2xs leading-[1.625rem] px-2",
                  i < lineCount ? "text-text-muted" : "text-surface-3"
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className={cn(
            "flex-1 bg-surface-1 text-text-primary font-mono text-sm leading-[1.625rem]",
            "p-3 resize-none outline-none placeholder:text-text-muted/50",
            readOnly && "cursor-default opacity-80"
          )}
          style={{ minHeight, tabSize: 4 }}
        />
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 bg-surface-0 border-t border-border text-2xs text-text-muted font-mono">
        <span>{lineCount} line{lineCount !== 1 ? "s" : ""} · {value.length} chars</span>
        <span className="hidden sm:inline">Tab indent · Enter auto-indent</span>
      </div>
    </div>
  );
}
