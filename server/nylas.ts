import sanitizeHtml from "sanitize-html";

const NYLAS_API_URL = "https://api.us.nylas.com";
const NYLAS_API_KEY = process.env.NYLAS_API_KEY!;
const NYLAS_CLIENT_ID = process.env.NYLAS_CLIENT_ID!;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const messagesCache = new Map<string, CacheEntry<EmailListItem[]>>();
const pendingRequests = new Map<string, Promise<EmailListItem[]>>();
const CACHE_TTL = 60000; // 60 seconds cache for faster reloads

interface NylasEmailParticipant {
  email: string;
  name?: string;
}

interface NylasAttachment {
  id: string;
  filename?: string;
  content_type: string;
  size: number;
  content_id?: string;
  is_inline?: boolean;
}

interface NylasMessage {
  id: string;
  grant_id: string;
  subject: string;
  from: NylasEmailParticipant[];
  to: NylasEmailParticipant[];
  cc?: NylasEmailParticipant[];
  bcc?: NylasEmailParticipant[];
  date: number;
  thread_id: string;
  snippet: string;
  body?: string;
  unread: boolean;
  starred: boolean;
  folders?: string[];
  labels?: string[];
  attachments?: NylasAttachment[];
}

interface NylasGrant {
  id: string;
  provider: string;
  email: string;
}

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

const avatarColors = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B", 
  "#10B981", "#06B6D4", "#6366F1", "#84CC16", "#F97316"
];

function getAvatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'center', 'font', 'hr'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'font': ['color', 'face', 'size'],
      'table': ['width', 'border', 'cellpadding', 'cellspacing', 'align', 'bgcolor'],
      'td': ['width', 'align', 'valign', 'colspan', 'rowspan', 'bgcolor'],
      'th': ['width', 'align', 'valign', 'colspan', 'rowspan', 'bgcolor'],
      'tr': ['align', 'valign', 'bgcolor'],
      'div': ['align', 'class', 'dir'],
      'p': ['align', 'dir'],
      'span': ['class', 'dir'],
      'blockquote': ['type', 'cite', 'class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedClasses: {
      'div': ['gmail_quote', 'gmail_attr', 'moz-cite-prefix', 'yahoo_quoted', 'WordSection1', 'MsoNormal'],
      'blockquote': ['gmail_quote', 'moz-cite-prefix'],
      'span': ['gmail_default', 'MsoHyperlink'],
      'p': ['MsoNormal'],
    },
    allowedStyles: {
      'div': {
        'border-left': [/^\d+(?:\.\d+)?(?:px|pt)\s+solid\s+[#a-zA-Z0-9]+$/],
        'margin-left': [/^\d+(?:\.\d+)?(?:px|pt|em)$/],
        'padding-left': [/^\d+(?:\.\d+)?(?:px|pt|em)$/],
      },
      'blockquote': {
        'border-left': [/^\d+(?:\.\d+)?(?:px|pt)\s+solid\s+[#a-zA-Z0-9]+$/],
        'margin': [/^\d+(?:\.\d+)?(?:px|pt|em)(?:\s+\d+(?:\.\d+)?(?:px|pt|em))*$/],
        'margin-left': [/^\d+(?:\.\d+)?(?:px|pt|em)$/],
        'padding-left': [/^\d+(?:\.\d+)?(?:px|pt|em)$/],
      },
      'span': {
        'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(\d+,\s*\d+,\s*\d+\)$/, /^[a-z]+$/i],
        'font-size': [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/],
        'font-family': [/^[a-zA-Z\s,'-]+$/],
        'font-weight': [/^(?:normal|bold|\d{3})$/],
      },
      'p': {
        'margin': [/^\d+(?:\.\d+)?(?:px|pt|em)(?:\s+\d+(?:\.\d+)?(?:px|pt|em))*$/],
      },
      'font': {
        'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(\d+,\s*\d+,\s*\d+\)$/, /^[a-z]+$/i],
      },
    },
  });
}

async function nylasRequest(path: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(`${NYLAS_API_URL}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${NYLAS_API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (response.status === 429 && attempt < retries - 1) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`Rate limited by Nylas, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded for Nylas request');
}

export async function getAuthUrl(provider: string, redirectUri: string, state: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: NYLAS_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    provider,
    access_type: 'offline',
  });
  
  return `${NYLAS_API_URL}/v3/connect/auth?${params.toString()}`;
}

export async function exchangeCodeForGrant(code: string, redirectUri: string): Promise<NylasGrant> {
  const response = await nylasRequest('/v3/connect/token', {
    method: 'POST',
    body: JSON.stringify({
      client_id: NYLAS_CLIENT_ID,
      client_secret: NYLAS_API_KEY,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();
  return {
    id: data.grant_id,
    provider: data.provider || 'unknown',
    email: data.email,
  };
}

interface NylasFolder {
  id: string;
  name: string;
  system_folder?: string;
}

async function getFolders(grantId: string): Promise<NylasFolder[]> {
  const response = await nylasRequest(`/v3/grants/${grantId}/folders`);
  if (!response.ok) {
    console.error("Failed to fetch folders:", await response.text());
    return [];
  }
  const data = await response.json();
  return data.data || [];
}

async function getFolderIdByName(grantId: string, folderName: string): Promise<string | null> {
  const folders = await getFolders(grantId);
  
  // Map common folder names to system folder types
  const systemFolderMap: Record<string, string[]> = {
    'inbox': ['inbox', 'Inbox', 'INBOX'],
    'sent': ['sent', 'Sent', 'SENT', 'Sent Items', 'sentitems'],
    'trash': ['trash', 'Trash', 'TRASH', 'Deleted Items', 'deleteditems'],
    'drafts': ['drafts', 'Drafts', 'DRAFTS', 'Draft'],
    'junk': ['junk', 'Junk', 'JUNK', 'Spam', 'SPAM', 'Junk Email', 'junkemail'],
    'archived': ['archive', 'Archive', 'ARCHIVE', 'All Mail'],
  };
  
  const namesToMatch = systemFolderMap[folderName] || [folderName];
  
  for (const folder of folders) {
    if (namesToMatch.includes(folder.name) || 
        (folder.system_folder && namesToMatch.includes(folder.system_folder.toLowerCase()))) {
      return folder.id;
    }
  }
  
  console.log(`Folder "${folderName}" not found. Available folders:`, folders.map(f => f.name));
  return null;
}

export async function getMessages(grantId: string, folder?: string, provider?: string): Promise<EmailListItem[]> {
  const cacheKey = `${grantId}:${folder || 'inbox'}`;
  
  const cached = messagesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    return pending;
  }
  
  const fetchPromise = fetchMessagesFromNylas(grantId, folder, provider);
  pendingRequests.set(cacheKey, fetchPromise);
  
  try {
    const result = await fetchPromise;
    messagesCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

export function invalidateMessagesCache(grantId: string, folder?: string): void {
  const cacheKey = `${grantId}:${folder || 'inbox'}`;
  messagesCache.delete(cacheKey);
}

async function fetchMessagesFromNylas(grantId: string, folder?: string, provider?: string): Promise<EmailListItem[]> {
  let path = `/v3/grants/${grantId}/messages?limit=100`;
  
  const isMicrosoft = provider === 'microsoft';
  
  if (isMicrosoft) {
    const targetFolder = folder || 'inbox';
    const folderId = await getFolderIdByName(grantId, targetFolder);
    if (folderId) {
      path += `&in=${encodeURIComponent(folderId)}`;
    }
  } else {
    if (folder === 'trash') {
      path += '&in=TRASH';
    } else if (folder === 'sent') {
      path += '&in=SENT';
    } else if (folder === 'drafts') {
      path += '&in=DRAFT';
    } else if (folder === 'archived') {
    } else if (folder === 'junk') {
      path += '&in=SPAM';
    } else {
      path += '&in=INBOX';
    }
  }

  console.log(`Fetching messages from: ${path}`);
  const response = await nylasRequest(path);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch messages: ${error}`);
  }

  const data = await response.json();
  const messages: NylasMessage[] = data.data || [];

  return messages.map((msg) => {
    const fromParticipant = msg.from?.[0];
    const fromName = fromParticipant?.name || fromParticipant?.email || 'Unknown';
    const fromEmail = fromParticipant?.email || '';

    return {
      id: msg.id,
      subject: msg.subject || '(No Subject)',
      from: fromName,
      fromEmail,
      preview: msg.snippet || stripHtml(msg.body || ''),
      date: new Date(msg.date * 1000),
      isRead: !msg.unread,
      isStarred: msg.starred,
      threadId: msg.thread_id,
      avatarColor: getAvatarColor(fromEmail),
    };
  });
}

export async function getMessage(grantId: string, messageId: string): Promise<EmailDetail> {
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch message: ${error}`);
  }

  const data = await response.json();
  const msg: NylasMessage = data.data;

  const fromParticipant = msg.from?.[0];
  const fromName = fromParticipant?.name || fromParticipant?.email || 'Unknown';
  const fromEmail = fromParticipant?.email || '';

  let body = msg.body || '';
  if (body.includes('<')) {
    body = sanitizeEmailHtml(body);
  }

  // Safely extract email addresses, handling undefined arrays - always return arrays
  const toEmails = (msg.to ?? []).map(p => p.email).filter(Boolean) as string[];
  const ccEmails = (msg.cc ?? []).map(p => p.email).filter(Boolean) as string[];

  // Transform attachments, filtering out inline images
  const attachments: EmailAttachment[] = (msg.attachments ?? [])
    .filter(a => !a.is_inline)
    .map(a => ({
      id: a.id,
      filename: a.filename || 'Unnamed file',
      contentType: a.content_type,
      size: a.size,
      isInline: a.is_inline || false,
    }));

  return {
    id: msg.id,
    subject: msg.subject || '(No Subject)',
    from: fromName,
    fromEmail,
    to: toEmails,
    cc: ccEmails,
    body,
    date: new Date(msg.date * 1000),
    threadId: msg.thread_id,
    isRead: !msg.unread,
    isStarred: msg.starred,
    attachments: attachments.length > 0 ? attachments : undefined,
  };
}

export interface SendAttachment {
  filename: string;
  content: string; // base64 encoded content
  contentType: string;
}

function isHtmlContent(body: string): boolean {
  // Check for common HTML tags that indicate the content is already formatted HTML
  // This is more specific than checking for any < character to avoid false positives
  // with plain text containing mathematical expressions like "2 < 3"
  const htmlTagPattern = /<(?:html|head|body|div|p|br|span|a|img|table|tr|td|th|ul|ol|li|h[1-6]|strong|em|b|i|u|blockquote|pre|code|style|script|meta|link|!DOCTYPE)[^>]*>/i;
  return htmlTagPattern.test(body);
}

function formatEmailBody(body: string): string {
  // If body already contains HTML tags, assume it's formatted
  if (isHtmlContent(body)) {
    return body;
  }
  
  // Normalize all line endings to \n (handle Windows \r\n and old Mac \r)
  const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Convert plain text to HTML:
  // 1. Escape HTML entities
  // 2. Convert newlines to <br> tags
  // 3. Wrap in basic HTML structure for proper rendering
  const escaped = normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  const withBreaks = escaped.replace(/\n/g, '<br>');
  
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #1a1a1a;">${withBreaks}</div>`;
}

export async function sendMessage(
  grantId: string, 
  to: string[], 
  subject: string, 
  body: string, 
  replyToMessageId?: string,
  cc?: string[],
  bcc?: string[],
  attachments?: SendAttachment[]
): Promise<void> {
  // Format the body to preserve line breaks and formatting
  const formattedBody = formatEmailBody(body);
  
  const payload: Record<string, unknown> = {
    to: to.map(email => ({ email })),
    subject,
    body: formattedBody,
  };

  if (cc && cc.length > 0) {
    payload.cc = cc.map(email => ({ email }));
  }
  
  if (bcc && bcc.length > 0) {
    payload.bcc = bcc.map(email => ({ email }));
  }

  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }
  
  // Add attachments if provided
  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map(att => ({
      filename: att.filename,
      content: att.content,
      content_type: att.contentType,
    }));
  }

  const response = await nylasRequest(`/v3/grants/${grantId}/messages/send`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send message: ${error}`);
  }
}

export async function deleteMessage(grantId: string, messageId: string): Promise<void> {
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete message: ${error}`);
  }
}

interface NylasFolder {
  id: string;
  name: string;
  system_folder?: string;
  attributes?: string[];
}

const folderIdCache = new Map<string, Map<string, string>>();

export async function prefetchFolderIds(grantId: string): Promise<void> {
  if (!folderIdCache.has(grantId)) {
    getFolderIds(grantId).catch(() => {});
  }
}

async function getFolderIds(grantId: string): Promise<Map<string, string>> {
  if (folderIdCache.has(grantId)) {
    return folderIdCache.get(grantId)!;
  }

  const response = await nylasRequest(`/v3/grants/${grantId}/folders`);
  if (!response.ok) {
    throw new Error(`Failed to fetch folders: ${await response.text()}`);
  }

  const data = await response.json();
  const folders: NylasFolder[] = data.data || [];
  
  const folderMap = new Map<string, string>();
  
  for (const folder of folders) {
    const attrs = folder.attributes || [];
    if (attrs.includes('\\Trash') || folder.name?.toLowerCase() === 'trash') {
      folderMap.set('TRASH', folder.id);
    }
    if (attrs.includes('\\Inbox') || folder.name?.toLowerCase() === 'inbox') {
      folderMap.set('INBOX', folder.id);
    }
    if (attrs.includes('\\All') || folder.name?.toLowerCase() === 'all mail') {
      folderMap.set('ARCHIVE', folder.id);
    }
    if (attrs.includes('\\Spam') || attrs.includes('\\Junk') || folder.name?.toLowerCase() === 'spam') {
      folderMap.set('SPAM', folder.id);
    }
  }
  
  console.log('[Nylas getFolderIds] Folder mapping:', Object.fromEntries(folderMap));
  folderIdCache.set(grantId, folderMap);
  return folderMap;
}

export async function trashMessage(grantId: string, messageId: string): Promise<void> {
  const folderMap = await getFolderIds(grantId);
  const trashFolderId = folderMap.get('TRASH');
  
  if (!trashFolderId) {
    throw new Error('Could not find TRASH folder ID');
  }

  const payload = {
    folders: [trashFolderId],
  };
  console.log(`[Nylas trashMessage] Sending PUT to /v3/grants/${grantId}/messages/${messageId} with payload:`, JSON.stringify(payload));
  
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log(`[Nylas trashMessage] Response status: ${response.status}, body:`, responseText);

  if (!response.ok) {
    throw new Error(`Failed to trash message: ${responseText}`);
  }
}

export async function archiveMessage(grantId: string, messageId: string): Promise<void> {
  // For Gmail, archiving means moving to "All Mail" folder (removing from inbox)
  const folderMap = await getFolderIds(grantId);
  const archiveFolderId = folderMap.get('ARCHIVE');
  
  if (!archiveFolderId) {
    // If no archive folder found, try with empty folders array (removes from inbox)
    console.log('[Nylas archiveMessage] No ARCHIVE folder found, using empty folders array');
    const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ folders: [] }),
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to archive message: ${error}`);
    }
    return;
  }

  const payload = {
    folders: [archiveFolderId],
  };
  console.log(`[Nylas archiveMessage] Sending PUT with payload:`, JSON.stringify(payload));
  
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to archive message: ${error}`);
  }
}

