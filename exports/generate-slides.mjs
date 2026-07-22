import pptxgen from "pptxgenjs";

const BG = "0B0F1A";
const CARD = "141B2E";
const BLUE = "3B82F6";
const LIGHT = "E5EAF5";
const MUTED = "94A3B8";
const GREEN = "34D399";
const AMBER = "FBBF24";
const RED = "F87171";

const p = new pptxgen();
p.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
p.layout = "WIDE";

function base(slide) {
  slide.background = { color: BG };
}
function title(slide, text, sub) {
  slide.addText(text, { x: 0.6, y: 0.35, w: 12.1, h: 0.7, fontSize: 28, bold: true, color: LIGHT, fontFace: "Arial" });
  if (sub) slide.addText(sub, { x: 0.6, y: 1.0, w: 12.1, h: 0.4, fontSize: 14, color: BLUE, fontFace: "Arial" });
}
function bullets(slide, items, opts = {}) {
  slide.addText(items.map(t => ({ text: t.text, options: { bullet: t.sub ? { indent: 12 } : { code: "2022" }, indentLevel: t.sub ? 1 : 0, color: t.color || (t.sub ? MUTED : LIGHT), fontSize: t.size || (t.sub ? 12.5 : 14.5), bold: !!t.bold, breakLine: true, paraSpaceAfter: t.gap ?? 6 } })), { x: opts.x ?? 0.7, y: opts.y ?? 1.6, w: opts.w ?? 12.0, h: opts.h ?? 5.4, fontFace: "Arial", valign: "top" });
}
function card(slide, x, y, w, h, heading, lines, hColor = BLUE) {
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.08, fill: { color: CARD }, line: { color: "1F2A44", width: 1 } });
  slide.addText(heading, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.4, fontSize: 14, bold: true, color: hColor, fontFace: "Arial" });
  slide.addText(lines.map(t => ({ text: t, options: { fontSize: 11.5, color: LIGHT, breakLine: true, paraSpaceAfter: 4 } })), { x: x + 0.15, y: y + 0.55, w: w - 0.3, h: h - 0.7, fontFace: "Arial", valign: "top" });
}

// ---------- Slide 1: Cover ----------
let s = p.addSlide(); base(s);
s.addText("MyDraft: First 1,000 Customers", { x: 0.8, y: 2.3, w: 11.7, h: 1.0, fontSize: 40, bold: true, color: LIGHT, fontFace: "Arial" });
s.addText("A research-backed acquisition plan on a limited budget", { x: 0.8, y: 3.4, w: 11.7, h: 0.5, fontSize: 20, color: BLUE, fontFace: "Arial" });
s.addText("Built from documented playbooks of Superhuman, Hey.com, Missive, Boomerang, SaneBox and 2025–26 channel benchmarks  •  July 2026", { x: 0.8, y: 4.1, w: 11.7, h: 0.6, fontSize: 13, color: MUTED, fontFace: "Arial" });

// ---------- Slide 2: Honest framing ----------
s = p.addSlide(); base(s);
title(s, "First, the honest truth", "No plan is \u201c100% guaranteed\u201d — but the odds can be stacked heavily in your favor");
bullets(s, [
  { text: "Nothing in marketing is guaranteed — anyone promising that is selling you something.", bold: true },
  { text: "What IS proven: the specific playbooks that took email apps from 0 to thousands of users, and the current cost benchmarks for every channel.", },
  { text: "This plan stacks the highest-probability, lowest-cost moves in the right order, with numbers behind each one.", },
  { text: "Key insight from the research: at your prices ($2.99\u2013$19.99/mo), typical B2B SaaS paid-ads math is fatal (CAC of $200\u2013$800 per customer).", color: AMBER },
  { text: "Winners at your price point grew through: word of mouth, communities, SEO comparison pages, referrals, and PR moments — not big ad budgets.", color: GREEN },
]);

