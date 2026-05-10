import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: { user, pass },
  });
}

function welcomeEmailHtml(name: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ARYA</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:32px 40px;text-align:center;">
            <div style="display:inline-block;background:#0f172a;border-radius:12px;padding:10px 20px;">
              <span style="font-size:28px;font-weight:900;letter-spacing:3px;background:linear-gradient(90deg,#22d3ee,#f59e0b,#a78bfa);-webkit-background-clip:text;color:transparent;">ARYA</span>
            </div>
            <p style="color:#94a3b8;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">Your Personal Thinking &amp; Growth Assistant</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 8px;">Welcome, ${name}! 🙏</h1>
            <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
              I'm ARYA — your thinking partner, goal keeper, and guide. I'm here to help you think clearly, stay disciplined, and grow — every single day.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;padding:16px 20px;">
                  <p style="color:#0f766e;font-size:13px;font-weight:600;margin:0 0 10px;letter-spacing:0.5px;">HERE'S WHAT YOU CAN DO</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:4px 0;color:#334155;font-size:14px;">🧠 <strong>Think</strong> — Talk through decisions, problems, and ideas</td></tr>
                    <tr><td style="padding:4px 0;color:#334155;font-size:14px;">🎯 <strong>Set Goals</strong> — ARYA builds a plan and tracks progress</td></tr>
                    <tr><td style="padding:4px 0;color:#334155;font-size:14px;">🌅 <strong>Reflect Daily</strong> — Start your morning with clarity</td></tr>
                    <tr><td style="padding:4px 0;color:#334155;font-size:14px;">🎙️ <strong>Talk in Your Language</strong> — Voice conversations in Hindi &amp; 10 other Indian languages</td></tr>
                    <tr><td style="padding:4px 0;color:#334155;font-size:14px;">🧘 <strong>Wisdom</strong> — Timeless guidance when you need it most</td></tr>
                  </table>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td align="center">
                  <a href="https://aryaai.in" style="display:inline-block;background:linear-gradient(135deg,#0891b2,#06b6d4);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:50px;letter-spacing:0.5px;">Start Your Journey →</a>
                </td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;border-top:1px solid #e2e8f0;padding-top:24px;">
              You can talk to me anytime at <a href="https://aryaai.in" style="color:#0891b2;">aryaai.in</a>. I remember your goals, track your progress, and I'm always here — like a wise friend in your pocket.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">ARYA by VARAH Group · <a href="https://aryaai.in" style="color:#94a3b8;">aryaai.in</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(name: string, email: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[Email] SMTP not configured — skipping welcome email for ${email}`);
    return;
  }
  try {
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
    await transporter.sendMail({
      from: `"ARYA" <${from}>`,
      to: email,
      subject: `Welcome to ARYA, ${name}! Your thinking partner is ready 🙏`,
      html: welcomeEmailHtml(name),
      text: `Welcome ${name}! I'm ARYA — your Personal Thinking & Growth Assistant. Visit https://aryaai.in to start your journey.`,
    });
    console.log(`[Email] Welcome email sent to ${email}`);
  } catch (err: any) {
    console.error(`[Email] Failed to send welcome email to ${email}:`, err.message);
  }
}
