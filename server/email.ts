import { Resend } from 'resend';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

const TOKEN_SECRET = process.env.SESSION_SECRET || 'fallback-testimonial-secret';

export function generateTestimonialToken(userId: string): string {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `${userId}:${expires}`;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyTestimonialToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [userId, expiresStr, sig] = parts;
    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${userId}:${expiresStr}`).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return { userId };
  } catch { return null; }
}

const FROM_EMAIL = 'MyDraft <support@mydraft.io>';

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>MyDraft</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    td { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin:0; padding:0; width:100%; background-color:#0a0a0f; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px; margin:0 auto;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:20px; font-weight:700; color:#f0f0f5; letter-spacing:-0.5px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">MyDraft</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#141419; border:1px solid rgba(255,255,255,0.06); border-radius:16px; padding:36px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0; font-size:12px; color:#52525b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; line-height:1.5;">
                &copy; ${new Date().getFullYear()} MyDraft &middot; AI-powered email
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendSecurityContactEmail(
  to: string,
  data: { name: string; email: string; message: string; subject: string }
): Promise<boolean> {
  try {
    const esc = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const content = `
      <p style="margin:0 0 20px; font-size:15px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Security Contact Submission
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td style="color:#71717a; padding:6px 0; font-size:13px; vertical-align:top; width:70px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">From</td>
          <td style="color:#d4d4d8; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${esc(data.name)}</td>
        </tr>
        <tr>
          <td style="color:#71717a; padding:6px 0; font-size:13px; vertical-align:top; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Email</td>
          <td style="color:#d4d4d8; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <a href="mailto:${esc(data.email)}" style="color:#3b82f6; text-decoration:none;">${esc(data.email)}</a>
          </td>
        </tr>
        <tr>
          <td style="color:#71717a; padding:6px 0; font-size:13px; vertical-align:top; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Subject</td>
          <td style="color:#d4d4d8; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${esc(data.subject)}</td>
        </tr>
      </table>
      <div style="background-color:#0a0a0f; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:16px 18px;">
        <p style="margin:0 0 6px; font-size:10px; color:#52525b; text-transform:uppercase; letter-spacing:1px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Message</p>
        <p style="margin:0; color:#d4d4d8; font-size:13px; line-height:1.7; white-space:pre-wrap; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${esc(data.message)}</p>
      </div>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      replyTo: data.email,
      subject: `[MyDraft Security] ${data.subject}`,
      html: emailWrapper(content),
      text: `Security Contact from ${data.name} (${data.email})\nSubject: ${data.subject}\n\n${data.message}`,
    });

    if (error) {
      console.error('Failed to send security contact email:', error);
      return false;
    }

    console.log(`Security contact email forwarded from ${data.email}`);
    return true;
  } catch (error) {
    console.error('Error sending security contact email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  try {
    const content = `
      <p style="margin:0 0 16px; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Welcome to MyDraft
      </p>
      <p style="margin:0 0 20px; font-size:14px; color:#a1a1aa; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Hi${name ? ` ${name}` : ''}, your email account has been connected successfully. You're all set to start managing your inbox with AI-powered assistance.
      </p>
      <div style="background-color:#0a0a0f; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:16px 18px; margin-bottom:20px;">
        <p style="margin:0 0 12px; font-size:13px; font-weight:600; color:#d4d4d8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Here's what you can do:</p>
        <p style="margin:0 0 8px; font-size:13px; color:#a1a1aa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">&#8226; Generate AI-powered reply drafts</p>
        <p style="margin:0 0 8px; font-size:13px; color:#a1a1aa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">&#8226; Translate emails in 50+ languages</p>
        <p style="margin:0 0 8px; font-size:13px; color:#a1a1aa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">&#8226; Get instant email summaries</p>
        <p style="margin:0; font-size:13px; color:#a1a1aa; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">&#8226; Listen to emails with Read Aloud</p>
      </div>
      <p style="margin:0; font-size:12px; color:#52525b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        If you have any questions, just reply to this email.
      </p>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Welcome to MyDraft - Your AI inbox is ready',
      html: emailWrapper(content),
      text: `Welcome to MyDraft! Your email account has been connected. You can now generate AI reply drafts, translate emails, get summaries, and more.`,
    });
    if (error) { console.error('Failed to send welcome email:', error); return false; }
    return true;
  } catch (error) { console.error('Error sending welcome email:', error); return false; }
}

export async function sendPlanPurchaseEmail(to: string, planName: string, amount: string, interval: string): Promise<boolean> {
  try {
    const content = `
      <p style="margin:0 0 16px; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Subscription Confirmed
      </p>
      <p style="margin:0 0 20px; font-size:14px; color:#a1a1aa; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Thank you for subscribing to MyDraft <strong style="color:#f0f0f5;">${planName}</strong>. Your plan is now active.
      </p>
      <div style="background-color:#0a0a0f; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:16px 18px; margin-bottom:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#71717a; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Plan</td>
            <td align="right" style="color:#f0f0f5; padding:6px 0; font-size:13px; font-weight:600; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${planName}</td>
          </tr>
          <tr>
            <td style="color:#71717a; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Amount</td>
            <td align="right" style="color:#f0f0f5; padding:6px 0; font-size:13px; font-weight:600; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${amount}</td>
          </tr>
          <tr>
            <td style="color:#71717a; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Billing</td>
            <td align="right" style="color:#f0f0f5; padding:6px 0; font-size:13px; font-weight:600; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${interval}</td>
          </tr>
        </table>
      </div>
      <p style="margin:0; font-size:12px; color:#52525b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        You can manage your subscription anytime from Settings.
      </p>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `MyDraft ${planName} - Subscription confirmed`,
      html: emailWrapper(content),
      text: `Your MyDraft ${planName} subscription is confirmed. Amount: ${amount} billed ${interval}. Manage your subscription in Settings.`,
    });
    if (error) { console.error('Failed to send plan purchase email:', error); return false; }
    return true;
  } catch (error) { console.error('Error sending plan purchase email:', error); return false; }
}

