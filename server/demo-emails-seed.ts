import { db } from "./db";
import { cachedEmails } from "@shared/schema";
import { eq } from "drizzle-orm";

export const DEMO_EMAIL_ACCOUNTS = new Set<string>([
  "markarabo122@gmail.com",
]);

export function isDemoEmailAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_EMAIL_ACCOUNTS.has(email.toLowerCase());
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

const SAMPLE_EMAILS = [
  {
    sender: "Sarah Chen",
    senderEmail: "sarah.chen@stripe.com",
    subject: "Re: Q1 partnership proposal",
    preview: "Hey — thanks for sending this over. Reviewed it with the team this morning and we're aligned on moving forward. Quick question on pricing tier 2...",
    body: "Hey,\n\nThanks for sending this over. Reviewed it with the team this morning and we're aligned on moving forward.\n\nQuick question on pricing tier 2 — can we structure that as quarterly billing instead of annual? Makes the procurement side a lot smoother on our end.\n\nLet me know your thoughts and I'll loop in legal once we settle on terms.\n\nBest,\nSarah",
  },
  {
    sender: "GitHub",
    senderEmail: "notifications@github.com",
    subject: "[mydraft/app] Pull request #284 ready for review",
    preview: "vincentarabo opened pull request #284: feat: add real-time email sync via WebSocket. 12 files changed, +487 −23. Review requested from @markarabo122.",
    body: "vincentarabo opened pull request #284:\n\nfeat: add real-time email sync via WebSocket\n\n12 files changed, +487 −23\nReview requested from @markarabo122\n\nView on GitHub →",
  },
  {
    sender: "Apple Developer",
    senderEmail: "no_reply@email.apple.com",
    subject: "Your app is ready for distribution",
    preview: "Congratulations — MyDraft (version 2.4.0) has been approved for the App Store. Your app will be live within 24 hours.",
    body: "Congratulations,\n\nMyDraft (version 2.4.0) has been approved for the App Store. Your app will be live within 24 hours.\n\nView in App Store Connect →",
  },
  {
    sender: "Linear",
    senderEmail: "notifications@linear.app",
    subject: "5 issues assigned to you this week",
    preview: "You have 5 new issues in the MyDraft project. Top priority: MOB-142 — Fix WebSocket reconnection on iOS background resume.",
    body: "You have 5 new issues in the MyDraft project.\n\n• MOB-142 — Fix WebSocket reconnection on iOS background resume (P1)\n• API-088 — Add /api/emails/:id/move custom folder support (P2)\n• WEB-201 — Sidebar unread count desync after archive (P2)\n• MOB-145 — Update compose button to circular FAB (P3)\n• API-091 — Increase JWT refresh token TTL to 30d (P3)\n\nOpen in Linear →",
  },
  {
    sender: "Stripe",
    senderEmail: "support@stripe.com",
    subject: "Payment received: $290.00 from CCHS Foundation",
    preview: "You've received a payment of $290.00 USD. It will be available in your account on Mar 17. Customer: CCHS Foundation. Invoice #INV-00284.",
    body: "You've received a payment.\n\nAmount: $290.00 USD\nCustomer: CCHS Foundation\nInvoice: #INV-00284\nAvailable: Mar 17, 2026\n\nView in Stripe Dashboard →",
  },
  {
    sender: "Danielle Carreon",
    senderEmail: "danielle@sdyc.org",
    subject: "SDYC Membership Application Inquiry",
    preview: "Hi Mark — following up on the application you submitted last week. Everything looks great on our end. I just need one more reference letter to wrap things up...",
    body: "Hi Mark,\n\nFollowing up on the application you submitted last week. Everything looks great on our end. I just need one more reference letter to wrap things up.\n\nIf you could have someone send it directly to membership@sdyc.org by Friday, we can have your card ready by the end of the month.\n\nThanks!\nDanielle",
  },
  {
    sender: "Notion",
    senderEmail: "team@notion.so",
    subject: "Your weekly workspace digest",
    preview: "This week in MyDraft HQ: 14 pages edited, 3 new documents, 8 comments. Most active page: \"Q1 Roadmap — Mobile App\".",
    body: "This week in MyDraft HQ:\n\n• 14 pages edited\n• 3 new documents\n• 8 comments\n\nMost active page: \"Q1 Roadmap — Mobile App\"\n\nOpen Notion →",
  },
  {
    sender: "Microsoft Partner Center",
    senderEmail: "no-reply@microsoft.com",
    subject: "We've verified your profile",
    preview: "Your Microsoft Partner Center profile has been verified. You now have access to partner benefits, training, and co-selling opportunities.",
    body: "Hello Mark,\n\nYour Microsoft Partner Center profile has been verified. You now have access to partner benefits, training, and co-selling opportunities.\n\nStart exploring Partner Center →",
  },
  {
    sender: "Vercel",
    senderEmail: "noreply@vercel.com",
    subject: "Production deployment succeeded",
    preview: "mydraft-web → main · Deployed by vincentarabo · 1m 24s build time. View deployment at mydraft.io.",
    body: "Production deployment succeeded.\n\nProject: mydraft-web\nBranch: main\nDeployed by: vincentarabo\nBuild time: 1m 24s\n\nView deployment at mydraft.io →",
  },
  {
    sender: "Mark Arabo",
    senderEmail: "mark@arabo.foundation",
    subject: "Fwd: Fairbanks Ranch Spring Fling is here!",
    preview: "Forwarding — thought you'd want to see this. The spring fling is back this year, looks like they're expecting a bigger turnout. Let me know if you can make it.",
    body: "Forwarding — thought you'd want to see this. The spring fling is back this year, looks like they're expecting a bigger turnout.\n\nLet me know if you can make it.\n\n— Mark",
  },
  {
    sender: "Replit",
    senderEmail: "noreply@replit.com",
    subject: "Your Replit Core monthly summary",
    preview: "In March you used 142 hours of Compute, generated 1,284 AI completions, and shipped 7 deployments. Thanks for building with us.",
    body: "Your monthly summary is ready.\n\n• 142 hours of Compute\n• 1,284 AI completions\n• 7 deployments shipped\n\nThanks for building with us.\n\nView usage details →",
  },
  {
    sender: "Zhik Sailing",
    senderEmail: "newsletter@zhik.com",
    subject: "Surge X: The first waterproof race shoe",
    preview: "A waterproof, lightweight, industry-first race shoe built for the conditions you actually sail in. Pre-order now and save 15%.",
    body: "Introducing the Surge X.\n\nA waterproof, lightweight, industry-first race shoe built for the conditions you actually sail in.\n\nPre-order now and save 15%.\n\nShop now →",
  },
  {
    sender: "Calendly",
    senderEmail: "no-reply@calendly.com",
    subject: "New meeting: Onboarding call with Emily Park — Fri 10:00 AM",
    preview: "Emily Park has scheduled a 30-minute onboarding call with you for Friday at 10:00 AM PST. Zoom link will be sent 15 minutes before the call.",
    body: "Emily Park has scheduled a meeting with you.\n\nTitle: Onboarding call\nWhen: Friday, 10:00 AM PST (30 min)\nWhere: Zoom (link sent 15 min before)\n\nReschedule or cancel →",
  },
  {
    sender: "Shopify Billing",
    senderEmail: "billing@shopify.com",
    subject: "Mar 12, 2026 bill for Pupcalm DK",
    preview: "Pupcalm DK — March 12, 2026. You've been charged $170.97 USD for your monthly plan. Payment was taken from your PayPal account on file.",
    body: "Pupcalm DK\nMarch 12, 2026\n\nYou've been charged for your bill.\n\n$170.97 USD has been taken from your PayPal account.\n\nView bill →",
  },
  {
    sender: "Figma",
    senderEmail: "no-reply@figma.com",
    subject: "Emily commented on \"MyDraft — Mobile Inbox v3\"",
    preview: "Emily: \"Love the new compose FAB! Quick question — should we make the AI button glow when there's a new suggestion?\"",
    body: "Emily commented on \"MyDraft — Mobile Inbox v3\":\n\n\"Love the new compose FAB! Quick question — should we make the AI button glow when there's a new suggestion?\"\n\nReply in Figma →",
  },
];

export async function ensureDemoEmailsForUser(userIdNum: number): Promise<void> {
  const existing = await db
    .select({ id: cachedEmails.id })
    .from(cachedEmails)
    .where(eq(cachedEmails.userId, userIdNum))
    .limit(1);
  if (existing.length > 0) return;

  const now = Date.now();
  const rows = SAMPLE_EMAILS.map((s, i) => {
    const receivedAt = new Date(now - i * 1000 * 60 * 60 * (3 + (i % 5)));
    return {
      nylasId: `demo-${userIdNum}-${i + 1}`,
      userId: userIdNum,
      sender: s.sender,
      senderEmail: s.senderEmail,
      subject: s.subject,
      preview: s.preview,
      body: s.body,
      receivedAt,
      isRead: i > 4,
      folder: "inbox",
      threadId: `demo-thread-${userIdNum}-${i + 1}`,
      avatarColor: COLORS[i % COLORS.length],
    };
  });

  await db.insert(cachedEmails).values(rows);
}
