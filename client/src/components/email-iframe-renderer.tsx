import { useRef, useEffect, useState, useCallback } from "react";

interface EmailIframeRendererProps {
  html: string;
  className?: string;
}

function sanitizeForIframe(html: string): string {
  const temp = document.createElement("div");
  temp.innerHTML = html;

  temp.querySelectorAll("img").forEach((img) => {
    const width = img.getAttribute("width");
    const height = img.getAttribute("height");
    const style = img.getAttribute("style") || "";
    const src = img.getAttribute("src") || "";
    const isTrackingPixel =
      (width === "1" && height === "1") ||
      width === "0" ||
      height === "0" ||
      style.includes("display:none") ||
      style.includes("display: none") ||
      style.includes("visibility:hidden") ||
      style.includes("visibility: hidden") ||
      style.includes("width:0") ||
      style.includes("width: 0") ||
      style.includes("height:0") ||
      style.includes("height: 0") ||
      src.includes("track") ||
      src.includes("beacon") ||
      src.includes("pixel") ||
      src.includes("open.gif");
    if (isTrackingPixel) img.remove();
  });

  temp
    .querySelectorAll("script, object, embed, applet, iframe, form")
    .forEach((el) => el.remove());

  const dangerousSchemes = [
    "javascript:",
    "vbscript:",
    "data:text/html",
    "data:application",
  ];

  temp.querySelectorAll("*").forEach((el) => {
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value.toLowerCase().trim();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        return;
      }
      if (
        ["href", "src", "action", "formaction", "data", "poster", "background"].includes(name)
      ) {
        if (dangerousSchemes.some((scheme) => value.startsWith(scheme))) {
          el.removeAttribute(attr.name);
          if (el.tagName.toLowerCase() === "a" && name === "href") {
            el.setAttribute("href", "#");
          }
        }
      }
      if (
        name === "style" &&
        (value.includes("expression(") || value.includes("url(javascript:"))
      ) {
        el.removeAttribute("style");
      }
    });
  });

  temp
    .querySelectorAll(
      'a[href^="javascript:"], a[href^="Javascript:"], a[href^="JAVASCRIPT:"]'
    )
    .forEach((a) => a.setAttribute("href", "#"));

  const comments = document.createTreeWalker(
    temp,
    NodeFilter.SHOW_COMMENT,
    null
  );
  const commentsToRemove: Node[] = [];
  while (comments.nextNode()) commentsToRemove.push(comments.currentNode);
  commentsToRemove.forEach((c) => c.parentNode?.removeChild(c));

  let content = temp.innerHTML;
  content = content.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, "");
  content = content.replace(/<o:p>[\s\S]*?<\/o:p>/gi, "");
  content = content.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, "");

  return content.trim() || html;
}

export function EmailIframeRenderer({
  html,
  className = "",
}: EmailIframeRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const isDark = document.documentElement.classList.contains("dark");

  const buildIframeContent = useCallback((rawHtml: string, dark: boolean) => {
    const hasFullHtml = /<html/i.test(rawHtml);
    const hasBody = /<body/i.test(rawHtml);

    let bodyContent = rawHtml;
    let headContent = "";
    let bodyAttrs = "";

    if (hasFullHtml || hasBody) {
      const headMatch = rawHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
      if (headMatch) {
        headContent = headMatch[1]
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<title[\s\S]*?<\/title>/gi, "")
          .replace(/<base[^>]*>/gi, "");
      }

      const bodyTagMatch = rawHtml.match(/<body([^>]*)>/i);
      if (bodyTagMatch) {
        bodyAttrs = (bodyTagMatch[1] || "")
          .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")
          .replace(/\bon\w+\s*=\s*\S+/gi, "");
      }

      const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        bodyContent = bodyMatch[1];
      } else if (hasFullHtml) {
        const htmlContent = rawHtml
          .replace(/<html[^>]*>/i, "")
          .replace(/<\/html>/i, "");
        bodyContent = htmlContent.replace(/<head[\s\S]*?<\/head>/i, "");
      }
    }

    const sanitized = sanitizeForIframe(bodyContent);

    const bgColor = dark ? "#1a1a1e" : "#ffffff";
    const textColor = dark ? "#e0e0e4" : "#222222";
    const linkColor = dark ? "#6fa8ff" : "";

    const darkLinkStyle = linkColor ? `a { color: ${linkColor}; }` : "";

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${bgColor};
    color: ${textColor};
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
    overflow-wrap: break-word;
    -webkit-font-smoothing: antialiased;
  }
  ${darkLinkStyle}
  img[width="1"], img[height="1"],
  img[width="0"], img[height="0"] {
    display: none !important;
  }
  [style*="display:none"], [style*="display: none"],
  [style*="visibility:hidden"], [style*="visibility: hidden"] {
    display: none !important;
  }
</style>
${headContent}
</head>
<body${bodyAttrs}>${sanitized}</body>
</html>`;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const fullHtml = buildIframeContent(html, isDark);
    doc.open();
    doc.write(fullHtml);
    doc.close();

    const updateHeight = () => {
      if (!doc.body) return;
      const scrollH =
        doc.documentElement?.scrollHeight || doc.body.scrollHeight;
      const newHeight = Math.max(scrollH, 100);
      setHeight(newHeight);
    };

    const handleLoad = () => {
      const images = doc.querySelectorAll("img");
      const onImageLoad = () => updateHeight();

      images.forEach((img) => {
        if (!img.complete) {
          img.addEventListener("load", onImageLoad);
          img.addEventListener("error", onImageLoad);
        }
      });

      updateHeight();
      setTimeout(updateHeight, 150);
      setTimeout(updateHeight, 600);
      setTimeout(updateHeight, 2000);
    };

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    if (doc.body) {
      resizeObserverRef.current = new ResizeObserver(() => updateHeight());
      resizeObserverRef.current.observe(doc.body);
    }

    const links = doc.querySelectorAll("a");
    links.forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });

    handleLoad();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [html, isDark, buildIframeContent]);

  return (
    <div className={`email-iframe-wrapper ${className}`}>
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: "100%",
          height: `${height}px`,
          border: "none",
          display: "block",
          overflow: "hidden",
          background: isDark ? "#1a1a1e" : "#ffffff",
        }}
        title="Email content"
        data-testid="iframe-email-content"
      />
    </div>
  );
}
