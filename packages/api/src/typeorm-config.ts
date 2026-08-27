import { DataSource } from 'typeorm';
import { env } from './env';

const dataSource = new DataSource({
  type: 'postgres',
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  entities: ['src/entities/**/*.entity.ts'],
  migrations: ['src/migrations/**/*.ts'],
});

export default dataSource;