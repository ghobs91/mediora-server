import { env } from "./env";

export { env };

export const DB_CONFIG = {
  type: "postgres" as const,
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  entities: [`${__dirname}/entities/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
  migrationsRun: true,
  synchronize: false,
};

export const DEBUG_REDIS = env.DEBUG_REDIS;
export const REDIS_CONFIG = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
};

export const JACKETT_RESPONSE_TIMEOUT = {
  automatic: env.JACKETT_AUTOMATIC_SEARCH_TIMEOUT,
  manual: env.JACKETT_MANUAL_SEARCH_TIMEOUT,
};

export const JACKETT_SEARCH_CONCURRENCY = env.JACKETT_SEARCH_CONCURRENCY;

export const LIBRARY_ROOT = "/usr/library";
export const LIBRARY_CONFIG = {
  scanConcurrency: env.LIBRARY_SCAN_CONCURRENCY,
};

export function getInitialMediaMountPaths(): string[] {
  if (!env.MEDIA_MOUNTS) return [LIBRARY_ROOT];
  return env.MEDIA_MOUNTS.split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}
