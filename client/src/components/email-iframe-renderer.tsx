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
    .querySelectorAll("script, object, embed, applet, iframe, form, input, button, select, textarea")
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
    const hasStyleTag = /<style[\s>]/i.test(rawHtml);

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
    const textColor = dark ? "#e0e0e4" : "#1f1f1f";
    const linkColor = dark ? "#6fa8ff" : "#1a73e8";
    const quoteColor = dark ? "rgba(255,255,255,0.15)" : "#dadce0";
    const quoteFg = dark ? "#9aa0a6" : "#5f6368";
    const hrColor = dark ? "rgba(255,255,255,0.08)" : "#dadce0";

    const hasRichContent = hasStyleTag || /<table/i.test(rawHtml);
    const isMobile = window.innerWidth < 640;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html {
    margin: 0;
    padding: 0;
    background: ${bgColor};
  }
  body {
    margin: 0;
    padding: ${hasRichContent ? '0' : (isMobile ? '8px 10px' : '14px 16px')};
    background: ${bgColor};
    color: ${textColor};
    font-family: 'Google Sans', Roboto, RobotoDraft, Helvetica, Arial, sans-serif;
    font-size: ${isMobile ? '13px' : '14px'};
    line-height: ${isMobile ? '1.55' : '1.58'};
    word-wrap: break-word;
    overflow-wrap: break-word;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  * {
    max-width: 100% !important;
    box-sizing: border-box;
  }
  img {
    max-width: 100% !important;
    height: auto !important;
  }
  table {
    max-width: 100% !important;
    border-collapse: collapse;
    table-layout: fixed;
    width: 100% !important;
  }
  td, th {
    word-break: break-word;
    overflow-wrap: break-word;
  }
  body > table,
  body > div > table,
  body > center > table {
    margin: 0 auto;
  }
  a {
    color: ${linkColor};
  }
  blockquote {
    margin: 0 0 0 0.8ex;
    padding-left: 1ex;
    border-left: 1px solid ${quoteColor};
    color: ${quoteFg};
  }
  .gmail_quote {
    margin: 0 0 0 0.8ex;
    padding-left: 1ex;
    border-left: 1px solid ${quoteColor};
    color: ${quoteFg};
  }
  pre, code {
    font-family: 'Roboto Mono', monospace;
    font-size: 13px;
    background: ${dark ? 'rgba(255,255,255,0.05)' : '#f8f9fa'};
    border-radius: 4px;
    padding: 2px 4px;
    white-space: pre-wrap;
  }
  pre { padding: 12px; overflow-x: auto; }
  hr {
    border: none;
    border-top: 1px solid ${hrColor};
    margin: 16px 0;
  }
  img[width="1"], img[height="1"],
  img[width="0"], img[height="0"] {
    display: none !important;
  }
  [style*="display:none"], [style*="display: none"],
  [style*="visibility:hidden"], [style*="visibility: hidden"] {
    display: none !important;
  }
  ${!dark ? `
  span[style*="color: #c"], span[style*="color:#c"],
  span[style*="color: #d"], span[style*="color:#d"],
  span[style*="color: #e"], span[style*="color:#e"],
  span[style*="color: #f"], span[style*="color:#f"],
  span[style*="color: #C"], span[style*="color:#C"],
  span[style*="color: #D"], span[style*="color:#D"],
  span[style*="color: #E"], span[style*="color:#E"],
  span[style*="color: #F"], span[style*="color:#F"],
  span[style*="color: rgb(2"], span[style*="color:rgb(2"],
  p[style*="color: #c"], p[style*="color:#c"],
  p[style*="color: #d"], p[style*="color:#d"],
  p[style*="color: #e"], p[style*="color:#e"],
  p[style*="color: #f"], p[style*="color:#f"],
  p[style*="color: #C"], p[style*="color:#C"],
  p[style*="color: #D"], p[style*="color:#D"],
  p[style*="color: #E"], p[style*="color:#E"],
  p[style*="color: #F"], p[style*="color:#F"],
  p[style*="color: rgb(2"], p[style*="color:rgb(2"],
  div[style*="color: #c"], div[style*="color:#c"],
  div[style*="color: #d"], div[style*="color:#d"],
  div[style*="color: #e"], div[style*="color:#e"],
  div[style*="color: #f"], div[style*="color:#f"],
  div[style*="color: #C"], div[style*="color:#C"],
  div[style*="color: #D"], div[style*="color:#D"],
  div[style*="color: #E"], div[style*="color:#E"],
  div[style*="color: #F"], div[style*="color:#F"],
  div[style*="color: rgb(2"], div[style*="color:rgb(2"],
  td[style*="color: #c"], td[style*="color:#c"],
  td[style*="color: #d"], td[style*="color:#d"],
  td[style*="color: #e"], td[style*="color:#e"],
  td[style*="color: #f"], td[style*="color:#f"],
  td[style*="color: #C"], td[style*="color:#C"],
  td[style*="color: #D"], td[style*="color:#D"],
  td[style*="color: #E"], td[style*="color:#E"],
  td[style*="color: #F"], td[style*="color:#F"],
  td[style*="color: rgb(2"], td[style*="color:rgb(2"],
  font[color^="#c"], font[color^="#d"], font[color^="#e"], font[color^="#f"],
  font[color^="#C"], font[color^="#D"], font[color^="#E"], font[color^="#F"],
  font[style*="color: #c"], font[style*="color:#c"],
  font[style*="color: #d"], font[style*="color:#d"],
  font[style*="color: #e"], font[style*="color:#e"],
  font[style*="color: #f"], font[style*="color:#f"] {
    color: #555555 !important;
  }
  ` : ''}
  ${dark ? `
  body[bgcolor], body[style*="background"],
  div[style*="background-color: #ffffff"], div[style*="background-color:#ffffff"],
  div[style*="background-color: #fff"], div[style*="background-color:#fff"],
  div[style*="background-color: white"], div[style*="background-color:white"],
  table[bgcolor="#ffffff"], table[bgcolor="#fff"], table[bgcolor="white"],
  td[bgcolor="#ffffff"], td[bgcolor="#fff"], td[bgcolor="white"],
  td[style*="background-color: #ffffff"], td[style*="background-color:#ffffff"],
  td[style*="background-color: #fff"], td[style*="background-color:#fff"],
  td[style*="background-color: white"], td[style*="background-color:white"] {
    background-color: ${bgColor} !important;
    background: ${bgColor} !important;
  }
  body[text], td[style*="color: #000"], td[style*="color:#000"],
  td[style*="color: black"], td[style*="color:black"],
  span[style*="color: #000"], span[style*="color:#000"],
  span[style*="color: black"], span[style*="color:black"],
  font[color="#000000"], font[color="#000"], font[color="black"],
  p[style*="color: #000"], p[style*="color:#000"],
  div[style*="color: #000"], div[style*="color:#000"] {
    color: ${textColor} !important;
  }
  ` : ''}
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
      const newHeight = Math.max(scrollH + 16, 100);
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
          overflowX: "hidden",
          overflowY: "hidden",
          background: isDark ? "#1a1a1e" : "#ffffff",
        }}
        title="Email content"
        data-testid="iframe-email-content"
      />
    </div>
  );
}
