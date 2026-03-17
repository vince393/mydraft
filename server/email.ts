import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
