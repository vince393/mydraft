import sanitizeHtml from "sanitize-html";

export interface EmailListItem {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  preview: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  threadId: string;
  avatarColor: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

export interface EmailDetail {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string[];
  cc?: string[];
  body: string;
  date: Date;
  threadId: string;
  isRead: boolean;
  isStarred: boolean;
  attachments?: EmailAttachment[];
}

export interface SendAttachment {
  filename: string;
  content: string;
  contentType: string;
}

export interface GetMessagesOptions {
  folder?: string;
  limit?: number;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}

export interface IEmailProvider {
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<TokenData>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }>;
  getMessages(accessToken: string, options?: GetMessagesOptions): Promise<EmailListItem[]>;
  // Search the mailbox (across folders where the provider supports it) so mail
  // outside the recently-cached window is still findable. Returns list items
  // shaped like getMessages, with a `folder` hint where the provider exposes it.
  searchMessages(accessToken: string, query: string, options?: { limit?: number }): Promise<(EmailListItem & { folder?: string })[]>;
  getMessage(accessToken: string, messageId: string): Promise<EmailDetail>;
  sendMessage(accessToken: string, params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    replyToMessageId?: string;
    threadId?: string;
    attachments?: SendAttachment[];
  }): Promise<void>;
  markAsRead(accessToken: string, messageId: string): Promise<void>;
  markAsUnread(accessToken: string, messageId: string): Promise<void>;
  trashMessage(accessToken: string, messageId: string): Promise<void>;
  archiveMessage(accessToken: string, messageId: string): Promise<void>;
  moveToInbox(accessToken: string, messageId: string): Promise<void>;
  deleteMessage(accessToken: string, messageId: string): Promise<void>;
  toggleStar(accessToken: string, messageId: string, starred: boolean): Promise<void>;
  downloadAttachment(accessToken: string, messageId: string, attachmentId: string): Promise<{
    data: Buffer;
    contentType: string;
    filename: string;
  }>;
}

const avatarColors = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B",
  "#10B981", "#06B6D4", "#6366F1", "#84CC16", "#F97316"
];

export function getAvatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

export function isHtmlContent(body: string): boolean {
  const htmlTagPattern = /<(?:html|head|body|div|p|br|span|a|img|table|tr|td|th|ul|ol|li|h[1-6]|strong|em|b|i|u|blockquote|pre|code|style|script|meta|link|!DOCTYPE)[^>]*>/i;
  return htmlTagPattern.test(body);
}

