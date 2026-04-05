import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import type {
  IEmailProvider,
  EmailListItem,
  EmailDetail,
  GetMessagesOptions,
  TokenData,
  SendAttachment,
} from "./email-provider";
import {
  getAvatarColor,
  stripHtml,
  sanitizeEmailHtml,
  formatEmailBody,
} from "./email-provider";
import { logApiHealth } from "./api-health";
import { encryptEmailContent, decryptEmailContent } from "./encryption";
import { lookup } from "dns/promises";

export interface ImapSmtpConfig {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  email: string;
  password: string;
}

export const WELL_KNOWN_PROVIDERS: Record<
  string,
  { imapHost: string; imapPort: number; smtpHost: string; smtpPort: number; name: string }
> = {
  "yahoo.com": { imapHost: "imap.mail.yahoo.com", imapPort: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 465, name: "Yahoo Mail" },
  "ymail.com": { imapHost: "imap.mail.yahoo.com", imapPort: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 465, name: "Yahoo Mail" },
  "rocketmail.com": { imapHost: "imap.mail.yahoo.com", imapPort: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 465, name: "Yahoo Mail" },
  "aol.com": { imapHost: "imap.aol.com", imapPort: 993, smtpHost: "smtp.aol.com", smtpPort: 465, name: "AOL Mail" },
  "icloud.com": { imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587, name: "iCloud Mail" },
  "me.com": { imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587, name: "iCloud Mail" },
  "mac.com": { imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587, name: "iCloud Mail" },
  "zoho.com": { imapHost: "imap.zoho.com", imapPort: 993, smtpHost: "smtp.zoho.com", smtpPort: 465, name: "Zoho Mail" },
  "zohomail.com": { imapHost: "imap.zoho.com", imapPort: 993, smtpHost: "smtp.zoho.com", smtpPort: 465, name: "Zoho Mail" },
  "fastmail.com": { imapHost: "imap.fastmail.com", imapPort: 993, smtpHost: "smtp.fastmail.com", smtpPort: 465, name: "Fastmail" },
  "protonmail.com": { imapHost: "127.0.0.1", imapPort: 1143, smtpHost: "127.0.0.1", smtpPort: 1025, name: "ProtonMail (Bridge)" },
  "proton.me": { imapHost: "127.0.0.1", imapPort: 1143, smtpHost: "127.0.0.1", smtpPort: 1025, name: "ProtonMail (Bridge)" },
  "gmx.com": { imapHost: "imap.gmx.com", imapPort: 993, smtpHost: "mail.gmx.com", smtpPort: 465, name: "GMX Mail" },
  "gmx.net": { imapHost: "imap.gmx.net", imapPort: 993, smtpHost: "mail.gmx.net", smtpPort: 465, name: "GMX Mail" },
  "mail.com": { imapHost: "imap.mail.com", imapPort: 993, smtpHost: "smtp.mail.com", smtpPort: 465, name: "Mail.com" },
  "yandex.com": { imapHost: "imap.yandex.com", imapPort: 993, smtpHost: "smtp.yandex.com", smtpPort: 465, name: "Yandex Mail" },
  "yandex.ru": { imapHost: "imap.yandex.ru", imapPort: 993, smtpHost: "smtp.yandex.ru", smtpPort: 465, name: "Yandex Mail" },
};

export function detectProvider(email: string): { imapHost: string; imapPort: number; smtpHost: string; smtpPort: number; name: string } | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  return WELL_KNOWN_PROVIDERS[domain] || null;
}

const FOLDER_MAP: Record<string, string[]> = {
  inbox: ["INBOX"],
  sent: ["Sent", "Sent Messages", "Sent Items", "[Gmail]/Sent Mail"],
  trash: ["Trash", "Deleted", "Deleted Messages", "Deleted Items", "[Gmail]/Trash"],
  drafts: ["Drafts", "[Gmail]/Drafts"],
  junk: ["Junk", "Spam", "Junk E-mail", "[Gmail]/Spam"],
  spam: ["Junk", "Spam", "Junk E-mail", "[Gmail]/Spam"],
  starred: ["INBOX"],
  archived: ["Archive", "All Mail", "[Gmail]/All Mail"],
};

