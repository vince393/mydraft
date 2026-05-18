import { Resend } from "resend";
import OpenAI from "openai";

const TO = process.env.TO_EMAIL || "markarabo122@gmail.com";
const COUNT = parseInt(process.env.COUNT || "10", 10);
const FROM_DOMAIN = "mydraft.io";

const resend = new Resend(process.env.RESEND_API_KEY!);
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL,
});

type Generated = {
  sender_name: string;
  sender_handle: string;
  subject: string;
  body_text: string;
  body_html: string;
};

const SCENARIOS = [
  "A founder of a YC-backed startup pitching a partnership opportunity",
  "A friend forwarding an interesting article about AI productivity",
  "A SaaS company sending a monthly invoice receipt",
  "A recruiter reaching out about a senior engineering role",
  "A conference organizer inviting you to give a keynote talk",
  "A bank sending a fraud alert about a suspicious transaction",
  "A college classmate suggesting catching up over coffee",
  "An open-source maintainer asking if you can review a pull request",
  "A nonprofit thanking you for a recent donation",
  "An airline notifying you that your flight has been rescheduled",
  "A real estate agent following up on a property viewing",
  "A book club coordinator sharing this month's pick",
];

async function generateEmail(scenario: string): Promise<Generated> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You generate realistic, varied test emails for an inbox demo. Respond with JSON only.",
      },
      {
        role: "user",
        content: `Write a realistic email matching this scenario: "${scenario}".

Return ONLY a JSON object with these fields:
- sender_name: a plausible full human name (or company name for automated)
- sender_handle: a lowercase email local-part to use, like "sarah.chen" or "notifications" (no @ symbol, no domain)
- subject: a natural email subject line (no "Re:" unless it fits)
- body_text: the plain-text body (2-5 short paragraphs, natural tone, signed off)
- body_html: the same body wrapped in simple HTML (<p> tags, optional <a> links). Dark-mode friendly, no inline styles needed.

Make it feel like a real email someone would receive. Vary tone and length.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw) as Generated;
  return parsed;
}

async function main() {
  console.log(`Generating and sending ${COUNT} emails to ${TO}...`);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < COUNT; i++) {
    const scenario = SCENARIOS[i % SCENARIOS.length];
    try {
      console.log(`\n[${i + 1}/${COUNT}] Generating: ${scenario}`);
      const email = await generateEmail(scenario);

      const safeHandle = email.sender_handle
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 40) || "noreply";
      const fromAddress = `${email.sender_name} <${safeHandle}@${FROM_DOMAIN}>`;

      console.log(`  From: ${fromAddress}`);
      console.log(`  Subject: ${email.subject}`);

      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: TO,
        subject: email.subject,
        html: email.body_html,
        text: email.body_text,
      });

      if (error) {
        console.error(`  ✗ Resend error:`, error);
        failed++;
      } else {
        console.log(`  ✓ Sent (id: ${data?.id})`);
        sent++;
      }

      // brief pause to be nice to APIs
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`  ✗ Failed:`, err);
      failed++;
    }
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