export function formatEmailBody(body: string): string {
  if (/<!DOCTYPE\s+html/i.test(body) || /<html[\s>]/i.test(body)) {
    return body;
  }

  let content: string;

  if (isHtmlContent(body)) {
    content = body;
  } else {
    const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const escaped = normalized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    content = escaped.replace(/\n/g, '<br>');
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;">
<div dir="ltr" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;word-wrap:break-word;overflow-wrap:break-word;">
${content}
</div>
</body>
</html>`;
}

export function sanitizeEmailHtml(html: string): string {
  const safeStyleRegex = /^(?!.*(?:expression|javascript|vbscript|-moz-binding|behavior)\s*[:(])(?!.*url\s*\()/i;
  const safeStyleWithUrlRegex = /^(?!.*(?:expression|javascript|vbscript|-moz-binding|behavior)\s*[:(])(?!.*url\s*\(\s*['"]?\s*(?:javascript|vbscript|data:text))/i;
  const commonAttrs = ['style', 'class', 'id', 'dir', 'lang', 'title', 'role', 'aria-label', 'aria-hidden'];

  const result = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'center', 'font', 'hr', 'style',
      'section', 'article', 'header', 'footer', 'main',
      'figure', 'figcaption', 'details', 'summary',
      'mark', 'time', 'wbr', 'abbr', 'del', 'ins', 'sub', 'sup', 'small',
      'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot',
    ]),
    allowedAttributes: {
      '*': commonAttrs,
      'a': [...commonAttrs, 'href', 'target', 'rel', 'name'],
      'img': [...commonAttrs, 'src', 'alt', 'width', 'height', 'border'],
      'font': [...commonAttrs, 'color', 'face', 'size'],
      'table': [...commonAttrs, 'width', 'height', 'border', 'cellpadding', 'cellspacing', 'align', 'bgcolor', 'background', 'valign', 'summary'],
      'td': [...commonAttrs, 'width', 'height', 'align', 'valign', 'colspan', 'rowspan', 'bgcolor', 'background', 'nowrap'],
      'th': [...commonAttrs, 'width', 'height', 'align', 'valign', 'colspan', 'rowspan', 'bgcolor', 'scope'],
      'tr': [...commonAttrs, 'align', 'valign', 'bgcolor', 'height'],
      'col': [...commonAttrs, 'width', 'span', 'align', 'valign'],
      'colgroup': [...commonAttrs, 'width', 'span', 'align', 'valign'],
      'div': [...commonAttrs, 'align', 'data-smartmail'],
      'p': [...commonAttrs, 'align'],
      'span': [...commonAttrs],
      'blockquote': [...commonAttrs, 'type', 'cite'],
      'ol': [...commonAttrs, 'start', 'type'],
      'ul': [...commonAttrs, 'type'],
      'li': [...commonAttrs, 'value'],
      'hr': [...commonAttrs, 'width', 'size', 'color', 'noshade', 'align'],
      'center': [...commonAttrs],
      'h1': [...commonAttrs, 'align'],
      'h2': [...commonAttrs, 'align'],
      'h3': [...commonAttrs, 'align'],
      'h4': [...commonAttrs, 'align'],
      'h5': [...commonAttrs, 'align'],
      'h6': [...commonAttrs, 'align'],
      'br': [...commonAttrs, 'clear'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'cid'],
    allowedSchemesByTag: {
      'img': ['http', 'https', 'cid'],
      'a': ['http', 'https', 'mailto'],
    },
    allowedClasses: { '*': ['*'] },
    allowedStyles: {
      '*': {
        'color': [safeStyleRegex], 'background-color': [safeStyleRegex], 'background': [safeStyleWithUrlRegex],
        'font-family': [safeStyleRegex], 'font-size': [safeStyleRegex], 'font-weight': [safeStyleRegex],
        'font-style': [safeStyleRegex], 'text-align': [safeStyleRegex], 'text-decoration': [safeStyleRegex],
        'text-transform': [safeStyleRegex], 'text-indent': [safeStyleRegex], 'line-height': [safeStyleRegex],
        'letter-spacing': [safeStyleRegex], 'word-spacing': [safeStyleRegex], 'white-space': [safeStyleRegex],
        'vertical-align': [safeStyleRegex], 'display': [safeStyleRegex], 'visibility': [safeStyleRegex],
        'float': [safeStyleRegex], 'clear': [safeStyleRegex], 'overflow': [safeStyleRegex],
        'overflow-x': [safeStyleRegex], 'overflow-y': [safeStyleRegex],
        'width': [safeStyleRegex], 'height': [safeStyleRegex],
        'min-width': [safeStyleRegex], 'min-height': [safeStyleRegex],
        'max-width': [safeStyleRegex], 'max-height': [safeStyleRegex],
        'margin': [safeStyleRegex], 'margin-top': [safeStyleRegex], 'margin-right': [safeStyleRegex],
        'margin-bottom': [safeStyleRegex], 'margin-left': [safeStyleRegex],
        'padding': [safeStyleRegex], 'padding-top': [safeStyleRegex], 'padding-right': [safeStyleRegex],
        'padding-bottom': [safeStyleRegex], 'padding-left': [safeStyleRegex],
        'border': [safeStyleRegex], 'border-top': [safeStyleRegex], 'border-right': [safeStyleRegex],
        'border-bottom': [safeStyleRegex], 'border-left': [safeStyleRegex],
        'border-width': [safeStyleRegex], 'border-style': [safeStyleRegex], 'border-color': [safeStyleRegex],
        'border-collapse': [safeStyleRegex], 'border-spacing': [safeStyleRegex], 'border-radius': [safeStyleRegex],
        'table-layout': [safeStyleRegex], 'list-style': [safeStyleRegex], 'list-style-type': [safeStyleRegex],
        'opacity': [safeStyleRegex], 'box-shadow': [safeStyleRegex], 'direction': [safeStyleRegex],
        'unicode-bidi': [safeStyleRegex], 'word-wrap': [safeStyleRegex], 'word-break': [safeStyleRegex],
        'overflow-wrap': [safeStyleRegex], 'position': [/^(?:relative|static)$/], 'cursor': [safeStyleRegex],
        'outline': [safeStyleRegex],
      },
    },
    exclusiveFilter: (frame) => {
      return ['script', 'object', 'embed', 'applet', 'iframe', 'form', 'input', 'button', 'select', 'textarea', 'svg', 'math'].includes(frame.tag);
    },
    transformTags: {
      'a': (tagName, attribs) => {
        const cleanAttribs = { ...attribs };
        delete cleanAttribs.onclick;
        delete cleanAttribs.onmouseover;
        return { tagName, attribs: { ...cleanAttribs, target: '_blank', rel: 'noopener noreferrer' } };
      },
      'style': (tagName, attribs) => ({ tagName, attribs }),
    },
  });

  let cleaned = result
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, content) => {
      const safeContent = content
        .replace(/expression\s*\([^)]*\)/gi, '')
        .replace(/javascript\s*:/gi, '')
        .replace(/vbscript\s*:/gi, '')
        .replace(/-moz-binding\s*:[^;}]*/gi, '')
        .replace(/behavior\s*:[^;}]*/gi, '')
        .replace(/@import\s+[^;]*/gi, '')
        .replace(/url\s*\(\s*['"]?\s*(?:javascript|vbscript|data:text)[^)]*\)/gi, 'none');
      return `<style>${safeContent}</style>`;
    });

  return cleaned;
}