// ---------- Slide 3: What we can learn from lookalikes ----------
s = p.addSlide(); base(s);
title(s, "How email apps like yours actually got their first users");
card(s, 0.6, 1.5, 4.0, 2.7, "Superhuman ($30/mo)", [
  "Founder personally onboarded first 200 users in 1:1 calls",
  "Ran the \u201cvery disappointed\u201d survey to sharpen the product (22% \u2192 58%)",
  "Waitlist + weekly invite batches created exclusivity",
]);
card(s, 4.7, 1.5, 4.0, 2.7, "Boomerang (free+paid)", [
  "55 hand-picked beta users \u2192 70,000 downloads in 30 days",
  "PR via Twitter DMs to journalists who covered similar tools",
  "Invite-code scarcity + a product video; Lifehacker alone sent 15k visits",
]);
card(s, 8.8, 1.5, 4.0, 2.7, "Missive ($1M ARR, $0 ads)", [
  "\u201cNever spent a dime on marketing\u201d",
  "Honest competitor-comparison pages for SEO",
  "Cold-emailed people they admired for feedback",
  "Affiliate program became the biggest growth lever",
]);
card(s, 0.6, 4.4, 4.0, 2.5, "Hey.com", [
  "Invite-only launch; famous people first, who nominated others",
  "The Apple App Store fight became free PR rocket fuel",
  "Lesson: a story journalists want to tell beats an ad budget",
], AMBER);
card(s, 4.7, 4.4, 4.0, 2.5, "SaneBox (bootstrapped)", [
  "Zero-friction setup (works with any inbox — like yours)",
  "Editorial endorsements (PCMag) + professional word of mouth",
  "Never relied on paid acquisition",
], AMBER);
card(s, 8.8, 4.4, 4.0, 2.5, "The pattern", [
  "1. Nail a small group of delighted users first",
  "2. Engineer word of mouth (referrals, invites, comparisons)",
  "3. Earn one or two PR/launch spikes",
  "4. Paid ads come LAST, once the funnel converts",
], GREEN);

// ---------- Slide 4: Your unfair advantages ----------
s = p.addSlide(); base(s);
title(s, "MyDraft's unfair advantages", "What you already have that most competitors at this stage don't");
bullets(s, [
  { text: "A real product that's live, published, and taking payments — most \u201cAI email\u201d tools are waitlists.", bold: true },
  { text: "A free plan + 14-day Pro trial: both entry doors already built.", },
  { text: "Multilingual angle: translation, tone and culture-aware replies — a niche most competitors (Superhuman, Shortwave) ignore. This is your wedge.", color: GREEN, bold: true },
  { text: "Works with Gmail, Outlook, and any IMAP inbox — zero-switching-cost, like SaneBox's winning zero-friction setup.", },
  { text: "Built-in referral system (25 credits per friend) — the machinery for word of mouth already exists.", },
  { text: "Price point ($2.99+) is an impulse buy vs. Superhuman at $30/mo — \u201cSuperhuman results at 1/10 the price\u201d is a real message.", },
]);

// ---------- Slide 5: The strategy in one picture ----------
s = p.addSlide(); base(s);
title(s, "The plan: 4 phases to 1,000 customers");
const ph = [
  ["Phase 1 (Mo 1\u20132)", "Foundation: first 50", "Concierge onboarding, communities, feedback loop. Budget: ~$50/mo", BLUE],
  ["Phase 2 (Mo 2\u20134)", "Launch spikes: to 200", "Product Hunt + directories + Reddit + PR outreach. Budget: ~$100/mo", GREEN],
  ["Phase 3 (Mo 3\u20138)", "Compounding: to 500", "SEO comparison pages, short-form video, referral push. Budget: ~$150/mo", AMBER],
  ["Phase 4 (Mo 6\u201312)", "Scale what works: to 1,000", "Small paid tests ONLY on proven funnel + affiliates. Budget: ~$300/mo", RED],
];
ph.forEach((x, i) => {
  const px = 0.6 + i * 3.12;
  s.addShape("roundRect", { x: px, y: 1.7, w: 2.95, h: 3.6, rectRadius: 0.08, fill: { color: CARD }, line: { color: x[3], width: 1.5 } });
  s.addText(x[0], { x: px + 0.12, y: 1.85, w: 2.7, h: 0.35, fontSize: 12, bold: true, color: x[3], fontFace: "Arial" });
  s.addText(x[1], { x: px + 0.12, y: 2.25, w: 2.7, h: 0.65, fontSize: 15, bold: true, color: LIGHT, fontFace: "Arial" });
  s.addText(x[2], { x: px + 0.12, y: 3.0, w: 2.7, h: 2.1, fontSize: 11.5, color: MUTED, fontFace: "Arial" });
});
s.addText("Total cash spend to 1,000 customers: roughly $1,500\u2013$2,500 over 9\u201312 months. The main investment is your time.", { x: 0.6, y: 5.6, w: 12.1, h: 0.5, fontSize: 14, bold: true, color: GREEN, fontFace: "Arial" });

