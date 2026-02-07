export type EmailCategory = "primary" | "promotions" | "updates";

const PROMOTION_KEYWORDS = [
  "unsubscribe", "opt out", "opt-out", "promotional", "sale", "discount", 
  "offer", "deal", "coupon", "promo", "% off", "free shipping", "limited time",
  "shop now", "buy now", "order now", "special offer", "exclusive",
  "newsletter", "marketing", "advertisement"
];

const PROMOTION_SENDERS = [
  "noreply", "no-reply", "marketing", "promo", "deals", "offers", "shop",
  "store", "sales", "newsletter", "info@", "hello@", "news@"
];

const UPDATE_KEYWORDS = [
  "your order", "order confirmation", "shipping", "delivery", "tracking",
  "account", "password", "verify", "confirm", "notification", "alert",
  "receipt", "invoice", "payment", "subscription", "billing", "statement",
  "security", "update", "changed", "logged in", "signed in"
];

const UPDATE_SENDERS = [
  "notifications", "notification", "updates", "alert", "security",
  "support", "billing", "accounts", "service", "system"
];

interface CategorizableEmail {
  senderEmail?: string;
  subject?: string;
  preview?: string;
  body?: string;
}

export function categorizeEmail(email: CategorizableEmail): EmailCategory {
  const senderEmail = (email.senderEmail || "").toLowerCase();
  const subject = (email.subject || "").toLowerCase();
  const preview = (email.preview || "").toLowerCase();
  const body = (email.body || "").toLowerCase();
  const content = `${subject} ${preview} ${body}`;

  const senderLocal = senderEmail.split("@")[0] || "";

  if (PROMOTION_SENDERS.some(s => senderLocal.includes(s)) && 
      PROMOTION_KEYWORDS.some(k => content.includes(k))) {
    return "promotions";
  }
  if (PROMOTION_KEYWORDS.filter(k => content.includes(k)).length >= 2) {
    return "promotions";
  }

  if (UPDATE_SENDERS.some(s => senderLocal.includes(s))) {
    return "updates";
  }
  if (UPDATE_KEYWORDS.filter(k => content.includes(k)).length >= 2) {
    return "updates";
  }

  return "primary";
}

export function getCategoryCounts(emails: CategorizableEmail[]): Record<EmailCategory, number> {
  const counts: Record<EmailCategory, number> = { primary: 0, promotions: 0, updates: 0 };
  emails.forEach(email => {
    counts[categorizeEmail(email)]++;
  });
  return counts;
}

export function isCategoryFolder(folder: string): boolean {
  return folder === "category-promotions" || folder === "category-updates";
}

export function getCategoryFromFolder(folder: string): EmailCategory | null {
  if (folder === "category-promotions") return "promotions";
  if (folder === "category-updates") return "updates";
  return null;
}
