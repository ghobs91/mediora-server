import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: process.env.ENV_FILE });

const envSchema = z.object({
  ENV: z.enum(["development", "production", "test"]).default("production"),

  POSTGRES_HOST: z.string().default("postgres"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().default("bobarr"),
  POSTGRES_USER: z.string().default("bobarr"),
  POSTGRES_PASSWORD: z.string().default("bobarr"),

  REDIS_HOST: z.string().default("redis"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  DEBUG_REDIS: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .default("false"),

  JACKETT_AUTOMATIC_SEARCH_TIMEOUT: z.coerce.number().default(120000),
  JACKETT_MANUAL_SEARCH_TIMEOUT: z.coerce.number().default(15000),
  JACKETT_SEARCH_CONCURRENCY: z.coerce.number().int().positive().default(3),

  LIBRARY_MOVIES_FOLDER_NAME: z.string().default("movies"),
  LIBRARY_TV_SHOWS_FOLDER_NAME: z.string().default("tvshows"),
  LIBRARY_SCAN_CONCURRENCY: z.coerce.number().int().positive().default(4),

  APP_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().default("bobarr"),
});

export const env = envSchema.parse(process.env);
