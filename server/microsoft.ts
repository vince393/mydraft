import type { IEmailProvider, EmailListItem, EmailDetail, GetMessagesOptions, TokenData, SendAttachment } from "./email-provider";
import { getAvatarColor, sanitizeEmailHtml, formatEmailBody, isHtmlContent } from "./email-provider";
import { logApiHealth } from "./api-health";

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!;
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!;

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Mail.Read",
  "Mail.Send",
  "User.Read",
];

const GRAPH_URL = "https://graph.microsoft.com/v1.0";
const AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0";

// Microsoft Graph caps how many connections may be open against a single
// mailbox at once; exceeding it returns "ErrorTooManyObjectsOpened" ("Too many
// concurrent connections opened"). Several endpoints fan out across folders in
// parallel (e.g. /api/emails fetches 5 folders, /api/emails/unread-counts
// fetches 3) and the inbox triggers both at the same time, which can briefly
// open many connections to one mailbox. We gate Graph requests per access token
// so a single mailbox never has more than a few requests in flight at once; the
// rest queue and run as slots free up.
const MAX_CONCURRENT_PER_MAILBOX = 3;

interface MailboxGate {
  active: number;
  queue: Array<() => void>;
}
const mailboxGates = new Map<string, MailboxGate>();

function acquireMailboxSlot(key: string): Promise<() => void> {
  let gate = mailboxGates.get(key);
  if (!gate) {
    gate = { active: 0, queue: [] };
    mailboxGates.set(key, gate);
  }
  const g = gate;
  return new Promise((resolve) => {
    const grant = () => {
      g.active++;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        g.active--;
        const next = g.queue.shift();
        if (next) next();
        else if (g.active === 0 && g.queue.length === 0) mailboxGates.delete(key);
      });
    };
    if (g.active < MAX_CONCURRENT_PER_MAILBOX) grant();
    else g.queue.push(grant);
  });
}

function isTooManyObjectsError(text: string | null): boolean {
  if (!text) return false;
  return text.includes("ErrorTooManyObjectsOpened") || text.includes("Too many concurrent connections");
}

async function graphRequest(accessToken: string, path: string, options: RequestInit = {}): Promise<Response> {
  const releaseSlot = await acquireMailboxSlot(accessToken);
  try {
    return await graphRequestWithRetry(accessToken, path, options);
  } finally {
    releaseSlot();
  }
}

async function graphRequestWithRetry(accessToken: string, path: string, options: RequestInit = {}): Promise<Response> {
  const maxRetries = 3;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(`${GRAPH_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // "ErrorTooManyObjectsOpened" comes back as a 5xx with the code in the body;
    // treat it like throttling so we back off and retry instead of erroring out.
    let tooManyObjects = false;
    if (response.status >= 500) {
      const peek = await response.clone().text().catch(() => null);
      tooManyObjects = isTooManyObjectsError(peek);
    }

    if (response.status === 429 || response.status === 503 || response.status === 504 || tooManyObjects) {
      lastResponse = response;
      if (attempt >= maxRetries) break;
      const retryAfterRaw = response.headers.get("Retry-After");
      const retryAfterSec = retryAfterRaw ? parseInt(retryAfterRaw, 10) : NaN;
      const delayMs = !isNaN(retryAfterSec) && retryAfterSec > 0 ? retryAfterSec * 1000 : Math.min(1000 * Math.pow(2, attempt), 8000);
      console.warn(`[Microsoft] ${response.status}${tooManyObjects ? " (ErrorTooManyObjectsOpened)" : ""} on ${path}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    return response;
  }

  console.error(`[Microsoft] All ${maxRetries} retries exhausted for ${path}, returning last response (${lastResponse?.status})`);
  return lastResponse!;
}

const FOLDER_MAP: Record<string, string> = {
  inbox: "inbox",
  sent: "sentitems",
  trash: "deleteditems",
  drafts: "drafts",
  junk: "junkemail",
  spam: "junkemail",
  archived: "archive",
};

function parseGraphEmailAddress(addr: any): { name: string; email: string } {
  if (!addr) return { name: "Unknown", email: "" };
  return {
    name: addr.emailAddress?.name || addr.emailAddress?.address || "Unknown",
    email: addr.emailAddress?.address || "",
  };
}

