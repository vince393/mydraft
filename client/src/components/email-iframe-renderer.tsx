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
    const emailType = detectEmailType(rawHtml);

    const outerBg = dark ? "#111114" : "#f4f4f5";
    const contentBg = dark ? "#1a1a1e" : "#ffffff";
    const textColor = dark ? "#e0e0e4" : "#1f1f1f";
    const linkColor = dark ? "#6fa8ff" : "#1a73e8";
    const quoteColor = dark ? "rgba(255,255,255, 0.15)" : "#dadce0";
    const quoteFg = dark ? "#9aa0a6" : "#5f6368";
    const hrColor = dark ? "rgba(255,255,255, 0.08)" : "#dadce0";

    const isRich = emailType === "rich";

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
    min-height: 100%;
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
    background: ${dark ? 'rgba(255,255,255, 0.05)' : '#f8f9fa'};
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

    const darkBgOverrides = dark ? `
  body[bgcolor], body[style*="background"] {
    background-color: ${outerBg} !important;
    background: ${outerBg} !important;
  }
  ${isRich ? `
  div[style*="background-color: #ffffff"], div[style*="background-color:#ffffff"],
  div[style*="background-color: #fff"], div[style*="background-color:#fff"],
  div[style*="background-color: white"], div[style*="background-color:white"],
  div[style*="background: #ffffff"], div[style*="background:#ffffff"],
  div[style*="background: white"], div[style*="background:white"],
  table[bgcolor="#ffffff"], table[bgcolor="#fff"], table[bgcolor="white"],
  td[bgcolor="#ffffff"], td[bgcolor="#fff"], td[bgcolor="white"],
  td[style*="background-color: #ffffff"], td[style*="background-color:#ffffff"],
  td[style*="background-color: #fff"], td[style*="background-color:#fff"],
  td[style*="background-color: white"], td[style*="background-color:white"],
  tr[bgcolor="#ffffff"], tr[bgcolor="#fff"], tr[bgcolor="white"] {
    background-color: ${contentBg} !important;
    background: ${contentBg} !important;
  }
  ` : `
  div[style*="background-color: #f"], div[style*="background-color:#f"],
  div[style*="background-color: #e"], div[style*="background-color:#e"],
  div[style*="background-color: #d"], div[style*="background-color:#d"],
  div[style*="background-color: #c"], div[style*="background-color:#c"],
  div[style*="background-color: #F"], div[style*="background-color:#F"],
  div[style*="background-color: #E"], div[style*="background-color:#E"],
  div[style*="background-color: #D"], div[style*="background-color:#D"],
  div[style*="background-color: #C"], div[style*="background-color:#C"],
  div[style*="background-color: rgb(2"], div[style*="background-color:rgb(2"],
  div[style*="background: #f"], div[style*="background:#f"],
  div[style*="background: #e"], div[style*="background:#e"],
  div[style*="background: #F"], div[style*="background:#F"],
  div[style*="background: #E"], div[style*="background:#E"],
  table[bgcolor^="#f"], table[bgcolor^="#F"],
  table[bgcolor^="#e"], table[bgcolor^="#E"],
  table[bgcolor^="#d"], table[bgcolor^="#D"],
  table[bgcolor^="#c"], table[bgcolor^="#C"],
  td[bgcolor^="#f"], td[bgcolor^="#F"],
  td[bgcolor^="#e"], td[bgcolor^="#E"],
  td[bgcolor^="#d"], td[bgcolor^="#D"],
  td[bgcolor^="#c"], td[bgcolor^="#C"],
  td[style*="background-color: #f"], td[style*="background-color:#f"],
  td[style*="background-color: #e"], td[style*="background-color:#e"],
  td[style*="background-color: #d"], td[style*="background-color:#d"],
  td[style*="background-color: #c"], td[style*="background-color:#c"],
  td[style*="background-color: #F"], td[style*="background-color:#F"],
  td[style*="background-color: #E"], td[style*="background-color:#E"],
  td[style*="background-color: #D"], td[style*="background-color:#D"],
  td[style*="background-color: #C"], td[style*="background-color:#C"],
  td[style*="background-color: rgb(2"], td[style*="background-color:rgb(2"],
  tr[bgcolor^="#f"], tr[bgcolor^="#F"],
  tr[bgcolor^="#e"], tr[bgcolor^="#E"],
  tr[bgcolor^="#d"], tr[bgcolor^="#D"],
  tr[bgcolor^="#c"], tr[bgcolor^="#C"] {
    background-color: ${contentBg} !important;
    background: ${contentBg} !important;
  }
  `}
  body[text], 
  td[style*="color: #0"], td[style*="color:#0"],
  td[style*="color: #1"], td[style*="color:#1"],
  td[style*="color: #2"], td[style*="color:#2"],
  td[style*="color: #3"], td[style*="color:#3"],
  td[style*="color: #4"], td[style*="color:#4"],
  td[style*="color: #5"], td[style*="color:#5"],
  td[style*="color: black"], td[style*="color:black"],
  span[style*="color: #0"], span[style*="color:#0"],
  span[style*="color: #1"], span[style*="color:#1"],
  span[style*="color: #2"], span[style*="color:#2"],
  span[style*="color: #3"], span[style*="color:#3"],
  span[style*="color: #4"], span[style*="color:#4"],
  span[style*="color: #5"], span[style*="color:#5"],
  span[style*="color: black"], span[style*="color:black"],
  font[color="#000000"], font[color="#000"], font[color="black"],
  font[color^="#0"], font[color^="#1"], font[color^="#2"],
  font[color^="#3"], font[color^="#4"], font[color^="#5"],
  p[style*="color: #0"], p[style*="color:#0"],
  p[style*="color: #1"], p[style*="color:#1"],
  p[style*="color: #2"], p[style*="color:#2"],
  p[style*="color: #3"], p[style*="color:#3"],
  p[style*="color: #4"], p[style*="color:#4"],
  p[style*="color: #5"], p[style*="color:#5"],
  div[style*="color: #0"], div[style*="color:#0"],
  div[style*="color: #1"], div[style*="color:#1"],
  div[style*="color: #2"], div[style*="color:#2"],
  div[style*="color: #3"], div[style*="color:#3"],
  div[style*="color: #4"], div[style*="color:#4"],
  div[style*="color: #5"], div[style*="color:#5"],
  h1[style*="color: #"], h2[style*="color: #"], h3[style*="color: #"],
  h4[style*="color: #"], h5[style*="color: #"], h6[style*="color: #"],
  li[style*="color: #0"], li[style*="color: #1"],
  li[style*="color: #2"], li[style*="color: #3"],
  li[style*="color: #4"], li[style*="color: #5"] {
    color: ${textColor} !important;
  }
  span[style*="color: #6"], span[style*="color:#6"],
  span[style*="color: #7"], span[style*="color:#7"],
  span[style*="color: #8"], span[style*="color:#8"],
  span[style*="color: #9"], span[style*="color:#9"],
  span[style*="color: #a"], span[style*="color:#a"],
  span[style*="color: #b"], span[style*="color:#b"],
  span[style*="color: #A"], span[style*="color:#A"],
  span[style*="color: #B"], span[style*="color:#B"],
  td[style*="color: #6"], td[style*="color:#6"],
  td[style*="color: #7"], td[style*="color:#7"],
  td[style*="color: #8"], td[style*="color:#8"],
  td[style*="color: #9"], td[style*="color:#9"],
  p[style*="color: #6"], p[style*="color:#6"],
  p[style*="color: #7"], p[style*="color:#7"],
  p[style*="color: #8"], p[style*="color:#8"],
  p[style*="color: #9"], p[style*="color:#9"],
  div[style*="color: #6"], div[style*="color:#6"],
  div[style*="color: #7"], div[style*="color:#7"],
  div[style*="color: #8"], div[style*="color:#8"],
  div[style*="color: #9"], div[style*="color:#9"],
  font[color^="#6"], font[color^="#7"], font[color^="#8"], font[color^="#9"],
  font[color^="#a"], font[color^="#A"], font[color^="#b"], font[color^="#B"] {
    color: #9aa0a6 !important;
  }` : '';

    const lightTextOverrides = !dark ? `
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
  }` : '';

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

      if (isDark && doc.body) {
        const enforceDarkMode = () => {
          const parseColor = (c: string) => {
            if (!c || c === "transparent" || c === "rgba(0, 0, 0, 0)") return null;
            const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            return m ? [+m[1], +m[2], +m[3]] as const : null;
          };
          const isLightBg = (r: number, g: number, b: number) => (r * 299 + g * 587 + b * 114) / 1000 > 180;
          const isDarkText = (r: number, g: number, b: number) => (r * 299 + g * 587 + b * 114) / 1000 < 80;
          const els = doc.querySelectorAll("*");
          els.forEach((el) => {
            const s = doc.defaultView?.getComputedStyle(el);
            if (!s) return;
            const bg = parseColor(s.backgroundColor);
            if (bg && isLightBg(bg[0], bg[1], bg[2])) {
              (el as HTMLElement).style.setProperty("background-color", "#1a1a1e", "important");
            }
            const fg = parseColor(s.color);
            if (fg && isDarkText(fg[0], fg[1], fg[2])) {
              (el as HTMLElement).style.setProperty("color", "#e0e0e4", "important");
            }
          });
        };
        setTimeout(enforceDarkMode, 50);
        setTimeout(enforceDarkMode, 300);
      }

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