function parseAddress(addr: any): { name: string; email: string } {
  if (!addr) return { name: "Unknown", email: "" };
  if (Array.isArray(addr)) {
    const first = addr[0];
    if (!first) return { name: "Unknown", email: "" };
    return { name: first.name || first.address || "Unknown", email: first.address || "" };
  }
  if (typeof addr === "object") {
    return { name: addr.name || addr.address || "Unknown", email: addr.address || "" };
  }
  if (typeof addr === "string") {
    const match = addr.match(/^(.+?)\s*<(.+?)>$/);
    if (match) return { name: match[1].replace(/"/g, "").trim(), email: match[2].trim() };
    return { name: addr, email: addr };
  }
  return { name: "Unknown", email: "" };
}

function addressListToEmails(addrList: any): string[] {
  if (!addrList) return [];
  if (!Array.isArray(addrList)) addrList = [addrList];
  const result: string[] = [];
  for (const group of addrList) {
    if (group.address) {
      result.push(group.address);
    } else if (Array.isArray(group)) {
      for (const a of group) {
        if (a.address) result.push(a.address);
      }
    }
  }
  return result;
}

async function createImapConnection(config: ImapSmtpConfig): Promise<ImapFlow> {
  const client = new ImapFlow({
    host: config.imapHost,
    port: config.imapPort,
    secure: config.imapPort === 993,
    auth: {
      user: config.email,
      pass: config.password,
    },
    logger: false,
  });
  await client.connect();
  return client;
}

function createSmtpTransport(config: ImapSmtpConfig) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.email,
      pass: config.password,
    },
  });
}

function parseImapConfig(accessToken: string): ImapSmtpConfig {
  const decrypted = decryptEmailContent(accessToken) || accessToken;
  return JSON.parse(decrypted) as ImapSmtpConfig;
}

export function encryptImapConfig(config: ImapSmtpConfig): string {
  const json = JSON.stringify(config);
  return encryptEmailContent(json) || json;
}

const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fd/i,
  /^fe80/i,
  /^fc/i,
  /^localhost$/i,
];

export async function validateHost(host: string): Promise<{ valid: boolean; error?: string }> {
  if (BLOCKED_IP_RANGES.some((r) => r.test(host))) {
    return { valid: false, error: "Internal/private addresses are not allowed" };
  }

  try {
    const addresses = await lookup(host, { all: true });
    for (const addr of (Array.isArray(addresses) ? addresses : [addresses])) {
      const ip = typeof addr === "string" ? addr : addr.address;
      if (BLOCKED_IP_RANGES.some((r) => r.test(ip))) {
        return { valid: false, error: "Host resolves to a blocked address" };
      }
    }
  } catch {
    return { valid: false, error: "Could not resolve hostname" };
  }

  return { valid: true };
}

async function findMailbox(client: ImapFlow, folderNames: string[]): Promise<string> {
  const mailboxes = await client.list();
  for (const name of folderNames) {
    const found = mailboxes.find(
      (m) => m.path.toLowerCase() === name.toLowerCase() || m.name.toLowerCase() === name.toLowerCase()
    );
    if (found) return found.path;
  }
  return folderNames[0];
}

