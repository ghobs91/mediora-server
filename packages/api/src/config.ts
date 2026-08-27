import { env } from './env';

export const DB_CONFIG = {
  type: 'postgres' as const,
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

export const LIBRARY_CONFIG = {
  moviesFolderName: env.LIBRARY_MOVIES_FOLDER_NAME,
  tvShowsFolderName: env.LIBRARY_TV_SHOWS_FOLDER_NAME,
};
