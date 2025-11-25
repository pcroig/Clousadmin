// ========================================
// Email Service - Resend with React Email
// ========================================

import { Resend } from 'resend';

import {
  EmployeeWelcomeEmail,
  FirmaPendienteEmail,
  NominaDisponibleEmail,
  PasswordRecoveryEmail,
  PasswordResetConfirmationEmail,
  renderEmail,
  SignupInvitationEmail,
  WaitlistConfirmationEmail,
  WaitlistInternalEmail,
  WaitlistInvitationEmail,
} from '@/lib/emails';

// ========================================
// CONFIGURACIÓN Y HELPERS
// ========================================

/**
 * Obtiene la URL base de la aplicación
 * Exportada para uso en otros módulos
 */
export function getBaseUrl(preferredOrigin?: string): string {
  if (preferredOrigin) {
    try {
      const parsed = new URL(preferredOrigin);
      return parsed.origin;
    } catch {
      // Ignorar si no es una URL válida
    }
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  if (process.env.VERCEL_URL) {
    const vercelUrl = process.env.VERCEL_URL.startsWith('http')
      ? process.env.VERCEL_URL
      : `https://${process.env.VERCEL_URL}`;
    try {
      const parsed = new URL(vercelUrl);
      return parsed.origin;
    } catch {
      // continuar con fallback
    }
  }

  return 'http://localhost:3000';
}

/**
 * Valida formato de email
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

const INTERNAL_WAITLIST_EMAIL = process.env.WAITLIST_NOTIFY_EMAIL || 'pabloroigburgui@gmail.com';

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
// FUNCIONES DE EMAIL CON REACT EMAIL
// ========================================

/**
 * Envía email de invitación para signup
 */
export async function sendSignupInvitationEmail(
  email: string,
  invitationUrl: string
): Promise<void> {
  const { html, text } = await renderEmail(
    SignupInvitationEmail({ invitationUrl })
  );

  await sendEmail(
    email,
    'Invitación para crear tu cuenta en Clousadmin',
    html,
    text
  );
}

/**
 * Envía confirmación de waitlist
 */
export async function sendWaitlistConfirmationEmail(email: string): Promise<void> {
  const { html, text } = await renderEmail(
    WaitlistConfirmationEmail()
  );

  await sendEmail(
    email,
    'Has sido añadido a la lista de espera de Clousadmin',
    html,
    text
  );
}

/**
 * Notifica a usuario de waitlist que ahora tiene una invitación
 */
export async function sendWaitlistInvitationEmail(
  email: string,
  invitationUrl: string
): Promise<void> {
  const { html, text } = await renderEmail(
    WaitlistInvitationEmail({ invitationUrl })
  );

  await sendEmail(
    email,
    'Tu invitación para Clousadmin está lista',
    html,
    text
  );
}

type WaitlistInternalNotification = {
  email: string;
  nombre?: string;
  empresa?: string;
  mensaje?: string;
};

/**
 * Notifica internamente que llegó una nueva solicitud de waitlist
 */
export async function sendWaitlistInternalNotificationEmail(
  payload: WaitlistInternalNotification
): Promise<void> {
  const { email, nombre, empresa, mensaje } = payload;
  const destinatario = INTERNAL_WAITLIST_EMAIL;

  const { html, text } = await renderEmail(
    WaitlistInternalEmail({ email, nombre, empresa, mensaje })
  );

  await sendEmail(
    destinatario,
    `Nueva solicitud de waitlist: ${empresa || email}`,
    html,
    text
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
  const { html, text } = await renderEmail(
    EmployeeWelcomeEmail({
      empleadoNombre,
      empresaNombre,
      onboardingUrl,
    })
  );

  await sendEmail(
    email,
    `¡Bienvenido/a! Completa tus datos - ${empresaNombre}`,
    html,
    text
  );
}

/**
 * Envía email de firma pendiente
 */
export async function sendFirmaPendienteEmail(
  email: string,
  empleadoNombre: string,
  documentoNombre: string,
  firmaUrl: string
): Promise<void> {
  const { html, text } = await renderEmail(
    FirmaPendienteEmail({
      empleadoNombre,
      documentoNombre,
      firmaUrl,
    })
  );

  await sendEmail(
    email,
    `Documento pendiente de firma: ${documentoNombre}`,
    html,
    text
  );
}

/**
 * Envía email de nómina disponible
 */
export async function sendNominaDisponibleEmail(
  email: string,
  empleadoNombre: string,
  mes: string,
  año: number,
  nominaUrl: string
): Promise<void> {
  const { html, text } = await renderEmail(
    NominaDisponibleEmail({
      empleadoNombre,
      mes,
      año,
      nominaUrl,
    })
  );

  await sendEmail(
    email,
    `Tu nómina de ${mes} ${año} está disponible`,
    html,
    text
  );
}

/**
 * Envía email de recuperación de contraseña
 */
export async function sendPasswordRecoveryEmail(params: {
  email: string;
  token: string;
}): Promise<void> {
  const { email, token } = params;
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  const { html, text } = await renderEmail(
    PasswordRecoveryEmail({ resetUrl })
  );

  await sendEmail(
    email,
    'Restablece tu contraseña de Clousadmin',
    html,
    text
  );
}

/**
 * Envía confirmación de cambio de contraseña
 */
export async function sendPasswordResetConfirmationEmail(email: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const loginUrl = `${baseUrl}/login`;

  const { html, text } = await renderEmail(
    PasswordResetConfirmationEmail({ loginUrl })
  );

  await sendEmail(
    email,
    'Tu contraseña se ha actualizado',
    html,
    text
  );
}
