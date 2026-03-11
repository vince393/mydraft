import { useRef, useEffect, useCallback } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link, RemoveFormatting, Undo, Redo } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message...",
  className = "",
  "data-testid": testId,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const lastValueRef = useRef(value);

  useEffect(() => {
    if (!editorRef.current) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (value !== lastValueRef.current) {
      lastValueRef.current = value;
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  }, [onChange]);

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    handleInput();
  }, [handleInput]);

  const handleLink = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    const url = prompt("Enter URL:", selectedText.startsWith("http") ? selectedText : "https://");
    if (url) {
      exec("createLink", url);
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const container = range.startContainer.parentElement;
        if (container?.tagName === "A") {
          container.setAttribute("target", "_blank");
          container.setAttribute("rel", "noopener noreferrer");
          container.style.color = "#1a73e8";
        }
      }
    }
  }, [exec]);

  const isActive = useCallback((command: string) => {
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      exec("insertText", "    ");
    }
  }, [exec]);

  const sanitizePastedHtml = useCallback((raw: string): string => {
    const tmp = document.createElement("div");
    tmp.innerHTML = raw;
    const dangerousTags = tmp.querySelectorAll(
      "script,style,iframe,object,embed,form,input,textarea,select,button,applet,link,meta,base,svg"
    );
    dangerousTags.forEach((el) => el.remove());
    const allEls = tmp.querySelectorAll("*");
    allEls.forEach((el) => {
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (
          attr.name.startsWith("on") ||
          attr.name === "class" ||
          attr.name === "id" ||
          attr.name === "data-bind"
        ) {
          el.removeAttribute(attr.name);
        }
        if (
          (attr.name === "href" || attr.name === "src" || attr.name === "action") &&
          /^\s*(javascript|vbscript|data):/i.test(attr.value)
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return tmp.innerHTML
      .replace(/<!--[\s\S]*?-->/g, "");
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData("text/html");
    if (html) {
      e.preventDefault();
      const cleaned = sanitizePastedHtml(html);
      document.execCommand("insertHTML", false, cleaned);
      handleInput();
    }
  }, [handleInput, sanitizePastedHtml]);

  const buttons = [
    { cmd: "bold", icon: Bold, title: "Bold (Ctrl+B)" },
    { cmd: "italic", icon: Italic, title: "Italic (Ctrl+I)" },
    { cmd: "underline", icon: Underline, title: "Underline (Ctrl+U)" },
    { cmd: "separator" as const },
    { cmd: "insertUnorderedList", icon: List, title: "Bullet list" },
    { cmd: "insertOrderedList", icon: ListOrdered, title: "Numbered list" },
    { cmd: "separator" as const },
    { cmd: "link", icon: Link, title: "Insert link", action: handleLink },
    { cmd: "removeFormat", icon: RemoveFormatting, title: "Clear formatting" },
    { cmd: "separator" as const },
    { cmd: "undo", icon: Undo, title: "Undo (Ctrl+Z)" },
    { cmd: "redo", icon: Redo, title: "Redo (Ctrl+Y)" },
  ];

  const isEmpty = !value || value === "<br>" || value === "<div><br></div>" || value.replace(/<[^>]*>/g, "").trim() === "";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div
        className="flex items-center gap-0.5 px-4 py-1.5 border-b border-white/[0.04] flex-shrink-0"
        data-testid="rich-text-toolbar"
      >
        {buttons.map((btn, i) => {
          if (btn.cmd === "separator") {
            return <div key={i} className="w-px h-4 bg-white/[0.06] mx-1" />;
          }
          const Icon = btn.icon!;
          return (
            <button
              key={btn.cmd}
              type="button"
              title={btn.title}
              onMouseDown={(e) => {
                e.preventDefault();
                if (btn.action) {
                  btn.action();
                } else {
                  exec(btn.cmd);
                }
              }}
              className="w-7 h-7 rounded flex items-center justify-center text-foreground/40 hover:text-foreground/70 hover:bg-white/[0.04] transition-colors cursor-pointer"
              data-testid={`button-format-${btn.cmd}`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
      <div className="relative flex-1 min-h-0 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className={`min-h-[160px] h-full px-8 py-3 text-sm leading-relaxed focus:outline-none ${className}`}
          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          data-testid={testId}
          data-placeholder={placeholder}
        />
        {isEmpty && (
          <div
            className="absolute top-3 left-8 text-sm text-foreground/20 pointer-events-none select-none"
            aria-hidden
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