// ---------- Slide 6: Phase 1 ----------
s = p.addSlide(); base(s);
title(s, "Phase 1 — Foundation: your first 50 customers (Months 1\u20132)", "Copy Superhuman + Boomerang: hand-pick, onboard personally, listen hard");
bullets(s, [
  { text: "Recruit 50\u2013100 hand-picked users from your own network + targeted communities (see next slide). Personally onboard each one — a 15-min video call or a personal email.", bold: true },
  { text: "Superhuman's founder did this for his first 200 users; Boomerang's 55 hand-cultivated beta users made their 70k-download launch possible.", sub: true },
  { text: "Run the \u201cvery disappointed\u201d survey after 2 weeks: \u201cHow would you feel if you could no longer use MyDraft?\u201d Target: 40%+ say \u201cvery disappointed.\u201d" },
  { text: "Below 40%? Fix what the \u201csomewhat disappointed\u201d group asks for before spending anything on growth.", sub: true },
  { text: "Focus your pitch on ONE wedge: \u201cThe AI email app for people who work across languages\u201d — translation + tone + summaries. Own a niche before going broad." },
  { text: "Ask every happy user for 3 things: a testimonial, a referral (they have 25-credit rewards), and where they hang out online." },
  { text: "Budget: ~$50/mo (small thank-you credits, a coffee gift card for calls). Goal: 50 paying + a repeatable pitch that converts." , color: GREEN },
]);

// ---------- Slide 7: Where to find them ----------
s = p.addSlide(); base(s);
title(s, "Where your first users are hiding (all free to reach)");
card(s, 0.6, 1.5, 6.0, 2.6, "Reddit (highest intent, proven)", [
  "Reddit shows up in 97.5% of Google \u201cbest X\u201d product searches — posts rank for years",
  "Documented wins: founders getting first 10\u201347 customers from Reddit alone, zero ad spend",
  "Target: r/productivity, r/gmail, r/Outlook, r/smallbusiness, r/freelance, r/digitalnomad, language-learning and expat subs",
  "Rule: be a helpful member first; share MyDraft when genuinely relevant. Never spam.",
]);
card(s, 6.9, 1.5, 5.9, 2.6, "Niche communities for your wedge", [
  "Expat / immigrant professional groups (Facebook, Slack, Discord)",
  "Freelancer communities: Upwork forums, r/freelance, Indie Hackers",
  "Customer-support and VA communities (they answer email all day)",
  "Non-native-English professionals on LinkedIn — your translation + tone features solve a daily pain",
]);
card(s, 0.6, 4.3, 6.0, 2.5, "Cold outreach (Missive's move)", [
  "Missive cold-emailed people they admired; it worked because they asked for feedback, not money",
  "Send 5/day: \u201cI built an AI email tool for multilingual work — would you try it and tell me what's broken? Free Pro on me.\u201d",
  "150/month \u2192 expect 15\u201330 replies, 10+ real users, priceless feedback",
]);
card(s, 6.9, 4.3, 5.9, 2.5, "Your own inbox lists", [
  "Everyone you've ever emailed about the product",
  "LinkedIn 1st-degree connections in target roles",
  "Existing free users who haven't upgraded — personally ask what's missing",
]);

