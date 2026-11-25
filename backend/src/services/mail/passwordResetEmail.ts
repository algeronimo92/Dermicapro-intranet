import { MailMessage } from './mailer';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export const passwordResetEmail = (
  to: string,
  firstName: string,
  link: string,
  minutes: number,
): MailMessage => {
  const name = escapeHtml(firstName);
  const href = escapeHtml(link);

  const text = [
    `Hola, ${firstName}:`,
    '',
    'Recibimos una solicitud para restablecer la contraseña de tu cuenta de DermicaPro.',
    `Abre este enlace para crear una nueva (vence en ${minutes} minutos y sirve una sola vez):`,
    '',
    link,
    '',
    'Si no fuiste tú, ignora este correo: tu contraseña no cambiará.',
    '',
    'DermicaPro · Trujillo, Perú',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;">
        <tr><td style="font-size:20px;font-weight:bold;padding-bottom:16px;">DermicaPro</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;">
          <p style="margin:0 0 12px;">Hola, ${name}:</p>
          <p style="margin:0 0 24px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Pulsa el botón para crear una nueva.</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${href}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:8px;">Crear nueva contraseña</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#52525b;">
          <p style="margin:0 0 12px;">El enlace vence en ${minutes} minutos y sirve una sola vez.</p>
          <p style="margin:0 0 12px;">Si el botón no funciona, copia esta dirección en tu navegador:<br><a href="${href}" style="color:#52525b;word-break:break-all;">${href}</a></p>
          <p style="margin:0;">Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
        </td></tr>
      </table>
      <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">DermicaPro · Trujillo, Perú</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { to, subject: 'Restablece tu contraseña de DermicaPro', text, html };
};
