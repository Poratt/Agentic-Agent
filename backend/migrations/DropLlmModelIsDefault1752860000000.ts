import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropLlmModelIsDefault1752860000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE llm_models DROP COLUMN is_default;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE llm_models ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0;
    `);
  }
}