// ---------- Slide 8: Phase 2 ----------
s = p.addSlide(); base(s);
title(s, "Phase 2 — Launch spikes: 50 \u2192 200 (Months 2\u20134)", "One coordinated month of launches, timed AFTER the product survey passes 40%");
bullets(s, [
  { text: "Product Hunt — do it, but with realistic expectations:", bold: true },
  { text: "Only ~10% of launches get featured now; featured status drives ~70% of outcomes. Rally your first 50 users + network for launch day (60% of traffic is in the first 24h).", sub: true },
  { text: "A Top-10 finish = 1,000\u20133,000 visitors, 30\u2013100 signups. Treat it as a credibility badge + backlink, not a customer firehose.", sub: true },
  { text: "AI directories — cheap, compounding listings:", bold: true },
  { text: "There's An AI For That (~1\u20133M visits/mo), Toolify (~520k), Futurepedia (~485k, paid listing guarantees 1,000+ clicks), Future Tools, Aixploria. List on ALL free ones; test one paid listing (~$100\u2013$300).", sub: true },
  { text: "Show HN (Hacker News) — free lottery ticket with a real prize: a strong post brings 10k\u201330k visitors and ranks on Google for years. Angle: the tech story (how you built AI threading/translation).", },
  { text: "PR the Boomerang way: DM 15\u201320 journalists/newsletter writers who covered email or AI tools in the last 6 months. Pitch the story, not the product: \u201cAI email is a luxury at $30/mo. I built it for $2.99.\u201d", },
  { text: "Goal: 2\u20134 traffic spikes, 3,000+ visitors, ~150 new paying customers cumulative. Budget: ~$100/mo.", color: GREEN },
]);

// ---------- Slide 9: Phase 3 ----------
s = p.addSlide(); base(s);
title(s, "Phase 3 — Compounding channels: 200 \u2192 500 (Months 3\u20138)", "The channels that keep paying after you stop pushing");
bullets(s, [
  { text: "SEO comparison pages (Missive's proven play — their #1 organic channel):", bold: true },
  { text: "\u201cMyDraft vs Superhuman\u201d, \u201cSuperhuman alternatives under $10\u201d, \u201cbest AI email assistant for non-native English speakers\u201d, \u201cAI email translator\u201d, \u201chow to write professional emails in English\u201d.", sub: true },
  { text: "Benchmark: a programmatic SEO push took a small SaaS from 67 \u2192 2,100 signups/month in 10 months. Write 2 pages/week; they compound for years.", sub: true },
  { text: "Short-form video (TikTok / Reels / Shorts) — the highest-ROI format per HubSpot 2026:", bold: true },
  { text: "Formula that works for apps: problem-first hooks (\u201cPOV: 47 unread emails in a language you barely speak\u201d) + 15-second demos. 2\u20133 posts/week; expect first traction in 30\u201345 days.", sub: true },
  { text: "Referral push: your 25-credit two-sided referral is built. Now surface it — after every 5th AI reply, in the welcome email, on the credits page. SaaS benchmarks: 10\u201315% of active users will participate; referred users retain ~37% better.", },
  { text: "One newsletter test: a $50\u2013$250 slot in a small productivity/expat newsletter (under 5k subs). Measure signups; repeat only if cost per customer < $10.", },
  { text: "Goal: 300 new customers over 6 months, majority from search + referrals. Budget: ~$150/mo.", color: GREEN },
]);

// ---------- Slide 10: Phase 4 ----------
s = p.addSlide(); base(s);
title(s, "Phase 4 — Scale what works: 500 \u2192 1,000 (Months 6\u201312)", "Only now does paid advertising make sense — small, and only on proof");
bullets(s, [
  { text: "Why ads waited: Meta needs ~50 conversions/week per ad set to optimize properly. On $10\u2013$20/day you can't buy that with cold traffic — but you CAN retarget warm traffic cheaply.", bold: true },
  { text: "Meta retargeting only: visitors + free users who didn't upgrade. Your Meta Pixel with Purchase/StartTrial events is already installed and firing. $10\u201315/day.", },
  { text: "Meta CPC ~$0.70\u2013$0.78 vs Google search $5\u201315 for software keywords — Meta wins at your budget.", sub: true },
  { text: "Launch an affiliate program (Missive's biggest growth lever): 30% recurring commission to productivity YouTubers, newsletter writers, and expat bloggers. You pay only for results.", },
  { text: "Double down on whichever Phase 3 channel produced the cheapest customers — more comparison pages, more video, or more newsletters. Kill the rest.", },
  { text: "Consider a reverse-trial test: benchmarks show no-card trials convert ~9\u201315%, card-required ~31\u201350% (at lower volume). Test on 50% of traffic once volume allows.", },
  { text: "Goal: 500 new customers in 6 months. Budget: ~$300/mo, every dollar against a measured cost-per-customer.", color: GREEN },
]);

