// ========================================
// Encryption Utilities
// ========================================
// AES-256-GCM encryption for sensitive data (IBAN, NIF, NSS, salarios)

import crypto from 'crypto';

// Configuración de encriptación
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits para GCM
const AUTH_TAG_LENGTH = 16; // 128 bits auth tag
const SALT_LENGTH = 32; // 256 bits salt para derivación de key

/**
 * Obtener encryption key desde variable de entorno
 * CRITICAL: Esta key debe ser única por empresa y almacenarse de forma segura
 * En producción: usar AWS Secrets Manager o similar
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY no configurada en variables de entorno');
  }
  if (key.length !== 64) {
    // 64 caracteres hex = 256 bits
    throw new Error('ENCRYPTION_KEY debe ser de 64 caracteres hexadecimales (256 bits)');
  }
  return key;
}

/**
 * Derivar key de encriptación usando PBKDF2
 * Añade salt aleatorio para cada encriptación
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Encriptar datos sensibles con AES-256-GCM
 * @param plaintext - Texto plano a encriptar
 * @returns String en formato: salt:iv:authTag:ciphertext (todo en base64)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.trim() === '') {
    throw new Error('No se puede encriptar texto vacío');
  }

  try {
    // Generar salt e IV aleatorios
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derivar key desde ENCRYPTION_KEY + salt
    const masterKey = getEncryptionKey();
    const key = deriveKey(masterKey, salt);

    // Crear cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encriptar
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Obtener auth tag (integridad)
    const authTag = cipher.getAuthTag();

    // Formato: salt:iv:authTag:ciphertext (todo en base64)
    return [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext,
    ].join(':');
  } catch (error) {
    console.error('[Crypto] Error encriptando:', error);
    throw new Error('Error al encriptar datos sensibles');
  }
}

/**
 * Desencriptar datos sensibles con AES-256-GCM
 * @param encryptedData - String en formato salt:iv:authTag:ciphertext
 * @returns Texto plano desencriptado
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData || encryptedData.trim() === '') {
    throw new Error('No se puede desencriptar texto vacío');
  }

  try {
    // Parsear componentes
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Formato de datos encriptados inválido');
    }

    const [saltB64, ivB64, authTagB64, ciphertext] = parts;

    // Convertir de base64 a Buffer
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    // Derivar key desde ENCRYPTION_KEY + salt
    const masterKey = getEncryptionKey();
    const key = deriveKey(masterKey, salt);

    // Crear decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Desencriptar
    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    console.error('[Crypto] Error desencriptando:', error);
    throw new Error('Error al desencriptar datos sensibles');
  }
}

/**
 * Hash one-way para búsquedas (sin posibilidad de desencriptar)
 * Útil para buscar por NIF sin revelar el NIF completo
 */
export function hashForSearch(plaintext: string): string {
  const masterKey = getEncryptionKey();
  return crypto
    .createHmac('sha256', masterKey)
    .update(plaintext.toLowerCase().trim())
    .digest('hex');
}

/**
 * Validar que ENCRYPTION_KEY está configurada correctamente
 * Llamar al inicio de la app
 */
export function validateEncryptionSetup(): { valid: boolean; error?: string } {
  try {
    const key = process.env.ENCRYPTION_KEY;

    if (!key) {
      return { valid: false, error: 'ENCRYPTION_KEY no configurada' };
    }

    if (key.length !== 64) {
      return {
        valid: false,
        error: 'ENCRYPTION_KEY debe ser de 64 caracteres hexadecimales',
      };
    }

    // Verificar que es hex válido
    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      return {
        valid: false,
        error: 'ENCRYPTION_KEY debe contener solo caracteres hexadecimales',
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Error validando configuración de encriptación' };
  }
}

/**
 * Generar nueva ENCRYPTION_KEY
 * SOLO usar una vez por empresa, guardar de forma segura
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encriptar múltiples campos de un objeto
 * Útil para encriptar datos de empleado en batch
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const encrypted = { ...obj };

  for (const field of fieldsToEncrypt) {
    const value = obj[field];
    if (value !== null && value !== undefined && value !== '') {
      encrypted[field] = encrypt(String(value)) as any;
    }
  }

  return encrypted;
}

/**
 * Desencriptar múltiples campos de un objeto
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const decrypted = { ...obj };

  for (const field of fieldsToDecrypt) {
    const value = obj[field];
    if (value !== null && value !== undefined && value !== '') {
      try {
        decrypted[field] = decrypt(String(value)) as any;
      } catch (error) {
        console.error(`[Crypto] Error desencriptando campo ${String(field)}:`, error);
        // Mantener valor encriptado si falla desencriptación
      }
    }
  }

  return decrypted;
}








