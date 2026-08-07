/**
 * One-time runner script for the apiKey encryption migration.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/migrations/run-encryption-migration.ts
 *
 * Prerequisites:
 * 1. ENCRYPTION_KEY must be set in .env (64 hex chars)
 * 2. DB must be running and accessible
 * 3. BACKUP must be verified (mysqldump)
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { EncryptLlmProviderApiKeys1754534400000 } from './EncryptLlmProviderApiKeys1754534400000';

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

    const migration = new EncryptLlmProviderApiKeys1754534400000();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    console.log('--- Running migration: up() ---');
    await migration.up(queryRunner);

    console.log('');
    console.log('✅ Migration completed successfully');

    // Verify: show all apiKey values
    const rows = await queryRunner.query('SELECT id, apiKey FROM llm_providers');
    console.log('');
    console.log('--- Verification: SELECT id, apiKey FROM llm_providers ---');
    for (const row of rows) {
      const preview = row.apiKey
        ? row.apiKey.substring(0, 20) + (row.apiKey.length > 20 ? '...' : '')
        : 'NULL';
      console.log(`  id=${row.id} apiKey=${preview}`);
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