// ---------- Slide 11: What NOT to do ----------
s = p.addSlide(); base(s);
title(s, "What NOT to do (money-savers)", "Each of these is a documented trap for products priced like yours");
bullets(s, [
  { text: "\u274c Broad cold Meta/Google ads now. B2B SaaS CAC benchmarks run $230\u2013$800 per customer — you'd pay 10\u201320 years of subscription value per signup.", color: RED },
  { text: "\u274c AppSumo lifetime deals. Average deal nets founders ~$1,775 at 84% discount, you support those users forever, and ~40% of LTD products die within 3 years. Wrong fit for a $2.99\u2013$19.99 subscription.", color: RED },
  { text: "\u274c Chasing #1 on Product Hunt. Documented case: #1 Product of the Day with 612 upvotes \u2192 exactly 1 paying customer. Rank doesn't correlate with revenue anymore.", color: RED },
  { text: "\u274c Paying influencers upfront. Use revenue-share affiliates instead — you pay only when a customer pays.", color: RED },
  { text: "\u274c Building more features as a growth strategy. Between 50\u2013500 customers, distribution is the bottleneck, not the product.", color: RED },
  { text: "\u274c Spreading across every channel at once. Each phase has 2\u20133 focus channels. Depth beats breadth on a small budget.", color: RED },
]);

// ---------- Slide 12: The math ----------
s = p.addSlide(); base(s);
title(s, "The math to 1,000 customers", "Conservative funnel using researched benchmarks");
const rows = [
  [{ text: "Source", options: { bold: true, color: BLUE } }, { text: "Visitors", options: { bold: true, color: BLUE } }, { text: "Signups (2\u20134%)", options: { bold: true, color: BLUE } }, { text: "Paying (10\u201315% of signups)", options: { bold: true, color: BLUE } }],
  ["Phase 1: personal network + concierge", "\u2014", "150 direct", "50"],
  ["Phase 2: PH + directories + HN + PR spikes", "8,000\u201315,000", "250\u2013500", "~100"],
  ["Phase 3: SEO + video + communities (compounding)", "30,000\u201360,000", "900\u20132,000", "~250"],
  ["Phase 4: retargeting + affiliates + best channel", "40,000\u201370,000", "1,300\u20132,500", "~400"],
  ["Referrals throughout (10\u201315% participation)", "\u2014", "\u2014", "~200"],
  [{ text: "Total", options: { bold: true, color: GREEN } }, { text: "~80k\u2013145k", options: { bold: true, color: GREEN } }, { text: "~2,600\u20135,100", options: { bold: true, color: GREEN } }, { text: "~1,000", options: { bold: true, color: GREEN } }],
];
s.addTable(rows.map(r => r.map(c => typeof c === "string" ? { text: c, options: { color: LIGHT } } : c)), {
  x: 0.6, y: 1.6, w: 12.1, colW: [4.6, 2.3, 2.5, 2.7], fontSize: 12.5, fontFace: "Arial",
  fill: { color: CARD }, border: { type: "solid", color: "1F2A44", pt: 1 }, rowH: 0.45,
});
s.addText("Trial\u2192paid benchmark for no-card trials: ~9\u201315%. Free\u2192paid freemium: ~3\u20135%. The blend above assumes you keep improving onboarding as you learn.", { x: 0.6, y: 5.6, w: 12.1, h: 0.6, fontSize: 12, color: MUTED, fontFace: "Arial" });
s.addText("At an average ~$8/mo per customer, 1,000 customers \u2248 $8,000 MRR \u2248 $96k/year run-rate.", { x: 0.6, y: 6.3, w: 12.1, h: 0.5, fontSize: 15, bold: true, color: GREEN, fontFace: "Arial" });