export const imapProvider: IEmailProvider = {
  getAuthUrl(_redirectUri: string, _state: string): string {
    throw new Error("IMAP does not use OAuth. Use direct credentials instead.");
  },

  async exchangeCode(_code: string, _redirectUri: string): Promise<TokenData> {
    throw new Error("IMAP does not use OAuth. Use direct credentials instead.");
  },

  async refreshAccessToken(_refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    throw new Error("IMAP does not use OAuth token refresh.");
  },

  async getMessages(accessToken: string, options?: GetMessagesOptions): Promise<EmailListItem[]> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);

    try {
      const folder = options?.folder || "inbox";
      const limit = options?.limit || 100;

      const folderCandidates = FOLDER_MAP[folder] || ["INBOX"];
      const mailboxPath = await findMailbox(client, folderCandidates);

      const lock = await client.getMailboxLock(mailboxPath);
      try {
        const messages: EmailListItem[] = [];
        const total = client.mailbox?.exists || 0;
        if (total === 0) return [];

        const startSeq = Math.max(1, total - limit + 1);
        const range = `${startSeq}:*`;

        for await (const msg of client.fetch(range, {
          envelope: true,
          flags: true,
          uid: true,
        })) {
          const from = parseAddress(msg.envelope?.from);
          const flags = msg.flags || new Set();

          messages.push({
            id: String(msg.uid),
            subject: msg.envelope?.subject || "(No Subject)",
            from: from.name || from.email,
            fromEmail: from.email,
            preview: "",
            date: msg.envelope?.date || new Date(),
            isRead: flags.has("\\Seen"),
            isStarred: flags.has("\\Flagged"),
            threadId: msg.envelope?.messageId || String(msg.uid),
            avatarColor: getAvatarColor(from.email),
          });
        }

        if (folder === "starred") {
          const filtered = messages.filter((m) => m.isStarred);
          await logApiHealth("imap", "messages/list", 200);
          return filtered.reverse();
        }

        await logApiHealth("imap", "messages/list", 200);
        return messages.reverse();
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/list", 500, error.message, "error");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },

  async getMessage(accessToken: string, messageId: string): Promise<EmailDetail> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);

    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        let msgData: any = null;

        const uid = parseInt(messageId, 10);
        for await (const msg of client.fetch(String(uid), {
          envelope: true,
          flags: true,
          bodyStructure: true,
          source: true,
          uid: true,
        }, { uid: true })) {
          msgData = msg;
        }

        if (!msgData) {
          const mailboxes = await client.list();
          for (const mb of mailboxes) {
            if (mb.path === "INBOX") continue;
            try {
              const otherLock = await client.getMailboxLock(mb.path);
              try {
                for await (const msg of client.fetch(String(uid), {
                  envelope: true,
                  flags: true,
                  bodyStructure: true,
                  source: true,
                  uid: true,
                }, { uid: true })) {
                  msgData = msg;
                }
              } finally {
                otherLock.release();
              }
              if (msgData) break;
            } catch {
              continue;
            }
          }
        }

        if (!msgData) {
          throw new Error(`Message ${messageId} not found`);
        }

        const from = parseAddress(msgData.envelope?.from);
        const flags = msgData.flags || new Set();
        const toAddrs = addressListToEmails(msgData.envelope?.to);
        const ccAddrs = addressListToEmails(msgData.envelope?.cc);

        let body = "";
        const attachments: { id: string; filename: string; contentType: string; size: number; isInline: boolean }[] = [];

        if (msgData.source) {
          const { simpleParser } = await import("mailparser");
          const parsed = await simpleParser(msgData.source);
          body = parsed.html || parsed.textAsHtml || parsed.text || "";

          if (parsed.attachments) {
            for (const att of parsed.attachments) {
              attachments.push({
                id: att.checksum || att.contentId || String(Math.random()),
                filename: att.filename || "attachment",
                contentType: att.contentType || "application/octet-stream",
                size: att.size || 0,
                isInline: att.contentDisposition === "inline",
              });
            }
          }
        }

        if (body.includes("<")) {
          body = sanitizeEmailHtml(body);
        }

        const nonInlineAttachments = attachments.filter((a) => !a.isInline);

        await logApiHealth("imap", "messages/get", 200);

        return {
          id: String(msgData.uid),
          subject: msgData.envelope?.subject || "(No Subject)",
          from: from.name || from.email,
          fromEmail: from.email,
          to: toAddrs,
          cc: ccAddrs.length > 0 ? ccAddrs : undefined,
          body,
          date: msgData.envelope?.date || new Date(),
          threadId: msgData.envelope?.messageId || String(msgData.uid),
          isRead: flags.has("\\Seen"),
          isStarred: flags.has("\\Flagged"),
          attachments: nonInlineAttachments.length > 0 ? nonInlineAttachments : undefined,
        };
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/get", error.code || 500, error.message, "error");
      throw error;
    } finally {
      await client.logout().catch(() => {});
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
    const config = parseImapConfig(accessToken);
    const transport = createSmtpTransport(config);

    try {
      const formattedBody = formatEmailBody(params.body);

      const mailOptions: any = {
        from: config.email,
        to: params.to.join(", "),
        subject: params.subject,
        html: formattedBody,
      };

      if (params.cc?.length) mailOptions.cc = params.cc.join(", ");
      if (params.bcc?.length) mailOptions.bcc = params.bcc.join(", ");
      if (params.replyToMessageId) {
        mailOptions.inReplyTo = params.replyToMessageId;
        mailOptions.references = params.replyToMessageId;
      }

      if (params.attachments?.length) {
        mailOptions.attachments = params.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, "base64"),
          contentType: att.contentType,
        }));
      }

      await transport.sendMail(mailOptions);
      await logApiHealth("imap", "messages/send", 200);
    } catch (error: any) {
      await logApiHealth("imap", "messages/send", 500, error.message, "error");
      throw error;
    } finally {
      transport.close();
    }
  },

  async markAsRead(accessToken: string, messageId: string): Promise<void> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        await client.messageFlagsAdd(messageId, ["\\Seen"], { uid: true });
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/flags", 500, error.message, "warning");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },

  async markAsUnread(accessToken: string, messageId: string): Promise<void> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        await client.messageFlagsRemove(messageId, ["\\Seen"], { uid: true });
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/flags", 500, error.message, "warning");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },

  async trashMessage(accessToken: string, messageId: string): Promise<void> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const trashPath = await findMailbox(client, FOLDER_MAP.trash);
        await client.messageMove(messageId, trashPath, { uid: true });
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/trash", 500, error.message, "error");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },

  async archiveMessage(accessToken: string, messageId: string): Promise<void> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const archivePath = await findMailbox(client, FOLDER_MAP.archived);
        await client.messageMove(messageId, archivePath, { uid: true });
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/archive", 500, error.message, "error");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },

  async moveToInbox(accessToken: string, messageId: string): Promise<void> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);
    try {
      const trashPath = await findMailbox(client, FOLDER_MAP.trash);
      const lock = await client.getMailboxLock(trashPath);
      try {
        await client.messageMove(messageId, "INBOX", { uid: true });
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/move", 500, error.message, "error");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },

  async deleteMessage(accessToken: string, messageId: string): Promise<void> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        await client.messageFlagsAdd(messageId, ["\\Deleted"], { uid: true });
        await client.messageDelete(messageId, { uid: true });
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/delete", 500, error.message, "error");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },

  async toggleStar(accessToken: string, messageId: string, starred: boolean): Promise<void> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        if (starred) {
          await client.messageFlagsAdd(messageId, ["\\Flagged"], { uid: true });
        } else {
          await client.messageFlagsRemove(messageId, ["\\Flagged"], { uid: true });
        }
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "messages/flags", 500, error.message, "warning");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },

  async downloadAttachment(accessToken: string, messageId: string, attachmentId: string): Promise<{
    data: Buffer;
    contentType: string;
    filename: string;
  }> {
    const config = parseImapConfig(accessToken);
    const client = await createImapConnection(config);

    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        let source: Buffer | null = null;
        const uid = parseInt(messageId, 10);
        for await (const msg of client.fetch(String(uid), { source: true, uid: true }, { uid: true })) {
          source = msg.source as any;
        }

        if (!source) throw new Error("Message not found");

        const { simpleParser } = await import("mailparser");
        const parsed = await simpleParser(source);

        if (parsed.attachments) {
          for (const att of parsed.attachments) {
            const id = att.checksum || att.contentId || "";
            if (id === attachmentId) {
              return {
                data: att.content,
                contentType: att.contentType || "application/octet-stream",
                filename: att.filename || "attachment",
              };
            }
          }
        }

        throw new Error("Attachment not found");
      } finally {
        lock.release();
      }
    } catch (error: any) {
      await logApiHealth("imap", "attachments/get", 500, error.message, "error");
      throw error;
    } finally {
      await client.logout().catch(() => {});
    }
  },
};

export async function testImapConnection(config: ImapSmtpConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await createImapConnection(config);
    await client.logout();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to connect to IMAP server" };
  }
}

export async function testSmtpConnection(config: ImapSmtpConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = createSmtpTransport(config);
    await transport.verify();
    transport.close();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to connect to SMTP server" };
  }
}
