/**
 * Tests unitarios para utilidades de encriptación
 * Cobertura: encrypt, decrypt, hash, validación
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encrypt,
  decrypt,
  hashForSearch,
  validateEncryptionSetup,
  generateEncryptionKey,
  encryptFields,
  decryptFields,
} from '../crypto';

// ========================================
// SETUP
// ========================================

const VALID_KEY = 'a'.repeat(64);

beforeEach(() => {
  process.env.ENCRYPTION_KEY = VALID_KEY;
});

afterEach(() => {
  delete process.env.ENCRYPTION_KEY;
});

// ========================================
// validateEncryptionSetup
// ========================================

describe('validateEncryptionSetup', () => {
  it('should validate correct 64-char hex key', () => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
    const result = validateEncryptionSetup();
    expect(result.valid).toBe(true);
  });

  it('should reject missing key', () => {
    delete process.env.ENCRYPTION_KEY;
    const result = validateEncryptionSetup();
    expect(result.valid).toBe(false);
  });

  it('should reject key with wrong length', () => {
    process.env.ENCRYPTION_KEY = 'abc123';
    const result = validateEncryptionSetup();
    expect(result.valid).toBe(false);
  });
});

// ========================================
// generateEncryptionKey
// ========================================

describe('generateEncryptionKey', () => {
  it('should generate 64-char hex key', () => {
    const key = generateEncryptionKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should generate unique keys', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();
    expect(key1).not.toBe(key2);
  });
});

// ========================================
// encrypt & decrypt
// ========================================

describe('encrypt & decrypt', () => {
  it('should encrypt and decrypt text correctly', () => {
    const plaintext = 'Hello, World!';
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should encrypt sensitive data', () => {
    const nif = '12345678Z';
    const encrypted = encrypt(nif);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(nif);
    expect(encrypted).not.toContain(nif);
  });

  it('should produce different ciphertext for same plaintext', () => {
    const plaintext = 'test';
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(plaintext);
    expect(decrypt(encrypted2)).toBe(plaintext);
  });

  it('should reject empty plaintext', () => {
    expect(() => encrypt('')).toThrow();
    expect(() => encrypt('   ')).toThrow();
  });

  it('should reject invalid encrypted format', () => {
    expect(() => decrypt('invalid:format')).toThrow();
  });
});

// ========================================
// hashForSearch
// ========================================

describe('hashForSearch', () => {
  it('should generate consistent hash for same input', () => {
    const nif = '12345678Z';
    const hash1 = hashForSearch(nif);
    const hash2 = hashForSearch(nif);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', () => {
    const hash1 = hashForSearch('12345678Z');
    const hash2 = hashForSearch('87654321X');
    expect(hash1).not.toBe(hash2);
  });

  it('should normalize input', () => {
    const hash1 = hashForSearch('12345678Z');
    const hash2 = hashForSearch('  12345678z  ');
    expect(hash1).toBe(hash2);
  });
});

// ========================================
// encryptFields & decryptFields
// ========================================

describe('encryptFields & decryptFields', () => {
  it('should encrypt specified fields', () => {
    const obj = {
      nombre: 'Juan',
      nif: '12345678Z',
      salario: 50000,
    };

    const encrypted = encryptFields(obj, ['nif']);

    expect(encrypted.nombre).toBe('Juan');
    expect(encrypted.nif).not.toBe('12345678Z');
  });

  it('should decrypt specified fields', () => {
    const obj = {
      nombre: 'Juan',
      nif: '12345678Z',
    };

    const encrypted = encryptFields(obj, ['nif']);
    const decrypted = decryptFields(encrypted, ['nif']);

    expect(decrypted.nif).toBe('12345678Z');
  });
});
