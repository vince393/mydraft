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
const CACHE_TTL = 30000;

interface NylasEmailParticipant {
  email: string;
  name?: string;
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
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['style', 'class'],
      'a': ['href', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
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
  };
}

export async function sendMessage(
  grantId: string, 
  to: string[], 
  subject: string, 
  body: string, 
  replyToMessageId?: string,
  cc?: string[],
  bcc?: string[]
): Promise<void> {
  const payload: Record<string, unknown> = {
    to: to.map(email => ({ email })),
    subject,
    body,
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

export async function trashMessage(grantId: string, messageId: string): Promise<void> {
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({
      folders: ['TRASH'],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to trash message: ${error}`);
  }
}

export async function archiveMessage(grantId: string, messageId: string): Promise<void> {
  // For Gmail, archiving means removing INBOX label (moving to "All Mail")
  const response = await nylasRequest(`/v3/grants/${grantId}/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({
      folders: [],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to archive message: ${error}`);
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
