import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Pure utility — encrypts plain text using AES-256-GCM.
 * Returns a base64 string containing [IV(12b)][Tag(16b)][EncryptedData].
 *
 * @param text Plain text to encrypt.
 * @param key 64-char hex string (32 bytes).
 * @returns Base64 encoded string.
 */
export function encrypt(text: string, key: string): string {
  const iv = randomBytes(IV_LENGTH);
  const keyBuf = Buffer.from(key, "hex");
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Pure utility — decrypts a base64 string created by encrypt().
 * Expects the format [IV(12b)][Tag(16b)][EncryptedData].
 *
 * @param encoded Base64 string previously produced by encrypt().
 * @param key 64-char hex string (32 bytes) used during encryption.
 * @returns Original plain text.
 */
export function decrypt(encoded: string, key: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const keyBuf = Buffer.from(key, "hex");
  const decipher = createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