export async function sendPlanCancelEmail(to: string, planName: string, endsAt?: string): Promise<boolean> {
  try {
    const endDateStr = endsAt ? new Date(endsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'the end of your billing period';
    const content = `
      <p style="margin:0 0 16px; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Subscription Canceled
      </p>
      <p style="margin:0 0 20px; font-size:14px; color:#a1a1aa; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Your MyDraft <strong style="color:#f0f0f5;">${planName}</strong> subscription has been canceled. You'll continue to have access until <strong style="color:#f0f0f5;">${endDateStr}</strong>.
      </p>
      <p style="margin:0 0 20px; font-size:14px; color:#a1a1aa; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Changed your mind? You can reactivate your subscription anytime from your Settings page before your access expires.
      </p>
      <p style="margin:0; font-size:12px; color:#52525b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        We're sorry to see you go. If there's anything we can improve, feel free to reply to this email.
      </p>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'MyDraft - Subscription canceled',
      html: emailWrapper(content),
      text: `Your MyDraft ${planName} subscription has been canceled. You'll have access until ${endDateStr}. You can reactivate anytime from Settings.`,
    });
    if (error) { console.error('Failed to send cancel email:', error); return false; }
    return true;
  } catch (error) { console.error('Error sending cancel email:', error); return false; }
}

export async function sendBillingReceiptEmail(to: string, planName: string, amount: string, invoiceDate: string, invoiceId?: string): Promise<boolean> {
  try {
    const content = `
      <p style="margin:0 0 16px; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Payment Receipt
      </p>
      <p style="margin:0 0 20px; font-size:14px; color:#a1a1aa; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Your payment for MyDraft <strong style="color:#f0f0f5;">${planName}</strong> has been processed successfully.
      </p>
      <div style="background-color:#0a0a0f; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:16px 18px; margin-bottom:20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="color:#71717a; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Date</td>
            <td align="right" style="color:#d4d4d8; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${invoiceDate}</td>
          </tr>
          <tr>
            <td style="color:#71717a; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Plan</td>
            <td align="right" style="color:#d4d4d8; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${planName}</td>
          </tr>
          <tr>
            <td style="color:#71717a; padding:6px 0; font-size:13px; font-weight:600; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Amount paid</td>
            <td align="right" style="color:#22c55e; padding:6px 0; font-size:13px; font-weight:600; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${amount}</td>
          </tr>
          ${invoiceId ? `<tr>
            <td style="color:#71717a; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Invoice</td>
            <td align="right" style="color:#d4d4d8; padding:6px 0; font-size:13px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${invoiceId}</td>
          </tr>` : ''}
        </table>
      </div>
      <p style="margin:0; font-size:12px; color:#52525b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Manage billing in your Settings. For questions, reply to this email.
      </p>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `MyDraft receipt - ${amount}`,
      html: emailWrapper(content),
      text: `Payment receipt for MyDraft ${planName}. Amount: ${amount}. Date: ${invoiceDate}. Manage your subscription in Settings.`,
    });
    if (error) { console.error('Failed to send receipt email:', error); return false; }
    return true;
  } catch (error) { console.error('Error sending receipt email:', error); return false; }
}

export async function sendTrialEndingEmail(to: string, planName: string, daysLeft: number, amount: string): Promise<boolean> {
  try {
    const content = `
      <p style="margin:0 0 16px; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Your free trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}
      </p>
      <p style="margin:0 0 20px; font-size:14px; color:#a1a1aa; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Your MyDraft <strong style="color:#f0f0f5;">${planName}</strong> free trial is ending soon. After the trial, your card will be charged <strong style="color:#f0f0f5;">${amount}</strong>.
      </p>
      <p style="margin:0 0 20px; font-size:14px; color:#a1a1aa; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        If you'd like to continue using all ${planName} features, no action is needed. To cancel, visit your Settings page before the trial ends.
      </p>
      <p style="margin:0; font-size:12px; color:#52525b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        Questions? Just reply to this email.
      </p>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `MyDraft - Your free trial ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
      html: emailWrapper(content),
      text: `Your MyDraft ${planName} free trial ends in ${daysLeft} days. After the trial, you'll be charged ${amount}. To cancel, visit Settings.`,
    });
    if (error) { console.error('Failed to send trial ending email:', error); return false; }
    return true;
  } catch (error) { console.error('Error sending trial ending email:', error); return false; }
}

