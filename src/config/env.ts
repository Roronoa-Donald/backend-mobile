import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().min(1)),
  JWT_SECRET: z.string().min(10),
  PORT: z.string().default('3000'),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variables d\'environnement invalides:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
