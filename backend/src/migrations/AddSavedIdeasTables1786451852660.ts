import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `saved_idea_sessions` and `saved_ideas` tables used to persist
 * business-idea generation runs and their individual ideas.
 *
 * `saved_idea_sessions` holds one row per generation run (domain, model, owner,
 * and nightly/unread flags). `saved_ideas` holds one immutable snapshot row per
 * produced idea, cascade-deleted with its parent session.
 *
 * Idempotent: safe to run more than once (CREATE TABLE IF NOT EXISTS).
 */
export class AddSavedIdeasTables1786451852660 implements MigrationInterface {
  name = 'AddSavedIdeasTables1786451852660';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saved_idea_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        domain VARCHAR(500) NOT NULL,
        provider VARCHAR(100) NULL,
        model VARCHAR(100) NULL,
        nightly TINYINT(1) NOT NULL DEFAULT 0,
        unread TINYINT(1) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX IDX_saved_idea_sessions_userId_createdAt (userId, createdAt),
        CONSTRAINT FK_saved_idea_sessions_user
          FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS saved_ideas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        sessionId INT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        targetMarket TEXT NOT NULL,
        validationScore INT NOT NULL,
        validationReason TEXT NULL,
        risks JSON NULL,
        competitors JSON NULL,
        nextSteps JSON NULL,
        signalsReferenced JSON NULL,
        groundedInSignals TINYINT(1) NOT NULL DEFAULT 0,
        isFavorite TINYINT(1) NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX IDX_saved_ideas_sessionId (sessionId),
        CONSTRAINT FK_saved_ideas_session
          FOREIGN KEY (sessionId) REFERENCES saved_idea_sessions (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS saved_ideas`);
    await queryRunner.query(`DROP TABLE IF EXISTS saved_idea_sessions`);
  }
}
