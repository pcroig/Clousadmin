// ========================================
// Email Service - AWS SES
// ========================================

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.SES_REGION || process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Enviar email usando AWS SES
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  textBody?: string
): Promise<void> {
  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          ...(textBody && {
            Text: {
              Data: textBody,
              Charset: 'UTF-8',
            },
          }),
        },
      },
    });

    await sesClient.send(command);
    console.log(`[Email] Enviado a ${to}: ${subject}`);
  } catch (error) {
    console.error(`[Email] Error enviando a ${to}:`, error);
    throw error;
  }
}

/**
 * Enviar email de invitación para signup
 */
export async function sendSignupInvitationEmail(
  email: string,
  invitationUrl: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">¡Bienvenido a Clousadmin!</h1>
          <p>Has sido invitado a crear tu cuenta y empresa en Clousadmin.</p>
          <p>Haz clic en el siguiente botón para comenzar:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Crear mi cuenta
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">
            O copia y pega este enlace en tu navegador:<br>
            <a href="${invitationUrl}" style="color: #2563eb;">${invitationUrl}</a>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            Este enlace expirará en 7 días. Si no solicitaste esta invitación, puedes ignorar este email.
          </p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
¡Bienvenido a Clousadmin!

Has sido invitado a crear tu cuenta y empresa en Clousadmin.

Para comenzar, visita este enlace:
${invitationUrl}

Este enlace expirará en 7 días.

Si no solicitaste esta invitación, puedes ignorar este email.
  `;

  await sendEmail(
    email,
    'Invitación para crear tu cuenta en Clousadmin',
    htmlBody,
    textBody
  );
}

/**
 * Enviar confirmación de waitlist
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
 * Notificar a usuario de waitlist que ahora tiene una invitación
 */
export async function sendWaitlistInvitationEmail(
  email: string,
  invitationUrl: string
): Promise<void> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">¡Buenas noticias!</h1>
          <p>Tu solicitud ha sido aprobada y ahora tienes una invitación para crear tu cuenta en Clousadmin.</p>
          <p>Haz clic en el siguiente botón para comenzar:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Crear mi cuenta
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">
            O copia y pega este enlace en tu navegador:<br>
            <a href="${invitationUrl}" style="color: #2563eb;">${invitationUrl}</a>
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">
            Este enlace expirará en 7 días.
          </p>
        </div>
      </body>
    </html>
  `;

  const textBody = `
¡Buenas noticias!

Tu solicitud ha sido aprobada y ahora tienes una invitación para crear tu cuenta en Clousadmin.

Para comenzar, visita este enlace:
${invitationUrl}

Este enlace expirará en 7 días.
  `;

  await sendEmail(
    email,
    'Tu invitación para Clousadmin está lista',
    htmlBody,
    textBody
  );
}

/**
 * Enviar email de onboarding a empleado nuevo
 */
export async function sendOnboardingEmail(
  empleadoNombre: string,
  empleadoApellidos: string,
  email: string,
  empresaNombre: string,
  onboardingUrl: string
): Promise<void> {
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">¡Bienvenido/a a ${empresaNombre}, ${empleadoNombre}!</h1>
          
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
            <a href="${onboardingUrl}" 
               style="display: inline-block; padding: 14px 32px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Completar mis datos
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666;">
            O copia y pega este enlace en tu navegador:<br>
            <a href="${onboardingUrl}" style="color: #2563eb; word-break: break-all;">${onboardingUrl}</a>
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
¡Bienvenido/a a ${empresaNombre}, ${empleadoNombre}!

Para completar tu alta, necesitamos que completes tus datos personales y bancarios.

Este proceso te tomará solo 2 minutos.

Solo necesitas rellenar formularios, sin subir ningún documento.

¿Qué necesitas completar?
- Paso 1: Datos personales (NIF, NSS, dirección, teléfono)
- Paso 2: Datos bancarios (IBAN)

Para comenzar, visita este enlace:
${onboardingUrl}

Importante: Este link es válido durante 7 días. Si necesitas ayuda, contacta con RRHH.
  `;

  await sendEmail(
    email,
    `¡Bienvenido/a! Completa tus datos - ${empresaNombre}`,
    htmlBody,
    textBody
  );
}

