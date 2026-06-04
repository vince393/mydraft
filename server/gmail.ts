import { google } from "googleapis";
import type { IEmailProvider, EmailListItem, EmailDetail, GetMessagesOptions, TokenData, SendAttachment } from "./email-provider";
import { getAvatarColor, stripHtml, sanitizeEmailHtml, formatEmailBody } from "./email-provider";
import { logApiHealth } from "./api-health";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

function createOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
}

function getGmail(accessToken: string) {
  const auth = createOAuth2Client();
  auth.setCredentials({ access_token: accessToken });
  return google.gmail({ version: "v1", auth });
}

const FOLDER_LABEL_MAP: Record<string, string> = {
  inbox: "INBOX",
  sent: "SENT",
  trash: "TRASH",
  drafts: "DRAFT",
  junk: "SPAM",
  spam: "SPAM",
  starred: "STARRED",
  archived: "",
};

function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim(), email: match[2].trim() };
  }
  return { name: raw.trim(), email: raw.trim() };
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function getMessageBody(payload: any): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (payload.parts) {
    const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
    if (htmlPart?.body?.data) {
      return decodeBase64Url(htmlPart.body.data);
    }

    const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      return decodeBase64Url(textPart.body.data);
    }

    for (const part of payload.parts) {
      if (part.parts) {
        const nested = getMessageBody(part);
        if (nested) return nested;
      }
    }
  }

  return "";
}

function getAttachments(payload: any): { id: string; filename: string; contentType: string; size: number; isInline: boolean }[] {
  const attachments: any[] = [];

  function walk(parts: any[]) {
    for (const part of parts || []) {
      if (part.filename && part.body?.attachmentId) {
        const isInline = !!(part.headers || []).find(
          (h: any) => h.name.toLowerCase() === "content-disposition" && h.value.includes("inline")
        );
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          contentType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
          isInline,
        });
      }
      if (part.parts) walk(part.parts);
    }
  }

  walk(payload.parts || []);
  return attachments;
}

