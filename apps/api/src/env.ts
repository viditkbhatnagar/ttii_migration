import { z } from 'zod';

const booleanFromEnv = z.union([z.boolean(), z.string(), z.number()]).transform((value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
});

const optionalStringFromEnv = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}, z.string().optional());

const optionalUrlFromEnv = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}, z.string().url().optional());

// Render injects PORT; map it to API_PORT so the rest of the app reads one variable.
if (process.env.PORT && !process.env.API_PORT) {
  process.env.API_PORT = process.env.PORT;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  APP_BASE_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().default('mongodb://localhost:27017/ttii_lms'),
  MYSQL_HOST: z.string().default('localhost'),
  MYSQL_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  MYSQL_DATABASE: z.string().default('ttii'),
  MYSQL_USER: z.string().default('ttii'),
  MYSQL_PASSWORD: z.string().default('ttii_dev_password'),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(60).default(3600),
  PASSWORD_RESET_TOKEN_KEY: z.string().min(16).default('ttii-dev-reset-token-key-change-me'),
  PASSWORD_RESET_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).default(1800),
  OTP_SIGNING_KEY: z.string().min(16).default('ttii-dev-otp-signing-key-change-me'),
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  AUTH_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(30).default(900),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  AUTH_OTP_REQUEST_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  AUTH_OTP_VERIFY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),

  EMAIL_PROVIDER: z.enum(['console', 'noop', 'brevo']).default('console'),
  EMAIL_FROM_ADDRESS: z.string().default('noreply@ttii.local'),
  EMAIL_FROM_NAME: z.string().default('TTII'),
  EMAIL_BREVO_API_KEY: optionalStringFromEnv,
  EMAIL_BREVO_BASE_URL: z.string().url().default('https://api.brevo.com/v3'),

  OTP_PROVIDER: z.enum(['console', 'noop', 'http']).default('console'),
  OTP_HTTP_ENDPOINT: optionalUrlFromEnv,
  OTP_HTTP_AUTH_TOKEN: optionalStringFromEnv,
  OTP_HTTP_SENDER_ID: optionalStringFromEnv,
  OTP_HTTP_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),

  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('/tmp/ttii-storage'),
  STORAGE_LOCAL_SIGNING_KEY: z.string().min(16).default('ttii-dev-storage-signing-key'),
  S3_BUCKET: optionalStringFromEnv,
  S3_REGION: z.string().default('ap-south-1'),
  S3_ACCESS_KEY_ID: optionalStringFromEnv,
  S3_SECRET_ACCESS_KEY: optionalStringFromEnv,
  S3_ENDPOINT: optionalUrlFromEnv,
  S3_FORCE_PATH_STYLE: booleanFromEnv.default(true),
  S3_PUBLIC_BASE_URL: optionalUrlFromEnv,

  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay']).default('mock'),
  PAYMENT_RAZORPAY_KEY_ID: optionalStringFromEnv,
  PAYMENT_RAZORPAY_KEY_SECRET: optionalStringFromEnv,
  PAYMENT_RAZORPAY_WEBHOOK_SECRET: optionalStringFromEnv,
  PAYMENT_RAZORPAY_BASE_URL: z.string().url().default('https://api.razorpay.com/v1'),

  ZOOM_PROVIDER: z.enum(['zoom_sdk', 'noop']).default('zoom_sdk'),
  ZOOM_SDK_KEY: z.string().default('ttii-dev-zoom-sdk-key'),
  ZOOM_SDK_SECRET: z.string().min(16).default('ttii-dev-zoom-sdk-secret-change-me'),
  ZOOM_SIGNATURE_TTL_SECONDS: z.coerce.number().int().min(60).default(7200),

  OPENAI_PROVIDER: z.enum(['mock', 'openai']).default('mock'),
  OPENAI_API_KEY: optionalStringFromEnv,
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  OPENAI_DEFAULT_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_TIMEOUT_MS: z.coerce.number().int().min(100).default(15000),
  OPENAI_RETRY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(6).default(3),
  OPENAI_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(25).default(250),
});

export const env = envSchema.parse(process.env);
