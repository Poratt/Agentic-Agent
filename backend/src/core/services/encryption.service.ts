import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard: 96 bits
const AUTH_TAG_LENGTH = 16;

// ─── Standalone functions (no DI dependency) ───────────────────────────────
// Used by TypeORM transformers, migration scripts, or any non-DI context.

let _key: Buffer | null = null;

function getKey(): Buffer {
  if (_key) return _key;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required. Generate with: openssl rand -hex 32',
    );
  }
  if (raw.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got ${raw.length} characters.`,
    );
  }
  _key = Buffer.from(raw, 'hex');
  return _key;
}

/**
 * Encrypt plaintext → `iv:authTag:ciphertext` (hex, colon-separated).
 */
export function encryptValue(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt `iv:authTag:ciphertext` → plaintext.
 */
export function decryptValue(encrypted: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':');

  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted format. Expected iv:authTag:ciphertext');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Check if a value looks like it's already encrypted (3 colon-separated hex parts).
 */
export function isEncryptedValue(value: string): boolean {
  if (!value) return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  return parts.every((part) => /^[0-9a-f]+$/i.test(part) && part.length > 0);
}

// ─── Injectable wrapper (for DI contexts) ───────────────────────────────────

/**
 * AES-256-GCM encryption service for sensitive data at rest.
 * Wraps the standalone functions for use in NestJS DI context (services, controllers).
 * For non-DI contexts (TypeORM transformers, migrations), import the standalone
 * functions (encryptValue/decryptValue/isEncryptedValue) directly.
 *
 * Requires ENCRYPTION_KEY env var (64-char hex string = 32 bytes).
 * Generate with: openssl rand -hex 32
 */
@Injectable()
export class EncryptionService {
  encrypt(plaintext: string): string {
    return encryptValue(plaintext);
  }

  decrypt(encrypted: string): string {
    return decryptValue(encrypted);
  }

  isEncrypted(value: string): boolean {
    return isEncryptedValue(value);
  }
}