export const microsoftProvider: IEmailProvider = {
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: SCOPES.join(" "),
      state,
      response_mode: "query",
      prompt: "consent",
    });
    return `${AUTH_URL}/authorize?${params.toString()}`;
  },

  async exchangeCode(code: string, redirectUri: string): Promise<TokenData> {
    try {
      const response = await fetch(`${AUTH_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: SCOPES.join(" "),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "oauth/token", response.status, error, "error");
        throw new Error(`Microsoft token exchange failed: ${error}`);
      }

      const tokens = await response.json();

      const userResponse = await graphRequest(tokens.access_token, "/me");
      const userData = await userResponse.json();

      await logApiHealth("microsoft", "oauth/token", 200);

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        email: userData.mail || userData.userPrincipalName || "",
      };
    } catch (error: any) {
      if (!error.message?.includes("Microsoft token exchange")) {
        await logApiHealth("microsoft", "oauth/token", 500, error.message, "error");
      }
      throw error;
    }
  },

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      const response = await fetch(`${AUTH_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: SCOPES.join(" "),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "oauth/refresh", response.status, error, "critical");
        throw new Error(`Microsoft token refresh failed: ${error}`);
      }

      const tokens = await response.json();
      await logApiHealth("microsoft", "oauth/refresh", 200);

      return {
        accessToken: tokens.access_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      };
    } catch (error: any) {
      if (!error.message?.includes("Microsoft token refresh")) {
        await logApiHealth("microsoft", "oauth/refresh", 500, error.message, "critical");
      }
      throw error;
    }
  },

  async getMessages(accessToken: string, options?: GetMessagesOptions): Promise<EmailListItem[]> {
    const folder = options?.folder || "inbox";
    const limit = options?.limit || 100;
    const graphFolder = FOLDER_MAP[folder] || "inbox";

    try {
      const response = await graphRequest(
        accessToken,
        `/me/mailFolders/${graphFolder}/messages?$top=${limit}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,receivedDateTime,isRead,flag,bodyPreview,conversationId`
      );

      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "messages/list", response.status, error, "error");
        throw new Error(`Failed to fetch messages: ${error}`);
      }

      const data = await response.json();
      const messages = data.value || [];

      await logApiHealth("microsoft", "messages/list", 200);

      return messages.map((msg: any) => {
        const from = parseGraphEmailAddress(msg.from);
        return {
          id: msg.id,
          subject: msg.subject || "(No Subject)",
          from: from.name,
          fromEmail: from.email,
          preview: msg.bodyPreview || "",
          date: new Date(msg.receivedDateTime),
          isRead: msg.isRead,
          isStarred: msg.flag?.flagStatus === "flagged",
          threadId: msg.conversationId || msg.id,
          avatarColor: getAvatarColor(from.email),
        };
      });
    } catch (error: any) {
      if (!error.message?.includes("Failed to fetch")) {
        await logApiHealth("microsoft", "messages/list", 500, error.message, "error");
      }
      throw error;
    }
  },

  async searchMessages(accessToken: string, query: string, options?: { limit?: number }): Promise<(EmailListItem & { folder?: string })[]> {
    const limit = options?.limit || 50;
    try {
      // Graph $search cannot be combined with $orderby. Escape embedded quotes,
      // then URL-encode the ENTIRE quoted literal (quotes included) — encoding
      // only the text *inside* literal quotes makes Graph match the percent-
      // encoded characters (e.g. "%20") instead of the intended terms. Graph
      // $search also requires the ConsistencyLevel: eventual header.
      const safe = query.replace(/"/g, '\\"');
      const searchLiteral = encodeURIComponent(`"${safe}"`);
      const response = await graphRequest(
        accessToken,
        `/me/messages?$search=${searchLiteral}&$top=${limit}&$select=id,subject,from,receivedDateTime,isRead,flag,bodyPreview,conversationId,parentFolderId`,
        { headers: { ConsistencyLevel: "eventual" } }
      );

      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "messages/search", response.status, error, "error");
        throw new Error(`Failed to search messages: ${error}`);
      }

      const data = await response.json();
      const messages = data.value || [];
      await logApiHealth("microsoft", "messages/search", 200);

      return messages.map((msg: any) => {
        const from = parseGraphEmailAddress(msg.from);
        return {
          id: msg.id,
          subject: msg.subject || "(No Subject)",
          from: from.name,
          fromEmail: from.email,
          preview: msg.bodyPreview || "",
          date: new Date(msg.receivedDateTime),
          isRead: msg.isRead,
          isStarred: msg.flag?.flagStatus === "flagged",
          threadId: msg.conversationId || msg.id,
          avatarColor: getAvatarColor(from.email),
          folder: "inbox",
        };
      });
    } catch (error: any) {
      if (!error.message?.includes("Failed to search")) {
        await logApiHealth("microsoft", "messages/search", 500, error.message, "error");
      }
      throw error;
    }
  },

  async getMessage(accessToken: string, messageId: string): Promise<EmailDetail> {
    try {
      const response = await graphRequest(
        accessToken,
        `/me/messages/${messageId}?$select=id,subject,from,toRecipients,ccRecipients,body,receivedDateTime,isRead,flag,conversationId,hasAttachments`
      );

      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "messages/get", response.status, error, "error");
        throw new Error(`Failed to fetch message: ${error}`);
      }

      const msg = await response.json();
      const from = parseGraphEmailAddress(msg.from);
      const toEmails = (msg.toRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);
      const ccEmails = (msg.ccRecipients || []).map((r: any) => r.emailAddress?.address).filter(Boolean);

      let body = msg.body?.content || "";
      if (body.includes("<")) {
        body = sanitizeEmailHtml(body);
      }

      let attachments;
      if (msg.hasAttachments) {
        const attResponse = await graphRequest(accessToken, `/me/messages/${messageId}/attachments`);
        if (attResponse.ok) {
          const attData = await attResponse.json();
          attachments = (attData.value || [])
            .filter((a: any) => !a.isInline && a["@odata.type"] === "#microsoft.graph.fileAttachment")
            .map((a: any) => ({
              id: a.id,
              filename: a.name || "Unnamed file",
              contentType: a.contentType || "application/octet-stream",
              size: a.size || 0,
              isInline: a.isInline || false,
            }));
        }
      }

      await logApiHealth("microsoft", "messages/get", 200);

      return {
        id: msg.id,
        subject: msg.subject || "(No Subject)",
        from: from.name,
        fromEmail: from.email,
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        body,
        date: new Date(msg.receivedDateTime),
        threadId: msg.conversationId || msg.id,
        isRead: msg.isRead,
        isStarred: msg.flag?.flagStatus === "flagged",
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      };
    } catch (error: any) {
      if (!error.message?.includes("Failed to fetch")) {
        await logApiHealth("microsoft", "messages/get", 500, error.message, "error");
      }
      throw error;
    }
  },

  async sendMessage(accessToken: string, params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    replyToMessageId?: string;
    threadId?: string;
    attachments?: SendAttachment[];
  }): Promise<void> {
    const formattedBody = formatEmailBody(params.body);

    if (params.replyToMessageId) {
      const replyComment = isHtmlContent(params.body)
        ? params.body
        : params.body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      const replyBody = {
        message: {
          toRecipients: params.to.map((email) => ({ emailAddress: { address: email } })),
          ...(params.cc?.length && { ccRecipients: params.cc.map((email) => ({ emailAddress: { address: email } })) }),
          ...(params.bcc?.length && { bccRecipients: params.bcc.map((email) => ({ emailAddress: { address: email } })) }),
        },
        comment: replyComment,
      };

      try {
        const response = await graphRequest(accessToken, `/me/messages/${params.replyToMessageId}/reply`, {
          method: "POST",
          body: JSON.stringify(replyBody),
        });

        if (!response.ok) {
          const error = await response.text();
          await logApiHealth("microsoft", "messages/reply", response.status, error, "error");
          throw new Error(`Failed to reply: ${error}`);
        }
        await logApiHealth("microsoft", "messages/reply", 200);
        return;
      } catch (error: any) {
        if (!error.message?.includes("Failed to reply")) {
          await logApiHealth("microsoft", "messages/reply", 500, error.message, "error");
        }
        throw error;
      }
    }

    const sendBody: any = {
      message: {
        subject: params.subject,
        body: { contentType: "HTML", content: formattedBody },
        toRecipients: params.to.map((email) => ({ emailAddress: { address: email } })),
        ...(params.cc?.length && { ccRecipients: params.cc.map((email) => ({ emailAddress: { address: email } })) }),
        ...(params.bcc?.length && { bccRecipients: params.bcc.map((email) => ({ emailAddress: { address: email } })) }),
      },
    };

    if (params.attachments?.length) {
      sendBody.message.attachments = params.attachments.map((att) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.filename,
        contentType: att.contentType,
        contentBytes: att.content,
      }));
    }

    try {
      const response = await graphRequest(accessToken, "/me/sendMail", {
        method: "POST",
        body: JSON.stringify(sendBody),
      });

      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "messages/send", response.status, error, "error");
        throw new Error(`Failed to send message: ${error}`);
      }
      await logApiHealth("microsoft", "messages/send", 200);
    } catch (error: any) {
      if (!error.message?.includes("Failed to send")) {
        await logApiHealth("microsoft", "messages/send", 500, error.message, "error");
      }
      throw error;
    }
  },

  async markAsRead(accessToken: string, messageId: string): Promise<void> {
    try {
      const response = await graphRequest(accessToken, `/me/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ isRead: true }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to mark as read: ${error}`);
      }
    } catch (error: any) {
      await logApiHealth("microsoft", "messages/update", error.code || 500, error.message, "warning");
      throw error;
    }
  },

  async markAsUnread(accessToken: string, messageId: string): Promise<void> {
    try {
      const response = await graphRequest(accessToken, `/me/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({ isRead: false }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to mark as unread: ${error}`);
      }
    } catch (error: any) {
      await logApiHealth("microsoft", "messages/update", error.code || 500, error.message, "warning");
      throw error;
    }
  },

  async trashMessage(accessToken: string, messageId: string): Promise<void> {
    try {
      const response = await graphRequest(accessToken, `/me/messages/${messageId}/move`, {
        method: "POST",
        body: JSON.stringify({ destinationId: "deleteditems" }),
      });
      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "messages/move", response.status, error, "error");
        throw new Error(`Failed to trash message: ${error}`);
      }
    } catch (error: any) {
      if (!error.message?.includes("Failed to trash")) {
        await logApiHealth("microsoft", "messages/move", 500, error.message, "error");
      }
      throw error;
    }
  },

  async archiveMessage(accessToken: string, messageId: string): Promise<void> {
    try {
      const response = await graphRequest(accessToken, `/me/messages/${messageId}/move`, {
        method: "POST",
        body: JSON.stringify({ destinationId: "archive" }),
      });
      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "messages/move", response.status, error, "error");
        throw new Error(`Failed to archive message: ${error}`);
      }
    } catch (error: any) {
      if (!error.message?.includes("Failed to archive")) {
        await logApiHealth("microsoft", "messages/move", 500, error.message, "error");
      }
      throw error;
    }
  },

  async moveToInbox(accessToken: string, messageId: string): Promise<void> {
    try {
      const response = await graphRequest(accessToken, `/me/messages/${messageId}/move`, {
        method: "POST",
        body: JSON.stringify({ destinationId: "inbox" }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to move to inbox: ${error}`);
      }
    } catch (error: any) {
      await logApiHealth("microsoft", "messages/move", 500, error.message, "error");
      throw error;
    }
  },

  async deleteMessage(accessToken: string, messageId: string): Promise<void> {
    try {
      const response = await graphRequest(accessToken, `/me/messages/${messageId}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        const error = await response.text();
        await logApiHealth("microsoft", "messages/delete", response.status, error, "error");
        throw new Error(`Failed to delete message: ${error}`);
      }
    } catch (error: any) {
      if (!error.message?.includes("Failed to delete")) {
        await logApiHealth("microsoft", "messages/delete", 500, error.message, "error");
      }
      throw error;
    }
  },

  async toggleStar(accessToken: string, messageId: string, starred: boolean): Promise<void> {
    try {
      const response = await graphRequest(accessToken, `/me/messages/${messageId}`, {
        method: "PATCH",
        body: JSON.stringify({
          flag: { flagStatus: starred ? "flagged" : "notFlagged" },
        }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to toggle star: ${error}`);
      }
    } catch (error: any) {
      await logApiHealth("microsoft", "messages/update", 500, error.message, "warning");
      throw error;
    }
  },

  async downloadAttachment(accessToken: string, messageId: string, attachmentId: string) {
    try {
      const response = await graphRequest(
        accessToken,
        `/me/messages/${messageId}/attachments/${attachmentId}`
      );

      if (!response.ok) {
        const error = await response.text();
        await logApiHealth("microsoft", "attachments/get", response.status, error, "error");
        throw new Error(`Failed to download attachment: ${error}`);
      }

      const attachment = await response.json();
      const data = Buffer.from(attachment.contentBytes || "", "base64");

      return {
        data,
        contentType: attachment.contentType || "application/octet-stream",
        filename: attachment.name || "attachment",
      };
    } catch (error: any) {
      if (!error.message?.includes("Failed to download")) {
        await logApiHealth("microsoft", "attachments/get", 500, error.message, "error");
      }
      throw error;
    }
  },
};
