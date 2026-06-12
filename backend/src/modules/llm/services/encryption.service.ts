import { Injectable } from "@nestjs/common";
import { encrypt, decrypt } from "../../../core/utils/encryption.util";

/**
 * Fail-fast service that owns the ENCRYPTION_KEY lifecycle and exposes
 * the AES-256-GCM encrypt/decrypt helpers from `core/utils/encryption.util.ts`.
 *
 * Construction is intentionally synchronous: if the env var is missing or
 * malformed, the app fails to start instead of silently dropping secrets.
 */
@Injectable()
export class EncryptionService {
  private readonly key: string;

  constructor() {
    const keyEnv = process.env.ENCRYPTION_KEY;
    if (!keyEnv) {
      throw new Error(
        "ENCRYPTION_KEY env var is required for LLM provider API key encryption. " +
          'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      );
    }
    if (!/^[a-f0-9]{64}$/.test(keyEnv)) {
      throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
    }
    this.key = keyEnv;
  }

  /**
   * Encrypts plain text using the configured ENCRYPTION_KEY.
   */
  encrypt(plainText: string): string {
    return encrypt(plainText, this.key);
  }

  /**
   * Decrypts a base64 payload produced by `encrypt()` using the same key.
   */
  decrypt(encoded: string): string {
    return decrypt(encoded, this.key);
  }
}