export const gmailProvider: IEmailProvider = {
  getAuthUrl(redirectUri: string, state: string): string {
    const oauth2Client = createOAuth2Client(redirectUri);
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state,
    });
  },

  async exchangeCode(code: string, redirectUri: string): Promise<TokenData> {
    const oauth2Client = createOAuth2Client(redirectUri);
    try {
      const { tokens } = await oauth2Client.getToken(code);

      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      const { data: profile } = await gmail.users.getProfile({ userId: "me" });

      await logApiHealth("google", "oauth/token", 200);

      return {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiresAt: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
        email: profile.emailAddress || "",
      };
    } catch (error: any) {
      await logApiHealth("google", "oauth/token", error.code || 500, error.message, "error");
      throw error;
    }
  },

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await logApiHealth("google", "oauth/refresh", 200);
      return {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date || Date.now() + 3600 * 1000),
      };
    } catch (error: any) {
      await logApiHealth("google", "oauth/refresh", error.code || 401, error.message, "critical");
      throw error;
    }
  },

  async getMessages(accessToken: string, options?: GetMessagesOptions): Promise<EmailListItem[]> {
    const gmail = getGmail(accessToken);
    const folder = options?.folder || "inbox";
    const limit = options?.limit || 100;

    let labelIds: string[] = [];
    let q = "";

    if (folder === "archived") {
      q = "-in:inbox -in:spam -in:trash -in:draft";
    } else {
      const label = FOLDER_LABEL_MAP[folder] || "INBOX";
      if (label) labelIds = [label];
    }

    try {
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        labelIds: labelIds.length > 0 ? labelIds : undefined,
        q: q || undefined,
        maxResults: limit,
      });

      const messageIds = listResponse.data.messages || [];
      if (messageIds.length === 0) return [];

      const batchSize = 20;
      const results: EmailListItem[] = [];

      for (let i = 0; i < messageIds.length; i += batchSize) {
        const batch = messageIds.slice(i, i + batchSize);
        const messages = await Promise.all(
          batch.map((m) =>
            gmail.users.messages.get({
              userId: "me",
              id: m.id!,
              format: "metadata",
              metadataHeaders: ["From", "Subject", "Date"],
            })
          )
        );

        for (const msg of messages) {
          const headers = msg.data.payload?.headers || [];
          const fromRaw = getHeader(headers, "From");
          const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);
          const labels = msg.data.labelIds || [];

          results.push({
            id: msg.data.id!,
            subject: getHeader(headers, "Subject") || "(No Subject)",
            from: fromName || fromEmail,
            fromEmail,
            preview: msg.data.snippet || "",
            date: new Date(parseInt(msg.data.internalDate || "0")),
            isRead: !labels.includes("UNREAD"),
            isStarred: labels.includes("STARRED"),
            threadId: msg.data.threadId || msg.data.id!,
            avatarColor: getAvatarColor(fromEmail),
          });
        }
      }

      await logApiHealth("google", "messages/list", 200);
      return results;
    } catch (error: any) {
      await logApiHealth("google", "messages/list", error.code || 500, error.message, "error");
      throw error;
    }
  },

  async getMessage(accessToken: string, messageId: string): Promise<EmailDetail> {
    const gmail = getGmail(accessToken);
    try {
      const response = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const msg = response.data;
      const headers = msg.payload?.headers || [];
      const fromRaw = getHeader(headers, "From");
      const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);
      const labels = msg.labelIds || [];

      let body = getMessageBody(msg.payload);
      if (body.includes("<")) {
        body = sanitizeEmailHtml(body);
      }

      const toHeader = getHeader(headers, "To");
      const ccHeader = getHeader(headers, "Cc");
      const toEmails = toHeader ? toHeader.split(",").map((e) => parseEmailAddress(e.trim()).email).filter(Boolean) : [];
      const ccEmails = ccHeader ? ccHeader.split(",").map((e) => parseEmailAddress(e.trim()).email).filter(Boolean) : [];

      const rawAttachments = getAttachments(msg.payload);
      const attachments = rawAttachments.filter((a) => !a.isInline);

      await logApiHealth("google", "messages/get", 200);

      return {
        id: msg.id!,
        subject: getHeader(headers, "Subject") || "(No Subject)",
        from: fromName || fromEmail,
        fromEmail,
        to: toEmails,
        cc: ccEmails.length > 0 ? ccEmails : undefined,
        body,
        date: new Date(parseInt(msg.internalDate || "0")),
        threadId: msg.threadId || msg.id!,
        isRead: !labels.includes("UNREAD"),
        isStarred: labels.includes("STARRED"),
        attachments: attachments.length > 0 ? attachments : undefined,
      };
    } catch (error: any) {
      await logApiHealth("google", "messages/get", error.code || 500, error.message, "error");
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
    const gmail = getGmail(accessToken);
    const formattedBody = formatEmailBody(params.body);

    const boundary = `boundary_${Date.now()}`;
    const hasAttachments = params.attachments && params.attachments.length > 0;

    let rawHeaders = [
      `To: ${params.to.join(", ")}`,
      `Subject: ${params.subject}`,
      `MIME-Version: 1.0`,
    ];

    if (params.cc?.length) rawHeaders.push(`Cc: ${params.cc.join(", ")}`);
    if (params.bcc?.length) rawHeaders.push(`Bcc: ${params.bcc.join(", ")}`);
    if (params.replyToMessageId) {
      rawHeaders.push(`In-Reply-To: ${params.replyToMessageId}`);
      rawHeaders.push(`References: ${params.replyToMessageId}`);
    }

    let rawMessage: string;

    if (hasAttachments) {
      rawHeaders.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      let messageParts = rawHeaders.join("\r\n") + "\r\n\r\n";
      messageParts += `--${boundary}\r\n`;
      messageParts += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
      messageParts += formattedBody + "\r\n";

      for (const att of params.attachments!) {
        messageParts += `--${boundary}\r\n`;
        messageParts += `Content-Type: ${att.contentType}; name="${att.filename}"\r\n`;
        messageParts += `Content-Disposition: attachment; filename="${att.filename}"\r\n`;
        messageParts += `Content-Transfer-Encoding: base64\r\n\r\n`;
        messageParts += att.content + "\r\n";
      }
      messageParts += `--${boundary}--`;
      rawMessage = messageParts;
    } else {
      rawHeaders.push(`Content-Type: text/html; charset="UTF-8"`);
      rawMessage = rawHeaders.join("\r\n") + "\r\n\r\n" + formattedBody;
    }

    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    try {
      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
          threadId: params.threadId,
        },
      });
      await logApiHealth("google", "messages/send", 200);
    } catch (error: any) {
      await logApiHealth("google", "messages/send", error.code || 500, error.message, "error");
      throw error;
    }
  },

  async markAsRead(accessToken: string, messageId: string): Promise<void> {
    const gmail = getGmail(accessToken);
    try {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });
    } catch (error: any) {
      await logApiHealth("google", "messages/modify", error.code || 500, error.message, "warning");
      throw error;
    }
  },

  async markAsUnread(accessToken: string, messageId: string): Promise<void> {
    const gmail = getGmail(accessToken);
    try {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: { addLabelIds: ["UNREAD"] },
      });
    } catch (error: any) {
      await logApiHealth("google", "messages/modify", error.code || 500, error.message, "warning");
      throw error;
    }
  },

  async trashMessage(accessToken: string, messageId: string): Promise<void> {
    const gmail = getGmail(accessToken);
    try {
      await gmail.users.messages.trash({ userId: "me", id: messageId });
    } catch (error: any) {
      await logApiHealth("google", "messages/trash", error.code || 500, error.message, "error");
      throw error;
    }
  },

  async archiveMessage(accessToken: string, messageId: string): Promise<void> {
    const gmail = getGmail(accessToken);
    try {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: { removeLabelIds: ["INBOX"] },
      });
    } catch (error: any) {
      await logApiHealth("google", "messages/modify", error.code || 500, error.message, "error");
      throw error;
    }
  },

  async moveToInbox(accessToken: string, messageId: string): Promise<void> {
    const gmail = getGmail(accessToken);
    try {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: { addLabelIds: ["INBOX"], removeLabelIds: ["TRASH", "SPAM"] },
      });
    } catch (error: any) {
      await logApiHealth("google", "messages/modify", error.code || 500, error.message, "error");
      throw error;
    }
  },

  async deleteMessage(accessToken: string, messageId: string): Promise<void> {
    const gmail = getGmail(accessToken);
    try {
      await gmail.users.messages.delete({ userId: "me", id: messageId });
    } catch (error: any) {
      await logApiHealth("google", "messages/delete", error.code || 500, error.message, "error");
      throw error;
    }
  },

  async toggleStar(accessToken: string, messageId: string, starred: boolean): Promise<void> {
    const gmail = getGmail(accessToken);
    try {
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: starred
          ? { addLabelIds: ["STARRED"] }
          : { removeLabelIds: ["STARRED"] },
      });
    } catch (error: any) {
      await logApiHealth("google", "messages/modify", error.code || 500, error.message, "warning");
      throw error;
    }
  },

  async downloadAttachment(accessToken: string, messageId: string, attachmentId: string) {
    const gmail = getGmail(accessToken);
    try {
      const response = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: attachmentId,
      });

      const data = Buffer.from(
        (response.data.data || "").replace(/-/g, "+").replace(/_/g, "/"),
        "base64"
      );

      const msgResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });
      const attachments = getAttachments(msgResponse.data.payload);
      const att = attachments.find((a) => a.id === attachmentId);

      return {
        data,
        contentType: att?.contentType || "application/octet-stream",
        filename: att?.filename || "attachment",
      };
    } catch (error: any) {
      await logApiHealth("google", "attachments/get", error.code || 500, error.message, "error");
      throw error;
    }
  },
};
