import { Client } from 'pg';
import { Logger } from 'winston';

import { DB_CONFIG } from './config';
import { BASELINE_MIGRATION } from './migrations-meta';

// existing installs predate the migrations setup: their schema was
// created by synchronize. mark the baseline migration as executed
// so migrationsRun does not try to recreate their tables.
export async function markBaselineMigrationIfNeeded(logger: Logger) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const client = new Client({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.username,
      password: DB_CONFIG.password,
      database: DB_CONFIG.database,
    });

    try {
      await client.connect();

      const schemaExists = await client
        .query("SELECT to_regclass('public.movie') AS table_exists")
        .then(({ rows }) => Boolean(rows[0]?.table_exists));

      await client.query(
        'CREATE TABLE IF NOT EXISTS migrations (id SERIAL NOT NULL, "timestamp" bigint NOT NULL, name character varying NOT NULL, CONSTRAINT "PK_migrations" PRIMARY KEY ("id"))'
      );

      const { rowCount } = await client.query('SELECT 1 FROM migrations LIMIT 1');

      if (schemaExists && rowCount === 0) {
        await client.query(
          'INSERT INTO migrations ("timestamp", name) VALUES ($1, $2)',
          [BASELINE_MIGRATION.timestamp, BASELINE_MIGRATION.name]
        );
        logger.info(
          'marked baseline migration as executed for existing database'
        );
      }

      return;
    } catch (error) {
      if (attempt === 10) {
        logger.warn('could not prepare database migrations', {
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      logger.info(
        `waiting for database before preparing migrations (attempt ${attempt})`
      );
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } finally {
      try {
        await client.end();
      } catch {
        // client may not be connected
      }
    }
  }
}
