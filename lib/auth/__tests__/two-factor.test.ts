/**
 * Tests para funciones de autenticación de dos factores
 */

import { describe, it, expect } from 'vitest';
import {
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
} from '@/lib/auth/two-factor';

describe('Two-Factor Authentication', () => {
  describe('generateBackupCodes', () => {
    it('should generate requested number of codes', () => {
      const codes = generateBackupCodes(8);

      expect(codes).toHaveLength(8);
    });

    it('should generate codes with correct format', () => {
      const codes = generateBackupCodes(10);

      codes.forEach(code => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[0-9A-F]+$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes(10);
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(10);
    });

    it('should generate different codes on each call', () => {
      const codes1 = generateBackupCodes(5);
      const codes2 = generateBackupCodes(5);

      expect(codes1).not.toEqual(codes2);
    });
  });

  describe('hashBackupCodes', () => {
    it('should hash all backup codes', () => {
      const codes = ['AAAA1111', 'BBBB2222', 'CCCC3333'];
      const hashed = hashBackupCodes(codes);

      expect(hashed).toHaveLength(3);
      hashed.forEach(hash => {
        expect(hash).not.toEqual(codes[0]);
        expect(hash).not.toEqual(codes[1]);
        expect(hash).not.toEqual(codes[2]);
        expect(hash.length).toBeGreaterThan(16);
      });
    });
  });

  describe('verifyBackupCode', () => {
    it('should verify valid backup code and remove it', () => {
      const codes = ['AAAA1111', 'BBBB2222'];
      const hashed = hashBackupCodes(codes);

      const result = verifyBackupCode(hashed, 'AAAA1111');

      expect(result.valid).toBe(true);
      expect(result.remaining).toHaveLength(1);
    });

    it('should be case-insensitive', () => {
      const codes = ['AAAA1111', 'BBBB2222'];
      const hashed = hashBackupCodes(codes);

      const result = verifyBackupCode(hashed, 'aaaa1111');

      expect(result.valid).toBe(true);
      expect(result.remaining).toHaveLength(1);
    });

    it('should reject invalid codes', () => {
      const codes = ['AAAA1111', 'BBBB2222'];
      const hashed = hashBackupCodes(codes);

      const result = verifyBackupCode(hashed, 'INVALID1');

      expect(result.valid).toBe(false);
      expect(result.remaining).toEqual(hashed);
    });

    it('should handle empty code list', () => {
      const result = verifyBackupCode([], 'AAAA1111');

      expect(result.valid).toBe(false);
      expect(result.remaining).toEqual([]);
    });

    it('should allow using all codes sequentially', () => {
      const codes = ['AAAA1111', 'BBBB2222', 'CCCC3333'];
      let hashed = hashBackupCodes(codes);

      const first = verifyBackupCode(hashed, 'AAAA1111');
      expect(first.valid).toBe(true);
      expect(first.remaining).toHaveLength(2);

      const second = verifyBackupCode(first.remaining, 'BBBB2222');
      expect(second.valid).toBe(true);
      expect(second.remaining).toHaveLength(1);

      const third = verifyBackupCode(second.remaining, 'CCCC3333');
      expect(third.valid).toBe(true);
      expect(third.remaining).toHaveLength(0);

      // After all codes used
      const afterAll = verifyBackupCode(third.remaining, 'AAAA1111');
      expect(afterAll.valid).toBe(false);
    });
  });
});