// ---------- Slide 13: Weekly rhythm ----------
s = p.addSlide(); base(s);
title(s, "Your weekly rhythm (\u224810 hours/week)");
card(s, 0.6, 1.5, 6.0, 2.6, "Every week", [
  "Mon: 1 SEO comparison/how-to page (2h)",
  "Tue: 5 cold outreach emails + community replies (1h)",
  "Wed: 1\u20132 short-form videos (2h)",
  "Thu: personally onboard/check in with new users (2h)",
  "Fri: check numbers — signups, trial\u2192paid, cost per customer (1h)",
]);
card(s, 6.9, 1.5, 5.9, 2.6, "Every month", [
  "Ship ONE growth experiment (newsletter slot, new directory, new subreddit)",
  "Email your list: what's new + one useful email tip",
  "Ask 5 happiest users for testimonials/referrals",
  "Kill the worst-performing activity; double the best",
]);
card(s, 0.6, 4.3, 12.2, 2.3, "The one metric that matters at each stage", [
  "0\u201350 customers: % of users who'd be \u201cvery disappointed\u201d without MyDraft (target 40%+)",
  "50\u2013500: cost per paying customer by channel (target: under 3 months of subscription value, ~$25)",
  "500\u20131,000: monthly churn (target: under 5% — at your price, retention IS the growth strategy)",
], GREEN);

// ---------- Slide 14: 30-day quick start ----------
s = p.addSlide(); base(s);
title(s, "Your first 30 days — start here");
bullets(s, [
  { text: "Week 1: List 100 people/places to reach (network, subreddits, communities). Write your one-line wedge pitch. Set up a simple tracking sheet: source \u2192 signup \u2192 paid.", bold: true },
  { text: "Week 2: Personally invite 25 people (free Pro month). Onboard each one. Join 5 communities and start being helpful — no pitching yet.", bold: true },
  { text: "Week 3: Invite 25 more. Publish your first 2 comparison pages. Submit MyDraft to every free AI directory (there are 10+).", bold: true },
  { text: "Week 4: Run the \u201cvery disappointed\u201d survey on everyone. Post your first 2 short videos. Draft your Product Hunt launch plan for Month 2\u20133.", bold: true },
  { text: "Spend this month: under $100. Outcome: 15\u201325 paying customers, a validated pitch, and a launch runway.", color: GREEN, bold: true },
]);

// ---------- Slide 15: Sources ----------
s = p.addSlide(); base(s);
title(s, "Key sources behind this plan");
bullets(s, [
  { text: "Superhuman PMF engine & concierge onboarding — First Round Review (review.firstround.com)", size: 12 },
  { text: "Boomerang: 55 beta users \u2192 70k downloads in 30 days — Boomerang blog launch retrospective", size: 12 },
  { text: "Missive: $1M ARR with zero ad spend; comparison-page SEO + affiliates — missiveapp.com blog", size: 12 },
  { text: "Hey.com launch mechanics — TechCrunch, June 2020", size: 12 },
  { text: "Product Hunt 2024\u201326 reality (10% featured, rank \u2260 revenue) — founder surveys via MySignature.io", size: 12 },
  { text: "AppSumo deal economics (770+ deal analysis, avg $1,775 to founder) — third-party analyses", size: 12 },
  { text: "AI directory traffic — SEMrush/SimilarWeb estimates 2025 (TAAFT, Toolify, Futurepedia)", size: 12 },
  { text: "Ads benchmarks — WordStream/LocaliQ 2025\u201326 (16,446 campaigns); Meta CPC/CPM agency aggregates", size: 12 },
  { text: "Trial & freemium conversion — ChartMogul 2026 study, OpenView, ProfitWell/Price Intelligently", size: 12 },
  { text: "Referral benchmarks & Dropbox case — Influitive, SaaSquatch, ReferralCandy", size: 12 },
  { text: "SEO case (67 \u2192 2,100 signups/mo in 10 months) — Omnius programmatic SEO case study, Apr 2025", size: 12 },
  { text: "Short-form video ROI — HubSpot 2026 State of Marketing", size: 12 },
  { text: "Note: several channel benchmarks are directional aggregates — treat every number as a starting hypothesis and let your own tracking sheet be the final judge.", color: MUTED, size: 11 },
], { y: 1.4, h: 5.8 });

await p.writeFile({ fileName: "exports/mydraft-first-1000-customers.pptx" });
console.log("written");
