import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  MYSQL_DATABASE: z.string().default('ttii'),
  MYSQL_USER: z.string().default('ttii'),
  MYSQL_PASSWORD: z.string().default('ttii_dev_password'),
});

export const env = envSchema.parse(process.env);