export async function sendTestimonialRequestEmail(to: string, activateUrl: string): Promise<boolean> {
  try {
    const content = `
      <p style="margin:0 0 16px; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        How's MyDraft working for you?
      </p>
      <p style="margin:0 0 20px; font-size:14px; color:#a1a1aa; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        You've been using MyDraft for a week now, and we'd love to hear what you think. Share a quick testimonial and get a <strong style="color:#22c55e;">free month</strong> of your current plan.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
        <tr>
          <td align="center" style="border-radius:10px; background:linear-gradient(135deg, #3b82f6, #8b5cf6);">
            <a href="${activateUrl}" target="_blank" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              Share testimonial &amp; get free month
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0; font-size:12px; color:#52525b; text-align:center; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        The free month will be applied automatically after you submit your testimonial.
      </p>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Get a free month of MyDraft - Share your experience',
      html: emailWrapper(content),
      text: `How's MyDraft working for you? Share a quick testimonial and get a free month. Visit: ${activateUrl}`,
    });
    if (error) { console.error('Failed to send testimonial email:', error); return false; }
    return true;
  } catch (error) { console.error('Error sending testimonial email:', error); return false; }
}

export async function sendBroadcastEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const content = `
      <div style="font-size:14px; color:#d4d4d8; line-height:1.7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        ${body}
      </div>`;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: emailWrapper(content),
      text: body.replace(/<[^>]*>/g, ''),
    });
    if (error) { console.error('Failed to send broadcast email:', error); return false; }
    return true;
  } catch (error) { console.error('Error sending broadcast email:', error); return false; }
}

