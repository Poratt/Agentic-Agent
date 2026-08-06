import { MigrationInterface, QueryRunner } from 'typeorm';
import { encryptValue, decryptValue, isEncryptedValue } from '../core/services/encryption.service';

/**
 * Encrypt all existing plaintext apiKey values in llm_providers using AES-256-GCM.
 *
 * Idempotent: rows already encrypted (iv:tag:cipher format) are skipped.
 * apiKey IS NULL rows are skipped.
 *
 * IMPORTANT: Run mysqldump BACKUP before running this migration.
 * If ENCRYPTION_KEY is missing/wrong, the migration will throw before writing.
 */
export class EncryptLlmProviderApiKeys1754534400000 implements MigrationInterface {
  name = 'EncryptLlmProviderApiKeys1754534400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 0. Expand column to TEXT (encrypted values are longer than varchar(255))
    console.log(`[Migration] Expanding apiKey column to TEXT...`);
    await queryRunner.query(`ALTER TABLE llm_providers MODIFY COLUMN apiKey TEXT NULL`);
    console.log(`[Migration] Column expanded successfully`);

    // 1. Read all rows with non-null apiKey
    const rows: Array<{ id: number; apiKey: string }> = await queryRunner.query(
      `SELECT id, apiKey FROM llm_providers WHERE apiKey IS NOT NULL`,
    );

    const errors: Array<{ id: number; error: string }> = [];

    console.log(`[Migration] Found ${rows.length} rows with apiKey to check`);

    // 2. Classify each row
    const toEncrypt: Array<{ id: number; apiKey: string }> = [];
    const alreadyEncrypted: number[] = [];
    const skippedNull: number[] = [];

    for (const row of rows) {
      if (isEncryptedValue(row.apiKey)) {
        alreadyEncrypted.push(row.id);
      } else if (!row.apiKey || row.apiKey.trim() === '') {
        skippedNull.push(row.id);
      } else {
        toEncrypt.push(row);
      }
    }

    console.log(`[Migration] Summary:`);
    console.log(`  - Already encrypted (skipped): ${alreadyEncrypted.length > 0 ? alreadyEncrypted.join(', ') : 'none'}`);
    console.log(`  - Empty/null apiKey (skipped): ${skippedNull.length > 0 ? skippedNull.join(', ') : 'none'}`);
    console.log(`  - Plaintext to encrypt: ${toEncrypt.length} rows ${toEncrypt.length > 0 ? `(${toEncrypt.map((r) => r.id).join(', ')})` : '(none)'}`);

    if (toEncrypt.length === 0) {
      console.log(`[Migration] Nothing to encrypt. Done.`);
      return;
    }

    console.log(`[Migration] Encrypting ${toEncrypt.length} rows...`);

    // 3. Encrypt in a single transaction
    await queryRunner.startTransaction();

    try {
      for (const row of toEncrypt) {
        try {
          const encrypted = encryptValue(row.apiKey);
          await queryRunner.query(
            `UPDATE llm_providers SET apiKey = ? WHERE id = ?`,
            [encrypted, row.id],
          );
          console.log(`  ✅ id=${row.id} encrypted successfully`);
        } catch (err: any) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`  ❌ id=${row.id} FAILED: ${errorMsg}`);
          errors.push({ id: row.id, error: errorMsg });
        }
      }

      if (errors.length > 0) {
        // Roll back — partial encryption is worse than no encryption
        await queryRunner.rollbackTransaction();
        console.error(`[Migration] ROLLED BACK — ${errors.length} row(s) failed:`);
        for (const e of errors) {
          console.error(`  id=${e.id}: ${e.error}`);
        }
        throw new Error(
          `Migration failed: ${errors.length} row(s) could not be encrypted. ` +
          `Fix the issues and re-run. All changes have been rolled back.`,
        );
      }

      await queryRunner.commitTransaction();
      console.log(`[Migration] Committed. ${toEncrypt.length} row(s) encrypted.`);
    } catch (err) {
      // If we already rolled back above, re-throw as-is
      if (errors.length > 0) throw err;
      // Otherwise, rollback and re-throw
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Revert column back to varchar(255) after decryption
    console.log(`[Migration:down] Reverting apiKey column to varchar(255)...`);
    await queryRunner.query(`ALTER TABLE llm_providers MODIFY COLUMN apiKey VARCHAR(255) NULL`);

    const rows: Array<{ id: number; apiKey: string }> = await queryRunner.query(
      `SELECT id, apiKey FROM llm_providers WHERE apiKey IS NOT NULL`,
    );

    const errors: Array<{ id: number; error: string }> = [];

    console.log(`[Migration:down] Found ${rows.length} rows with apiKey to check`);

    const toDecrypt: Array<{ id: number; apiKey: string }> = [];

    for (const row of rows) {
      if (isEncryptedValue(row.apiKey)) {
        toDecrypt.push(row);
      }
    }

    console.log(`[Migration:down] ${toDecrypt.length} encrypted row(s) to decrypt`);

    if (toDecrypt.length === 0) {
      console.log(`[Migration:down] Nothing to decrypt. Done.`);
      return;
    }

    await queryRunner.startTransaction();

    try {
      for (const row of toDecrypt) {
        try {
          const plaintext = decryptValue(row.apiKey);
          await queryRunner.query(
            `UPDATE llm_providers SET apiKey = ? WHERE id = ?`,
            [plaintext, row.id],
          );
          console.log(`  ✅ id=${row.id} decrypted successfully`);
        } catch (err: any) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error(`  ❌ id=${row.id} FAILED: ${errorMsg}`);
          errors.push({ id: row.id, error: errorMsg });
        }
      }

      if (errors.length > 0) {
        await queryRunner.rollbackTransaction();
        console.error(`[Migration:down] ROLLED BACK — ${errors.length} row(s) failed:`);
        for (const e of errors) {
          console.error(`  id=${e.id}: ${e.error}`);
        }
        throw new Error(
          `Down migration failed: ${errors.length} row(s) could not be decrypted.`,
        );
      }

      await queryRunner.commitTransaction();
      console.log(`[Migration:down] Committed. ${toDecrypt.length} row(s) decrypted.`);
    } catch (err) {
      if (errors.length > 0) throw err;
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }
}
