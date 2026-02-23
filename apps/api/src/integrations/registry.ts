import { env } from '../env.js';
import type { IntegrationLogger, IntegrationRegistry } from './contracts.js';
import { BrevoEmailProvider, ConsoleEmailProvider, NoopEmailProvider } from './email-provider.js';
import { createConsoleIntegrationLogger } from './logger.js';
import { MockOpenAiProvider, OpenAiHttpProvider } from './openai-provider.js';
import { ConsoleOtpProvider, HttpOtpProvider, NoopOtpProvider } from './otp-provider.js';
import { MockPaymentGateway, RazorpayPaymentGateway } from './payment-gateway.js';
import { LocalStorageProvider, S3StorageProvider } from './storage-provider.js';
import { NoopZoomProvider, ZoomSdkProvider } from './zoom-provider.js';

export interface IntegrationRuntimeConfig {
  emailProvider: 'console' | 'noop' | 'brevo';
  emailFromAddress: string;
  emailFromName: string;
  emailBrevoApiKey: string | undefined;
  emailBrevoBaseUrl: string;

  otpProvider: 'console' | 'noop' | 'http';
  otpHttpEndpoint: string | undefined;
  otpHttpAuthToken: string | undefined;
  otpHttpSenderId: string | undefined;
  otpHttpTimeoutMs: number;

  storageProvider: 'local' | 's3';
  localStorageRoot: string;
  localStorageSigningKey: string;
  s3Bucket: string | undefined;
  s3Region: string;
  s3AccessKeyId: string | undefined;
  s3SecretAccessKey: string | undefined;
  s3Endpoint: string | undefined;
  s3ForcePathStyle: boolean;
  s3PublicBaseUrl: string | undefined;

  paymentProvider: 'mock' | 'razorpay';
  paymentRazorpayKeyId: string | undefined;
  paymentRazorpayKeySecret: string | undefined;
  paymentRazorpayWebhookSecret: string | undefined;
  paymentRazorpayBaseUrl: string;

  zoomProvider: 'zoom_sdk' | 'noop';
  zoomSdkKey: string;
  zoomSdkSecret: string;
  zoomSignatureTtlSeconds: number;

  openAiProvider: 'mock' | 'openai';
  openAiApiKey: string | undefined;
  openAiBaseUrl: string;
  openAiDefaultModel: string;
  openAiTimeoutMs: number;
  openAiMaxAttempts: number;
  openAiBaseDelayMs: number;
}

function requiredValue(value: string | undefined, key: string): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }

  throw new Error(`Missing required integration configuration: ${key}`);
}

function fromEnv(): IntegrationRuntimeConfig {
  return {
    emailProvider: env.EMAIL_PROVIDER,
    emailFromAddress: env.EMAIL_FROM_ADDRESS,
    emailFromName: env.EMAIL_FROM_NAME,
    emailBrevoApiKey: env.EMAIL_BREVO_API_KEY,
    emailBrevoBaseUrl: env.EMAIL_BREVO_BASE_URL,

    otpProvider: env.OTP_PROVIDER,
    otpHttpEndpoint: env.OTP_HTTP_ENDPOINT,
    otpHttpAuthToken: env.OTP_HTTP_AUTH_TOKEN,
    otpHttpSenderId: env.OTP_HTTP_SENDER_ID,
    otpHttpTimeoutMs: env.OTP_HTTP_TIMEOUT_MS,

    storageProvider: env.STORAGE_PROVIDER,
    localStorageRoot: env.STORAGE_LOCAL_ROOT,
    localStorageSigningKey: env.STORAGE_LOCAL_SIGNING_KEY,
    s3Bucket: env.S3_BUCKET,
    s3Region: env.S3_REGION,
    s3AccessKeyId: env.S3_ACCESS_KEY_ID,
    s3SecretAccessKey: env.S3_SECRET_ACCESS_KEY,
    s3Endpoint: env.S3_ENDPOINT,
    s3ForcePathStyle: env.S3_FORCE_PATH_STYLE,
    s3PublicBaseUrl: env.S3_PUBLIC_BASE_URL,

    paymentProvider: env.PAYMENT_PROVIDER,
    paymentRazorpayKeyId: env.PAYMENT_RAZORPAY_KEY_ID,
    paymentRazorpayKeySecret: env.PAYMENT_RAZORPAY_KEY_SECRET,
    paymentRazorpayWebhookSecret: env.PAYMENT_RAZORPAY_WEBHOOK_SECRET,
    paymentRazorpayBaseUrl: env.PAYMENT_RAZORPAY_BASE_URL,

    zoomProvider: env.ZOOM_PROVIDER,
    zoomSdkKey: env.ZOOM_SDK_KEY,
    zoomSdkSecret: env.ZOOM_SDK_SECRET,
    zoomSignatureTtlSeconds: env.ZOOM_SIGNATURE_TTL_SECONDS,

    openAiProvider: env.OPENAI_PROVIDER,
    openAiApiKey: env.OPENAI_API_KEY,
    openAiBaseUrl: env.OPENAI_BASE_URL,
    openAiDefaultModel: env.OPENAI_DEFAULT_MODEL,
    openAiTimeoutMs: env.OPENAI_TIMEOUT_MS,
    openAiMaxAttempts: env.OPENAI_RETRY_MAX_ATTEMPTS,
    openAiBaseDelayMs: env.OPENAI_RETRY_BASE_DELAY_MS,
  };
}

