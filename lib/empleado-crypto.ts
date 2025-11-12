// ========================================
// Empleado Encryption Helpers
// ========================================
// Helpers para encriptar/desencriptar campos sensibles de empleados

import { encrypt, decrypt } from '@/lib/crypto';
import type { Empleado } from '@prisma/client';

// Campos sensibles que se encriptan
const SENSITIVE_FIELDS = ['iban', 'nif', 'nss'] as const;

type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

/**
 * Encriptar campos sensibles antes de guardar en BD
 * @param data - Datos del empleado (puede ser parcial para updates)
 * @returns Datos con campos sensibles encriptados
 */
export function encryptEmpleadoData<T extends Partial<Empleado>>(data: T): T {
  const encrypted: T = { ...data };

  for (const field of SENSITIVE_FIELDS) {
    const value = data[field];
    if (value !== null && value !== undefined && value !== '') {
      try {
        encrypted[field] = encrypt(String(value)) as T[typeof field];
      } catch (error) {
        console.error(`[Empleado Crypto] Error encriptando ${field}:`, error);
        throw new Error(`Error encriptando campo ${field}`);
      }
    }
  }

  return encrypted;
}

/**
 * Desencriptar campos sensibles después de leer de BD
 * @param empleado - Empleado con campos encriptados
 * @returns Empleado con campos desencriptados
 */
export function decryptEmpleadoData<T extends Partial<Empleado>>(empleado: T): T {
  if (!empleado) return empleado;

  const decrypted: T = { ...empleado };

  for (const field of SENSITIVE_FIELDS) {
    const value = empleado[field];
    if (value !== null && value !== undefined && value !== '') {
      const stringValue = String(value);
      
      // Verificar si el campo está encriptado antes de intentar desencriptarlo
      // Esto maneja casos donde hay datos antiguos sin encriptar
      if (isFieldEncrypted(stringValue)) {
        try {
          decrypted[field] = decrypt(stringValue) as T[typeof field];
        } catch (error) {
          // Si falla la desencriptación, mantener el valor original
          // Esto puede pasar si la key cambió o hay datos corruptos
          console.warn(`[Empleado Crypto] No se pudo desencriptar ${field}, manteniendo valor original. Error:`, error instanceof Error ? error.message : error);
          // Mantener el valor original (encriptado) para no romper la app
        }
      }
      // Si no está encriptado, dejarlo como está (datos antiguos o ya desencriptados)
    }
  }

  return decrypted;
}

/**
 * Desencriptar array de empleados
 * @param empleados - Array de empleados con campos encriptados
 * @returns Array de empleados con campos desencriptados
 */
export function decryptEmpleadoList<T extends Partial<Empleado>>(empleados: T[]): T[] {
  return empleados.map((emp) => decryptEmpleadoData(emp));
}

/**
 * Verificar si un campo está encriptado
 * Útil para migración de datos existentes
 */
export function isFieldEncrypted(value: string | null | undefined): boolean {
  if (!value || value.trim() === '') return false;

  // Formato encriptado: salt:iv:authTag:ciphertext (4 partes separadas por :)
  const parts = value.split(':');
  return parts.length === 4;
}

/**
 * Obtener campos sensibles que necesitan encriptación
 * Útil para scripts de migración
 */
export function getSensitiveFields(): readonly SensitiveField[] {
  return SENSITIVE_FIELDS;
}

/**
 * Sanitizar datos de empleado para logs (ocultar campos sensibles)
 * NUNCA loggear datos sensibles sin sanitizar
 */
export function sanitizeEmpleadoForLogs<T extends Partial<Empleado>>(
  empleado: T
): Partial<T> {
  const sanitized: Partial<T> = { ...empleado };

  for (const field of SENSITIVE_FIELDS) {
    if (empleado[field]) {
      sanitized[field] = '[REDACTED]' as T[typeof field];
    }
  }

  // También sanitizar salarios si existen
  if ('salarioBrutoAnual' in sanitized) {
    (sanitized as Partial<Empleado>).salarioBrutoAnual = '[REDACTED]' as unknown as Empleado['salarioBrutoAnual'];
  }
  if ('salarioBrutoMensual' in sanitized) {
    (sanitized as Partial<Empleado>).salarioBrutoMensual = '[REDACTED]' as unknown as Empleado['salarioBrutoMensual'];
  }

  return sanitized;
}






