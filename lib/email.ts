// ========================================
// Email Service - Resend
// ========================================

import { Resend } from 'resend';

// ========================================
// CONFIGURACIÓN Y HELPERS
// ========================================

/**
 * Obtiene la URL base de la aplicación
 * Exportada para uso en otros módulos
 */
export function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Valida formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitiza texto para usar en HTML (previene XSS básico)
 */
function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sanitiza URL para usar en atributos href
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Solo permitir http/https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '#';
    }
    return parsed.toString();
  } catch {
    return '#';
  }
}

/**
 * Verifica si Resend está configurado
 */
function isResendConfigured(): boolean {
  return !!(
    process.env.RESEND_API_KEY &&
    process.env.RESEND_FROM_EMAIL
  );
}

// Singleton para Resend client (eficiencia)
let resendClientInstance: Resend | null = null;

/**
 * Obtiene instancia singleton de Resend client
 */
function getResendClient(): Resend | null {
  if (!isResendConfigured()) {
    return null;
  }
  
  // Singleton: crear solo una vez
  if (!resendClientInstance) {
    resendClientInstance = new Resend(process.env.RESEND_API_KEY!);
  }
  
  return resendClientInstance;
}

// ========================================
// FUNCIÓN PRINCIPAL DE ENVÍO
// ========================================

/**
 * Envía email usando Resend
 * 
 * @param to Email del destinatario (validado)
 * @param subject Asunto del email
 * @param htmlBody Cuerpo HTML del email
 * @param textBody Cuerpo texto plano (opcional, recomendado)
 * @throws Error si el email no es válido o si hay error al enviar
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<void> {
  // Validar email
  if (!isValidEmail(to)) {
    throw new Error(`Email inválido: ${to}`);
  }

  // Si Resend no está configurado (desarrollo), log y skip
  if (!isResendConfigured()) {
    console.warn('[Email] Resend no configurado. En desarrollo, email no enviado:', { to, subject });
    return;
  }

  const resendClient = getResendClient();
  if (!resendClient) {
    throw new Error('Resend client no disponible');
  }

  try {
    const fromName = process.env.RESEND_FROM_NAME || 'Clousadmin';
    const fromEmail = process.env.RESEND_FROM_EMAIL!;
    const from = `${fromName} <${fromEmail}>`;

    await resendClient.emails.send({
      from,
      to: [to],
      subject,
      html: htmlBody,
      ...(textBody && { text: textBody }),
    });

    console.log(`[Email] Enviado a ${to}: ${subject}`);
  } catch (error) {
    console.error(`[Email] Error enviando a ${to}:`, error);
    throw error;
  }
}

// ========================================
// TEMPLATES DE EMAIL
// ========================================

/**
 * Template base para emails con botón CTA
 */
function createEmailTemplateWithButton(params: {
  titulo: string;
  mensajePrincipal: string;
  mensajeSecundario?: string;
  buttonText: string;
  buttonUrl: string;
  mensajeFooter?: string;
}): { html: string; text: string } {
  const { titulo, mensajePrincipal, mensajeSecundario, buttonText, buttonUrl, mensajeFooter } = params;
  const safeUrl = sanitizeUrl(buttonUrl);
  const safeTitulo = sanitizeHtml(titulo);
  const safeMensajePrincipal = sanitizeHtml(mensajePrincipal);
  const safeMensajeSecundario = mensajeSecundario ? sanitizeHtml(mensajeSecundario) : '';
  const safeButtonText = sanitizeHtml(buttonText);
  const safeMensajeFooter = mensajeFooter ? sanitizeHtml(mensajeFooter) : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">${safeTitulo}</h1>
          <p>${safeMensajePrincipal}</p>
          ${safeMensajeSecundario ? `<p>${safeMensajeSecundario}</p>` : ''}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              ${safeButtonText}
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">
            O copia y pega este enlace en tu navegador:<br>
            <a href="${safeUrl}" style="color: #2563eb; word-break: break-all;">${safeUrl}</a>
          </p>
          ${safeMensajeFooter ? `<p style="font-size: 12px; color: #999; margin-top: 30px;">${safeMensajeFooter}</p>` : ''}
        </div>
      </body>
    </html>
  `;

  const text = `
${safeTitulo}

${safeMensajePrincipal}
${safeMensajeSecundario ? `\n${safeMensajeSecundario}` : ''}

Para comenzar, visita este enlace:
${safeUrl}

${safeMensajeFooter ? `\n${safeMensajeFooter}` : ''}
  `.trim();

  return { html, text };
}

/**
 * Envía email de invitación para signup
 */
export async function sendSignupInvitationEmail(
  email: string,
  invitationUrl: string
): Promise<void> {
  const safeUrl = sanitizeUrl(invitationUrl);
  
  const template = createEmailTemplateWithButton({
    titulo: '¡Bienvenido a Clousadmin!',
    mensajePrincipal: 'Has sido invitado a crear tu cuenta y empresa en Clousadmin.',
    mensajeSecundario: 'Haz clic en el siguiente botón para comenzar:',
    buttonText: 'Crear mi cuenta',
    buttonUrl: safeUrl,
    mensajeFooter: 'Este enlace expirará en 7 días. Si no solicitaste esta invitación, puedes ignorar este email.',
  });

  await sendEmail(
    email,
    'Invitación para crear tu cuenta en Clousadmin',
    template.html,
    template.text
  );
}

/**
 * Envía confirmación de waitlist
 */
export async function sendWaitlistConfirmationEmail(email: string): Promise<void> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">¡Te hemos añadido a la lista de espera!</h1>
          <p>Gracias por tu interés en Clousadmin.</p>
          <p>Hemos recibido tu solicitud y te notificaremos cuando tengamos una invitación disponible para ti.</p>
          <p>Mientras tanto, puedes conocer más sobre Clousadmin en nuestro sitio web.</p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            Si tienes alguna pregunta, no dudes en contactarnos.
          </p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
¡Te hemos añadido a la lista de espera!

Gracias por tu interés en Clousadmin.

Hemos recibido tu solicitud y te notificaremos cuando tengamos una invitación disponible para ti.

Mientras tanto, puedes conocer más sobre Clousadmin en nuestro sitio web.
  `;

  await sendEmail(
    email,
    'Has sido añadido a la lista de espera de Clousadmin',
    htmlBody,
    textBody
  );
}

