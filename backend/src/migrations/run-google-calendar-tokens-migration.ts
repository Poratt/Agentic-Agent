/**
 * Runner script for the Google Calendar tokens table migration.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/migrations/run-google-calendar-tokens-migration.ts
 *
 * Creates the `google_calendar_tokens` table used to store per-user Google
 * Calendar OAuth state (encrypted refresh token + short-lived CSRF state).
 * Idempotent — safe to run more than once.
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AddGoogleCalendarTokens1765000000000 } from './AddGoogleCalendarTokens1765000000000';

config();

async function main() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'my_app',
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const migration = new AddGoogleCalendarTokens1765000000000();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    console.log('--- Running migration: up() ---');
    await migration.up(queryRunner);

    console.log('');
    console.log('✅ Migration completed successfully');

    // Verify table shape
    const columns = await queryRunner.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'google_calendar_tokens' ORDER BY ORDINAL_POSITION`,
    );
    console.log('--- Verification: google_calendar_tokens columns ---');
    for (const col of columns) {
      console.log(`  ${col.COLUMN_NAME} ${col.DATA_TYPE} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }

    await queryRunner.release();
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();
