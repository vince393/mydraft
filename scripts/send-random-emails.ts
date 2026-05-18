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
  "A college friend you haven't talked to in two years suggesting catching up over dinner next week",
  "Your cousin asking if you can come to their kid's birthday party on Saturday",
  "A neighbor letting you know they found your missing package on their porch",
  "Your mom forwarding a long article she thought you'd like, with her usual short note on top",
  "An old coworker reaching out because they're hiring at a new company and thought of you",
  "Someone you met at a conference last month following up about a project idea",
  "A friend asking for honest feedback on a personal essay they wrote",
  "Your sibling complaining about family drama and asking for your take",
  "A friend inviting you to be a groomsman/bridesmaid in their wedding next spring",
  "Someone from your gym asking if you want to do a 10k together in the fall",
  "A mentor checking in to see how a recent career decision is going",
  "An ex-roommate asking if you still have a box of their stuff",
  "A friend sharing exciting news that they just got engaged",
  "A book club friend recommending three books they loved this month",
  "Someone you went on one date with three weeks ago asking if you want to grab a drink again",
  "A friend asking to borrow your truck/SUV to move apartments this weekend",
  "Your dad sharing a long story about a home repair project gone wrong",
  "A friend asking if you can pick them up from the airport on Friday night",
  "Someone you used to coach/teach reaching out years later to say thanks",
  "A friend asking for restaurant recommendations because they're visiting your city",
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
        content: `Write a realistic personal email matching this scenario: "${scenario}".

STRICT RULES:
- NO brand names, NO companies, NO products, NO services. Person-to-person only.
- The sender is always a real human writing personally — not a notification, not a marketing email.
- Use a plausible first + last human name. No company names anywhere.
- No links to any branded site.

Return ONLY a JSON object with these fields:
- sender_name: a plausible full human name
- sender_handle: a lowercase email local-part like "sarah.chen" or "mike.t" (no @, no domain, no company)
- subject: a natural, casual email subject line
- body_text: the plain-text body (2-5 short paragraphs, natural conversational tone, signed off with just a first name)
- body_html: the same body wrapped in simple <p> tags. No styling, no links.

Vary tone, length, and warmth. Make it feel like a real email from a real friend or family member.`,
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