export async function getResendStats(): Promise<{ sent: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number } | null> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const emails = data.data || [];
    return {
      sent: emails.length,
      delivered: emails.filter((e: any) => e.last_event === 'delivered').length,
      opened: emails.filter((e: any) => e.last_event === 'opened').length,
      clicked: emails.filter((e: any) => e.last_event === 'clicked').length,
      bounced: emails.filter((e: any) => e.last_event === 'bounced').length,
      complained: emails.filter((e: any) => e.last_event === 'complained').length,
    };
  } catch (error) { console.error('Error fetching Resend stats:', error); return null; }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15)); display:inline-block; line-height:48px; text-align:center;">
            <span style="font-size:20px; color:#3b82f6;">&#128274;</span>
          </div>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:8px;">
          <p style="margin:0; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            Reset your password
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <p style="margin:0; font-size:14px; color:#71717a; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            We received a request to reset the password for your MyDraft account. Click the button below to choose a new password.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <a href="${resetUrl}" style="display:inline-block; padding:12px 32px; background:linear-gradient(135deg, #3b82f6, #6366f1); color:#ffffff; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            Reset Password
          </a>
        </td>
      </tr>
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto; background-color:#0a0a0f; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:0;">
            <tr>
              <td style="padding:10px 16px;">
                <p style="margin:0; font-size:12px; color:#52525b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  This link expires in <span style="color:#71717a;">1 hour</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:20px;">
          <p style="margin:0; font-size:12px; color:#3f3f46; line-height:1.5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </td>
      </tr>
    </table>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Reset your MyDraft password',
      html: emailWrapper(content),
      text: `Reset your MyDraft password. Click this link to reset your password: ${resetUrl}. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
    });

    if (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }

    console.log(`Password reset email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

export async function sendTrialEndedEmail(to: string, loginUrl: string): Promise<boolean> {
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15)); display:inline-block; line-height:48px; text-align:center;">
            <span style="font-size:20px; color:#3b82f6;">&#9203;</span>
          </div>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:8px;">
          <p style="margin:0; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            Your free trial has ended
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <p style="margin:0; font-size:14px; color:#71717a; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            Your 14-day MyDraft trial has ended. To continue using MyDraft, log in and choose a plan — you can continue with a free plan or upgrade to Pro or Business for full access.
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <a href="${loginUrl}" style="display:inline-block; padding:12px 32px; background:linear-gradient(135deg, #3b82f6, #6366f1); color:#ffffff; text-decoration:none; border-radius:10px; font-size:14px; font-weight:600; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            Choose a Plan
          </a>
        </td>
      </tr>
      <tr>
        <td align="center">
          <p style="margin:0; font-size:12px; color:#3f3f46; line-height:1.5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            If you have any questions, reply to this email and we'll be happy to help.
          </p>
        </td>
      </tr>
    </table>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Your MyDraft free trial has ended',
      html: emailWrapper(content),
      text: `Your 14-day MyDraft trial has ended. To continue using MyDraft, visit ${loginUrl} and choose a plan. You can continue with a free plan or upgrade for full access.`,
    });

    if (error) {
      console.error('Failed to send trial ended email:', error);
      return false;
    }

    console.log(`Trial ended email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending trial ended email:', error);
    return false;
  }
}

export async function sendVerificationEmail(to: string, code: string, type: 'signup' | 'login' | 'action'): Promise<boolean> {
  let subject: string;
  let bodyText: string;
  let heading: string;
  let description: string;
  let icon: string;
  
  switch (type) {
    case 'signup':
      subject = 'Verify your MyDraft account';
      bodyText = `Welcome to MyDraft! Your verification code is: ${code}. This code expires in 10 minutes.`;
      heading = 'Verify your email';
      description = 'Welcome to MyDraft. Enter this code to verify your email and get started.';
      icon = '&#9679;';
      break;
    case 'login':
      subject = 'Your MyDraft login code';
      bodyText = `Your login verification code is: ${code}. If you didn't request this, please ignore this email. This code expires in 10 minutes.`;
      heading = 'Login verification';
      description = 'Enter this code to complete your sign-in.';
      icon = '&#9679;';
      break;
    case 'action':
      subject = 'Confirm your action on MyDraft';
      bodyText = `Your verification code is: ${code}. Use this code to confirm your action. This code expires in 10 minutes.`;
      heading = 'Confirm your action';
      description = 'Enter this code to confirm your security settings change.';
      icon = '&#9679;';
      break;
  }

  const digits = code.split('');
  const codeBoxes = digits.map(d =>
    `<td align="center" style="width:44px; height:52px; background-color:#0a0a0f; border:1px solid rgba(255,255,255,0.08); border-radius:10px; font-size:22px; font-weight:700; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,monospace; letter-spacing:0;">${d}</td>`
  ).join('<td style="width:6px;"></td>');

  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding-bottom:24px;">
          <div style="width:48px; height:48px; border-radius:12px; background:linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15)); display:inline-block; line-height:48px; text-align:center;">
            <span style="font-size:20px; color:#3b82f6;">${icon}</span>
          </div>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:8px;">
          <p style="margin:0; font-size:18px; font-weight:600; color:#f0f0f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ${heading}
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <p style="margin:0; font-size:14px; color:#71717a; line-height:1.6; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            ${description}
          </p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-bottom:28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              ${codeBoxes}
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto; background-color:#0a0a0f; border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:0;">
            <tr>
              <td style="padding:10px 16px;">
                <p style="margin:0; font-size:12px; color:#52525b; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  Code expires in <span style="color:#71717a;">10 minutes</span>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${type !== 'signup' ? `
      <tr>
        <td align="center" style="padding-top:20px;">
          <p style="margin:0; font-size:12px; color:#3f3f46; line-height:1.5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </td>
      </tr>` : ''}
    </table>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: emailWrapper(content),
      text: bodyText,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return false;
    }

    console.log(`Verification email sent to ${to} for ${type}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
