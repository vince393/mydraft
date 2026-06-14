import { useRef, useEffect, useState, useCallback } from "react";

interface EmailIframeRendererProps {
  html: string;
  className?: string;
  fillAvailable?: boolean;
}

function sanitizeForIframe(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const temp = parsed.body;

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

  temp.querySelectorAll("div").forEach((el) => {
    el.removeAttribute("width");
  });

  let content = temp.innerHTML;
  content = content.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, "");
  content = content.replace(/<o:p>[\s\S]*?<\/o:p>/gi, "");
  content = content.replace(/<v:[^>]*>[\s\S]*?<\/v:[^>]*>/gi, "");

  return content.trim() || html;
}

function detectEmailType(rawHtml: string): "rich" | "simple" {
  const tableCount = (rawHtml.match(/<table/gi) || []).length;
  const hasMultipleTables = tableCount >= 2;
  const hasTableWithWidth = /<table[^>]*width\s*=/i.test(rawHtml);
  const hasInlineStyles = (rawHtml.match(/style\s*=/gi) || []).length >= 5;
  const hasFixedWidths = /width\s*[:=]\s*["']?\d{3,}/i.test(rawHtml);
  const hasBackgroundImages = /background-image|background\s*:\s*url/i.test(rawHtml);
  const hasMediaQueries = /@media/i.test(rawHtml);
  const hasCenterTag = /<center/i.test(rawHtml);
  const hasAlignAttr = /align\s*=\s*["']center["']/i.test(rawHtml);
  const hasRolePresentation = /role\s*=\s*["']presentation["']/i.test(rawHtml);

  if (hasTableWithWidth && tableCount >= 1) return "rich";
  if (hasCenterTag && tableCount >= 1) return "rich";

  const richSignals = [
    hasMultipleTables,
    hasInlineStyles,
    hasFixedWidths,
    hasBackgroundImages,
    hasMediaQueries,
    hasCenterTag,
    hasAlignAttr,
    hasRolePresentation,
  ].filter(Boolean).length;

  return richSignals >= 2 ? "rich" : "simple";
}

export function EmailIframeRenderer({
  html,
  className = "",
  fillAvailable = false,
}: EmailIframeRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);
  const [scale, setScale] = useState(1);
  const [maxHeight, setMaxHeight] = useState(10000);
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const writeAttemptRef = useRef(0);

  useEffect(() => {
    if (!fillAvailable || !containerRef.current) return;
    const calcMax = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const isMobile = window.innerWidth < 768;
      const bottomPadding = isMobile ? 100 : 24;
      const available = window.innerHeight - rect.top - bottomPadding;
      setMaxHeight(Math.max(available, 400));
    };
    calcMax();
    setTimeout(calcMax, 100);
    setTimeout(calcMax, 500);
    window.addEventListener("resize", calcMax);
    return () => window.removeEventListener("resize", calcMax);
  }, [fillAvailable]);

  // Track the app's light/dark theme (toggled via the `dark` class on <html>)
  // so the email view can follow it without forcing colors on designed emails.
  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
    const emailType = detectEmailType(rawHtml);
    const isRich = emailType === "rich";

    // Rich/designed emails (newsletters) are authored for a white canvas, so we
    // never theme them — recoloring would mangle the sender's design. Simple /
    // plain-text emails have no design to break, so we render them in true dark
    // mode when the app is dark (no jarring white slab).
    const useDark = dark && !isRich;

    const contentBg = useDark ? "#1a1a1e" : "#ffffff";
    const outerBg = contentBg;
    const textColor = useDark ? "#e0e0e4" : "#1f1f1f";
    const linkColor = useDark ? "#6fa8ff" : "#1a73e8";
    const quoteColor = useDark ? "rgba(255,255,255, 0.15)" : "#dadce0";
    const quoteFg = useDark ? "#9aa0a6" : "#5f6368";
    const hrColor = useDark ? "rgba(255,255,255, 0.08)" : "#dadce0";

    const baseStyles = `
  html {
    margin: 0;
    padding: 0;
    background: ${outerBg};
  }
  body {
    margin: 0;
    padding: 0;
    background: ${outerBg};
    color: ${textColor};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    word-wrap: break-word;
    overflow-wrap: break-word;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-text-size-adjust: 100%;
  }
  #email-content-wrap {
    max-width: 100%;
    width: 100%;
    margin: 0;
    padding: ${isRich ? '0' : '16px 24px'};
    background: ${contentBg};
    box-sizing: border-box;
  }
  #email-content-wrap > * {
    max-width: 100% !important;
    box-sizing: border-box;
  }
  table {
    max-width: 100% !important;
  }
  td, th {
    word-break: break-word;
    max-width: 100% !important;
  }
  div[style*="width"], td[style*="width"], th[style*="width"] {
    max-width: 100% !important;
  }
  img {
    max-width: 100%;
  }
  a { color: ${linkColor}; }
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
    background: ${useDark ? 'rgba(255,255,255, 0.05)' : '#f8f9fa'};
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
  }`;

    const richStyles = isRich ? `
  img:not([width]) {
    max-width: 100%;
    height: auto;
  }
  body > table,
  body > div > table,
  body > center > table,
  body > div > center > table {
    margin: 0 auto;
  }
  @media (max-width: 480px) {
    table[width], table[style*="width"] {
      width: 100% !important;
      min-width: 0 !important;
    }
    td[width], td[style*="width"] {
      width: auto !important;
      min-width: 0 !important;
    }
    img[width] {
      width: auto !important;
      max-width: 100% !important;
      height: auto !important;
    }
  }` : `
  img:not([width]) {
    max-width: 100%;
    height: auto;
  }
  table {
    max-width: 100%;
  }`;

    // Emails are authored for a white canvas. We preserve the sender's original
    // colors exactly (no theme recoloring) so newsletters, formatting, and text
    // appear as the sender intended.
    const darkBgOverrides = '';
    const lightTextOverrides = '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
${baseStyles}
${richStyles}
${darkBgOverrides}
${lightTextOverrides}
</style>
${headContent}
</head>
<body${bodyAttrs}><div id="email-content-wrap">${sanitized}</div></body>
</html>`;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const writeContent = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        if (writeAttemptRef.current < 5) {
          writeAttemptRef.current++;
          setTimeout(writeContent, 100);
        }
        return;
      }
      writeAttemptRef.current = 0;

      const fullHtml = buildIframeContent(html, isDark);
      try {
        doc.open();
        doc.write(fullHtml);
        doc.close();
      } catch {
        iframe.srcdoc = fullHtml;
        return;
      }

      // Track the last committed values so the ResizeObserver can't ping-pong
      // with our own height/scale updates — that feedback loop is a classic
      // cause of the UI freezing (especially on mobile).
      let lastHeight = 0;
      let lastScale = 1;

      const updateHeight = () => {
        if (!doc.body) return;
        const scrollH =
          doc.documentElement?.scrollHeight || doc.body.scrollHeight;
        const rawHeight = Math.max(scrollH + 8, 80);
        if (Math.abs(rawHeight - lastHeight) > 1) {
          lastHeight = rawHeight;
          setHeight(rawHeight);
        }
      };

      const updateScale = () => {
        if (!doc.body || !containerRef.current) return;
        const containerWidth = containerRef.current.clientWidth;
        const contentWidth = Math.max(
          doc.body.scrollWidth,
          doc.documentElement?.scrollWidth || 0
        );
        const newScale =
          contentWidth > containerWidth + 10
            ? Math.max(containerWidth / contentWidth, 0.5)
            : 1;
        if (Math.abs(newScale - lastScale) > 0.01) {
          lastScale = newScale;
          setScale(newScale);
        }
      };

      const handleLoad = () => {
        const images = doc.querySelectorAll("img");
        const onImageLoad = () => {
          updateHeight();
          updateScale();
        };

        images.forEach((img) => {
          if (!img.complete) {
            img.addEventListener("load", onImageLoad);
            img.addEventListener("error", onImageLoad);
          }
        });

        updateHeight();
        updateScale();
        // Two late passes catch async fonts/images without the previous
        // 4-deep timer cascade that hammered the main thread on every email.
        setTimeout(() => { updateHeight(); updateScale(); }, 400);
        setTimeout(() => { updateHeight(); updateScale(); }, 1500);
      };

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      // Coalesce resize bursts into one animation frame so a flood of observer
      // notifications can never saturate the main thread.
      let roFrame = 0;
      const ro = new ResizeObserver(() => {
        if (roFrame) return;
        roFrame = requestAnimationFrame(() => {
          roFrame = 0;
          updateHeight();
          updateScale();
        });
      });
      resizeObserverRef.current = ro;

      if (doc.body) {
        ro.observe(doc.body);
      }
      if (containerRef.current) {
        ro.observe(containerRef.current);
      }

      const links = doc.querySelectorAll("a");
      links.forEach((link) => {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      });

      handleLoad();
    };

    writeContent();

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [html, isDark, buildIframeContent, maxHeight]);

  const effectiveHeight = fillAvailable ? Math.min(height, maxHeight) : height;
  const scaledHeight = scale < 1 ? effectiveHeight * scale : effectiveHeight;
  const needsScroll = fillAvailable && height > maxHeight;

  return (
    <div
      ref={containerRef}
      className={`email-iframe-wrapper ${className}`}
      style={{
        overflow: needsScroll ? "auto" : "hidden",
        WebkitOverflowScrolling: "touch",
        maxHeight: fillAvailable ? `${maxHeight}px` : undefined,
        height: scale < 1 ? `${scaledHeight}px` : (needsScroll ? undefined : `${effectiveHeight}px`),
      }}
    >
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        style={{
          width: scale < 1 ? `${100 / scale}%` : "100%",
          height: `${height}px`,
          border: "none",
          display: "block",
          background: isDark ? "#1a1a1e" : "#ffffff",
          ...(scale < 1
            ? {
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }
            : {}),
        }}
        title="Email content"
        data-testid="iframe-email-content"
      />
    </div>
  );
}
