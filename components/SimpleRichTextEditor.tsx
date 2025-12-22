"use client";

import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
} from "lucide-react";

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Compose your message...",
  className = "",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUserEditingRef = useRef(false);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && !isUserEditingRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isUserEditingRef.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
      setTimeout(() => {
        isUserEditingRef.current = false;
      }, 100);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput(); // Trigger onChange after command
  };

  const formatBlock = (tag: string) => {
    document.execCommand("formatBlock", false, tag);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/20 flex-wrap">
        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand("bold")}
          className="h-8 w-8 p-0"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand("italic")}
          className="h-8 w-8 p-0"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand("underline")}
          className="h-8 w-8 p-0"
          title="Underline"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Headings */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatBlock("h1")}
          className="h-8 w-8 p-0"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatBlock("h2")}
          className="h-8 w-8 p-0"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatBlock("h3")}
          className="h-8 w-8 p-0"
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand("insertUnorderedList")}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => executeCommand("insertOrderedList")}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-4 min-h-[280px] max-h-[280px] overflow-y-auto focus:outline-none prose prose-sm max-w-none dark:prose-invert"
        style={{
          wordWrap: "break-word",
          overflowWrap: "break-word",
        }}
        suppressContentEditableWarning
      />

      <style jsx global>{`
        /* Editor styles */
        [contenteditable] {
          cursor: text;
        }

        [contenteditable]:empty:before {
          content: attr(placeholder);
          color: hsl(var(--muted-foreground));
          opacity: 0.4;
          pointer-events: none;
        }

        [contenteditable] p {
          margin: 0.5em 0;
        }

        [contenteditable] h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 0.67em 0;
        }

        [contenteditable] h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 0.75em 0;
        }

        [contenteditable] h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 0.83em 0;
        }

        [contenteditable] ul,
        [contenteditable] ol {
          margin: 0.5em 0;
          padding-left: 2em;
        }

        [contenteditable] li {
          margin: 0.25em 0;
        }

        [contenteditable] strong {
          font-weight: bold;
        }

        [contenteditable] em {
          font-style: italic;
        }

        [contenteditable] u {
          text-decoration: underline;
        }

        /* Scrollbar */
        [contenteditable]::-webkit-scrollbar {
          width: 6px;
        }

        [contenteditable]::-webkit-scrollbar-track {
          background: hsl(var(--muted));
          border-radius: 3px;
        }

        [contenteditable]::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.3);
          border-radius: 3px;
        }

        [contenteditable]::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.5);
        }
      `}</style>
    </div>
  );
};