export interface CreateIntegrationRegistryOptions {
  logger?: IntegrationLogger;
  fetchImpl?: typeof fetch;
  runtimeConfig?: Partial<IntegrationRuntimeConfig>;
}

export function createIntegrationRegistry(options: CreateIntegrationRegistryOptions = {}): IntegrationRegistry {
  const logger = options.logger ?? createConsoleIntegrationLogger();
  const fetchImpl = options.fetchImpl ?? fetch;
  const runtime: IntegrationRuntimeConfig = {
    ...fromEnv(),
    ...options.runtimeConfig,
  };

  const email = (() => {
    if (runtime.emailProvider === 'noop') {
      return new NoopEmailProvider();
    }

    if (runtime.emailProvider === 'brevo') {
      return new BrevoEmailProvider(
        {
          apiKey: requiredValue(runtime.emailBrevoApiKey, 'EMAIL_BREVO_API_KEY'),
          fromAddress: runtime.emailFromAddress,
          fromName: runtime.emailFromName,
          apiBaseUrl: runtime.emailBrevoBaseUrl,
        },
        logger,
        fetchImpl,
      );
    }

    return new ConsoleEmailProvider(logger);
  })();

  const otp = (() => {
    if (runtime.otpProvider === 'noop') {
      return new NoopOtpProvider();
    }

    if (runtime.otpProvider === 'http') {
      return new HttpOtpProvider(
        {
          endpoint: requiredValue(runtime.otpHttpEndpoint, 'OTP_HTTP_ENDPOINT'),
          authToken: runtime.otpHttpAuthToken,
          senderId: runtime.otpHttpSenderId,
          timeoutMs: runtime.otpHttpTimeoutMs,
        },
        logger,
        fetchImpl,
      );
    }

    return new ConsoleOtpProvider(logger);
  })();

  const storage = (() => {
    if (runtime.storageProvider === 's3') {
      return new S3StorageProvider(
        {
          bucket: requiredValue(runtime.s3Bucket, 'S3_BUCKET'),
          region: runtime.s3Region,
          accessKeyId: requiredValue(runtime.s3AccessKeyId, 'S3_ACCESS_KEY_ID'),
          secretAccessKey: requiredValue(runtime.s3SecretAccessKey, 'S3_SECRET_ACCESS_KEY'),
          endpoint: runtime.s3Endpoint,
          forcePathStyle: runtime.s3ForcePathStyle,
          publicBaseUrl: runtime.s3PublicBaseUrl,
        },
        logger,
        fetchImpl,
      );
    }

    return new LocalStorageProvider(runtime.localStorageRoot, runtime.localStorageSigningKey, logger);
  })();

  const payment = (() => {
    if (runtime.paymentProvider === 'razorpay') {
      return new RazorpayPaymentGateway(
        {
          apiKeyId: requiredValue(runtime.paymentRazorpayKeyId, 'PAYMENT_RAZORPAY_KEY_ID'),
          apiKeySecret: requiredValue(runtime.paymentRazorpayKeySecret, 'PAYMENT_RAZORPAY_KEY_SECRET'),
          webhookSecret: runtime.paymentRazorpayWebhookSecret,
          apiBaseUrl: runtime.paymentRazorpayBaseUrl,
        },
        logger,
        fetchImpl,
      );
    }

    return new MockPaymentGateway();
  })();

  const zoom =
    runtime.zoomProvider === 'noop'
      ? new NoopZoomProvider()
      : new ZoomSdkProvider({
          sdkKey: runtime.zoomSdkKey,
          sdkSecret: runtime.zoomSdkSecret,
          signatureTtlSeconds: runtime.zoomSignatureTtlSeconds,
        });

  const openai =
    runtime.openAiProvider === 'openai'
      ? new OpenAiHttpProvider(
          {
            apiKey: requiredValue(runtime.openAiApiKey, 'OPENAI_API_KEY'),
            baseUrl: runtime.openAiBaseUrl,
            defaultModel: runtime.openAiDefaultModel,
            timeoutMs: runtime.openAiTimeoutMs,
            maxAttempts: runtime.openAiMaxAttempts,
            baseDelayMs: runtime.openAiBaseDelayMs,
          },
          logger,
          fetchImpl,
        )
      : new MockOpenAiProvider();

  return {
    email,
    otp,
    storage,
    payment,
    zoom,
    openai,
  };
}
