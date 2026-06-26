import nodemailer from 'nodemailer';

export interface WelcomeEmailOptions {
  to: string;
  clinicName: string;
  adminFirstName: string;
  slug: string;
  tempPassword: string;
  loginUrl: string;
}

function createSmtpTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendWelcomeEmail(opts: WelcomeEmailOptions): Promise<void> {
  const transport = createSmtpTransport();
  if (!transport) {
    console.warn('[email] SMTP not configured — skipping welcome email for', opts.to);
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await transport.sendMail({
    from,
    to: opts.to,
    subject: `Bienvenido a DermicaPro — ${opts.clinicName}`,
    html: `
      <h2>¡Hola, ${opts.adminFirstName}!</h2>
      <p>Tu clínica <strong>${opts.clinicName}</strong> ya está lista en DermicaPro.</p>
      <hr>
      <p><strong>URL de acceso:</strong> <a href="${opts.loginUrl}">${opts.loginUrl}</a></p>
      <p><strong>Email:</strong> ${opts.to}</p>
      <p><strong>Contraseña temporal:</strong> <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px">${opts.tempPassword}</code></p>
      <hr>
      <p style="color:#666;font-size:13px">Por seguridad, cambia tu contraseña en el primer inicio de sesión.</p>
    `,
  });
}
