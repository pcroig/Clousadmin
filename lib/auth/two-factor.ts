import { createHash, randomBytes } from 'crypto';

import { authenticator } from 'otplib';
import QRCode from 'qrcode';

import { decrypt, encrypt } from '@/lib/crypto';

authenticator.options = {
  step: 30,
  digits: 6,
  window: 1,
};

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function getTotpUri(email: string, secret: string): string {
  return authenticator.keyuri(email, 'Clousadmin', secret);
}

export async function generateTotpQrData(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, { margin: 1 });
}

export function encryptTotpSecret(secret: string): string {
  return encrypt(secret);
}

export function decryptTotpSecret(encryptedSecret: string): string {
  return decrypt(encryptedSecret);
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const normalizedCode = code.replace(/\s+/g, '');
  return authenticator.check(normalizedCode, secret);
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }).map(() =>
    randomBytes(4)
      .toString('hex')
      .toUpperCase()
  );
}

export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(hashBackupCode);
}

export function verifyBackupCode(
  hashedCodes: string[] | null,
  input: string
): { valid: boolean; remaining: string[] } {
  if (!hashedCodes || hashedCodes.length === 0) {
    return { valid: false, remaining: [] };
  }

  const normalizedInput = input.replace(/\s+/g, '').toUpperCase();
  const hashedInput = hashBackupCode(normalizedInput);

  const remaining = hashedCodes.filter((code) => code !== hashedInput);
  const valid = remaining.length !== hashedCodes.length;

  return { valid, remaining };
}

