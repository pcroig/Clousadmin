import { getBaseUrl, sendEmail } from '@/lib/email';

interface RecoveryEmailParams {
  email: string;
  token: string;
}

export async function sendPasswordRecoveryEmail({
  email,
  token,
}: RecoveryEmailParams): Promise<void> {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; color: #111827;">
        <p>Hola,</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña de Clousadmin.</p>
        <p>Si tú hiciste esta solicitud, haz clic en el siguiente botón:</p>
        <p style="text-align:center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Restablecer contraseña
          </a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p><a href="${resetUrl}" style="color:#2563eb;">${resetUrl}</a></p>
        <p style="font-size:12px;color:#6b7280;margin-top:32px;">
          Este enlace caduca en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.
        </p>
      </body>
    </html>
  `;

  const text = `
Hola,

Hemos recibido una solicitud para restablecer tu contraseña de Clousadmin.
Si tú hiciste esta solicitud, abre este enlace:
${resetUrl}

Este enlace caduca en 1 hora. Si no solicitaste este cambio, ignora este correo.
  `.trim();

  await sendEmail(
    email,
    'Restablece tu contraseña de Clousadmin',
    html,
    text
  );
}

export async function sendPasswordResetConfirmationEmail(email: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; color: #111827;">
        <p>Hola,</p>
        <p>Tu contraseña de Clousadmin se ha actualizado correctamente.</p>
        <p>Si no fuiste tú, contacta inmediatamente con tu administrador.</p>
        <p style="margin-top:24px;">Puedes iniciar sesión aquí: <a href="${baseUrl}/login" style="color:#2563eb;">${baseUrl}/login</a></p>
      </body>
    </html>
  `;

  const text = `
Hola,

Tu contraseña de Clousadmin se ha actualizado correctamente.
Si no fuiste tú, contacta inmediatamente con tu administrador.

Inicia sesión: ${baseUrl}/login
  `.trim();

  await sendEmail(
    email,
    'Tu contraseña se ha actualizado',
    html,
    text
  );
}

