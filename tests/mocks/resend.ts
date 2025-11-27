/**
 * Mock de Resend para tests
 * Evita envío real de emails
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi } from 'vitest';

// ========================================
// STORAGE DE EMAILS ENVIADOS
// ========================================

/**
 * Almacena emails enviados durante tests para assertions
 */
export const sentEmails: any[] = [];

/**
 * Limpia el storage de emails
 */
export function clearSentEmails() {
  sentEmails.length = 0;
}

// ========================================
// MOCK RESEND CLIENT
// ========================================

export const mockResend = {
  emails: {
    send: vi.fn(async (emailData) => {
      // Guardar email en storage
      sentEmails.push({
        ...emailData,
        sentAt: new Date(),
        id: 'email_test_' + Math.random().toString(36).substring(7),
      });

      // Retornar respuesta exitosa
      return {
        id: 'email_test_' + Math.random().toString(36).substring(7),
      };
    }),
  },
};

/**
 * Configura el mock de Resend en el test
 */
export function setupResendMock() {
  vi.mock('resend', () => {
    return {
      Resend: vi.fn(() => mockResend),
    };
  });
}

// ========================================
// HELPERS PARA ASSERTIONS
// ========================================

/**
 * Verifica que se envió un email a un destinatario
 */
export function assertEmailSent(to: string) {
  const email = sentEmails.find((e) => e.to === to || e.to.includes(to));
  if (!email) {
    throw new Error(`No se encontró email enviado a ${to}`);
  }
  return email;
}

/**
 * Verifica que se envió un email con un asunto específico
 */
export function assertEmailSentWithSubject(subject: string) {
  const email = sentEmails.find((e) => e.subject === subject);
  if (!email) {
    throw new Error(`No se encontró email con asunto "${subject}"`);
  }
  return email;
}

/**
 * Obtiene el último email enviado
 */
export function getLastSentEmail() {
  return sentEmails[sentEmails.length - 1];
}

/**
 * Verifica que NO se envió ningún email
 */
export function assertNoEmailsSent() {
  if (sentEmails.length > 0) {
    throw new Error(
      `Se esperaba que no se enviaran emails, pero se enviaron ${sentEmails.length}`
    );
  }
}