export async function moveToInbox(grantId: string, messageId: string): Promise<void> {
  const folderMap = await getFolderIds(grantId);
  const inboxFolderId = folderMap.get('INBOX');
  
  if (!inboxFolderId) {
    throw new Error('Could not find INBOX folder ID');
  }

  const payload = {
    folders: [inboxFolderId],
  };
  console.log(`[Nylas moveToInbox] Sending PUT with payload:`, JSON.stringify(payload));
  
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to move message to inbox: ${error}`);
  }
}

export async function markAsRead(grantId: string, messageId: string): Promise<void> {
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({
      unread: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to mark as read: ${error}`);
  }
}

export async function markAsUnread(grantId: string, messageId: string): Promise<void> {
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({
      unread: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to mark as unread: ${error}`);
  }
}

export async function toggleStar(grantId: string, messageId: string, starred: boolean): Promise<void> {
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({
      starred,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to toggle star: ${error}`);
  }
}

export async function downloadAttachment(
  grantId: string, 
  messageId: string, 
  attachmentId: string
): Promise<{ data: Buffer; contentType: string; filename: string }> {
  // First get attachment metadata
  const metaResponse = await nylasRequest(
    `/v3/grants/${grantId}/attachments/${attachmentId}?message_id=${messageId}`
  );
  
  if (!metaResponse.ok) {
    const error = await metaResponse.text();
    throw new Error(`Failed to get attachment metadata: ${error}`);
  }
  
  const metaData = await metaResponse.json();
  const attachment = metaData.data;
  
  // Download the attachment content
  const downloadResponse = await nylasRequest(
    `/v3/grants/${grantId}/attachments/${attachmentId}/download?message_id=${messageId}`
  );
  
  if (!downloadResponse.ok) {
    const error = await downloadResponse.text();
    throw new Error(`Failed to download attachment: ${error}`);
  }
  
  const arrayBuffer = await downloadResponse.arrayBuffer();
  
  return {
    data: Buffer.from(arrayBuffer),
    contentType: attachment.content_type || 'application/octet-stream',
    filename: attachment.filename || 'attachment',
  };
}
