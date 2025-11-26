/**
 * Tests de integración: Encriptación de datos de empleados
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { decrypt, decryptFields, encrypt, encryptFields, hashForSearch } from '@/lib/crypto';
import {
  decryptEmpleadoData,
  encryptEmpleadoData,
  isFieldEncrypted,
} from '@/lib/empleado-crypto';

describe('Empleados Crypto Integration', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  it('should encrypt and search employee by NIF without exposing it', () => {
    const nif = '12345678Z';
    
    // Encriptar para almacenar
    const nifEncriptado = encrypt(nif);
    
    // Hash para búsqueda
    const nifHash = hashForSearch(nif);
    
    // Simular BD: guardar ambos
    const empleadoEnBD = {
      id: '1',
      nombre: 'Juan',
      nif: nifEncriptado,
      nifHash: nifHash,
    };
    
    // Buscar por NIF
    const nifBusqueda = '12345678Z';
    const hashBusqueda = hashForSearch(nifBusqueda);
    
    expect(empleadoEnBD.nifHash).toBe(hashBusqueda);
    expect(decrypt(empleadoEnBD.nif)).toBe(nif);
  });

  it('should handle batch encryption of employee sensitive data', () => {
    const empleado = {
      nombre: 'María',
      apellidos: 'García',
      nif: '87654321X',
      iban: 'ES9121000418450200051332',
      nss: '123456789012',
      salario: 45000,
    };

    // Encriptar campos sensibles
    const encrypted = encryptFields(empleado, ['nif', 'iban', 'nss']);

    // Verificar que están encriptados
    expect(encrypted.nif).not.toBe(empleado.nif);
    expect(encrypted.iban).not.toBe(empleado.iban);
    expect(encrypted.nss).not.toBe(empleado.nss);
    
    // Campos no sensibles sin cambios
    expect(encrypted.nombre).toBe('María');
    expect(encrypted.salario).toBe(45000);

    // Desencriptar
    const decrypted = decryptFields(encrypted, ['nif', 'iban', 'nss']);
    
    expect(decrypted.nif).toBe('87654321X');
    expect(decrypted.iban).toBe('ES9121000418450200051332');
    expect(decrypted.nss).toBe('123456789012');
  });

  it('should normalize search for case-insensitive NIF matching', () => {
    const hash1 = hashForSearch('12345678Z');
    const hash2 = hashForSearch('12345678z');
    const hash3 = hashForSearch('  12345678Z  ');

    // Todos deben generar el mismo hash
    expect(hash1).toBe(hash2);
    expect(hash1).toBe(hash3);
  });

  describe('encryptEmpleadoData & decryptEmpleadoData', () => {
    it('should encrypt and decrypt employee sensitive fields', () => {
      const original = {
        iban: 'ES7921000813610123456789',
        nif: '12345678Z',
        nss: '12/12345678/12',
      };

      const encrypted = encryptEmpleadoData(original);

      // Verify fields are encrypted
      expect(isFieldEncrypted(encrypted.iban!)).toBe(true);
      expect(isFieldEncrypted(encrypted.nif!)).toBe(true);
      expect(isFieldEncrypted(encrypted.nss!)).toBe(true);

      // Decrypt and verify
      const decrypted = decryptEmpleadoData(encrypted);
      expect(decrypted.iban).toBe(original.iban);
      expect(decrypted.nif).toBe(original.nif);
      expect(decrypted.nss).toBe(original.nss);
    });

    it('should not modify empty or null fields', () => {
      const encrypted = encryptEmpleadoData({
        iban: '',
        nif: null,
        nss: undefined,
      });

      expect(encrypted.iban).toBe('');
      expect(encrypted.nif).toBe(null);
      expect(encrypted.nss).toBe(undefined);
    });
  });

  describe('isFieldEncrypted', () => {
    it('should detect encrypted fields', () => {
      const plaintext = 'Hello World';
      const encrypted = encrypt(plaintext);

      expect(isFieldEncrypted(encrypted)).toBe(true);
      expect(isFieldEncrypted(plaintext)).toBe(false);
    });

    it('should return false for empty or null values', () => {
      expect(isFieldEncrypted('')).toBe(false);
      expect(isFieldEncrypted(null)).toBe(false);
      expect(isFieldEncrypted(undefined)).toBe(false);
    });
  });
});
