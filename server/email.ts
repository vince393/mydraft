import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'MyDraft <support@mydraft.io>';

export async function sendVerificationEmail(to: string, code: string, type: 'signup' | 'login' | 'action'): Promise<boolean> {
  let subject: string;
  let bodyText: string;
  
  switch (type) {
    case 'signup':
      subject = 'Verify your MyDraft account';
      bodyText = `Welcome to MyDraft! Your verification code is: ${code}. This code expires in 10 minutes.`;
      break;
    case 'login':
      subject = 'Your MyDraft login verification code';
      bodyText = `Your login verification code is: ${code}. If you didn't request this, please ignore this email. This code expires in 10 minutes.`;
      break;
    case 'action':
      subject = 'Confirm your action on MyDraft';
      bodyText = `Your verification code is: ${code}. Use this code to confirm your action. This code expires in 10 minutes.`;
      break;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #e2e8f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 40px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="font-size: 28px; font-weight: bold; color: #f8fafc; margin: 0;">MyDraft</h1>
    </div>
    
    <h2 style="font-size: 20px; color: #f8fafc; margin-bottom: 16px; text-align: center;">
      ${type === 'signup' ? 'Verify Your Email' : type === 'login' ? 'Login Verification' : 'Confirm Your Action'}
    </h2>
    
    <p style="color: #94a3b8; margin-bottom: 24px; text-align: center; line-height: 1.6;">
      ${type === 'signup' 
        ? 'Welcome to MyDraft! Use the code below to verify your email address.' 
        : type === 'login' 
        ? 'Enter this code to complete your login.' 
        : 'Use this code to confirm your action.'}
    </p>
    
    <div style="background-color: #0f172a; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3b82f6;">${code}</span>
    </div>
    
    <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 0;">
      This code expires in 10 minutes.
    </p>
    
    ${type !== 'signup' ? `
    <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 16px;">
      If you didn't request this code, you can safely ignore this email.
    </p>
    ` : ''}
  </div>
  
  <p style="color: #475569; font-size: 12px; text-align: center; margin-top: 24px;">
    © ${new Date().getFullYear()} MyDraft
  </p>
</body>
</html>
      `,
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
