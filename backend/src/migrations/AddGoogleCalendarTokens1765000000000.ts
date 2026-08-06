import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `google_calendar_tokens` table used to store per-user Google
 * Calendar OAuth state (encrypted refresh token + short-lived CSRF state).
 *
 * Security context (C4): the Google refresh token must live server-side,
 * keyed by userId, and must never be accepted from or returned to the client.
 *
 * Idempotent: safe to run more than once (CREATE TABLE IF NOT EXISTS).
 */
export class AddGoogleCalendarTokens1765000000000 implements MigrationInterface {
  name = 'AddGoogleCalendarTokens1765000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS google_calendar_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        refreshToken TEXT NULL,
        state VARCHAR(64) NULL,
        stateExpiresAt DATETIME NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY UQ_google_calendar_tokens_userId (userId),
        CONSTRAINT FK_google_calendar_tokens_user
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS google_calendar_tokens`);
  }
}