/**
 * Notifica a usuario de waitlist que ahora tiene una invitación
 */
export async function sendWaitlistInvitationEmail(
  email: string,
  invitationUrl: string
): Promise<void> {
  const safeUrl = sanitizeUrl(invitationUrl);
  
  const template = createEmailTemplateWithButton({
    titulo: '¡Buenas noticias!',
    mensajePrincipal: 'Tu solicitud ha sido aprobada y ahora tienes una invitación para crear tu cuenta en Clousadmin.',
    mensajeSecundario: 'Haz clic en el siguiente botón para comenzar:',
    buttonText: 'Crear mi cuenta',
    buttonUrl: safeUrl,
    mensajeFooter: 'Este enlace expirará en 7 días.',
  });

  await sendEmail(
    email,
    'Tu invitación para Clousadmin está lista',
    template.html,
    template.text
  );
}

/**
 * Envía email de onboarding a empleado nuevo
 */
export async function sendOnboardingEmail(
  empleadoNombre: string,
  empleadoApellidos: string,
  email: string,
  empresaNombre: string,
  onboardingUrl: string
): Promise<void> {
  const safeNombre = sanitizeHtml(empleadoNombre);
  const safeEmpresa = sanitizeHtml(empresaNombre);
  const safeUrl = sanitizeUrl(onboardingUrl);
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">¡Bienvenido/a a ${safeEmpresa}, ${safeNombre}!</h1>
          
          <p>Para completar tu alta, necesitamos que completes tus datos personales y bancarios.</p>
          
          <p><strong>Este proceso te tomará solo 2 minutos.</strong></p>
          
          <p>Solo necesitas rellenar formularios, sin subir ningún documento.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>¿Qué necesitas completar?</strong>
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px; color: #666;">
              <li>Paso 1: Datos personales (NIF, NSS, dirección, teléfono)</li>
              <li>Paso 2: Datos bancarios (IBAN)</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${safeUrl}" 
               style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Completar mis datos
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666;">
            O copia y pega este enlace en tu navegador:<br>
            <a href="${safeUrl}" style="color: #2563eb; word-break: break-all;">${safeUrl}</a>
          </p>
          
          <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              <strong>Importante:</strong> Este link es válido durante 7 días. Si necesitas ayuda, contacta con RRHH.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textBody = `
¡Bienvenido/a a ${safeEmpresa}, ${safeNombre}!

Para completar tu alta, necesitamos que completes tus datos personales y bancarios.

Este proceso te tomará solo 2 minutos.

Solo necesitas rellenar formularios, sin subir ningún documento.

¿Qué necesitas completar?
- Paso 1: Datos personales (NIF, NSS, dirección, teléfono)
- Paso 2: Datos bancarios (IBAN)

Para comenzar, visita este enlace:
${safeUrl}

Importante: Este link es válido durante 7 días. Si necesitas ayuda, contacta con RRHH.
  `;

  await sendEmail(
    email,
    `¡Bienvenido/a! Completa tus datos - ${safeEmpresa}`,
    htmlBody,
    textBody
  );
}

