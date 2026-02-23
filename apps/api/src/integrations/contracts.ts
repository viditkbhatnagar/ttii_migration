export interface IntegrationDeliveryResult {
  accepted: boolean;
  provider: string;
  providerMessageId?: string;
}

export interface EmailSendRequest {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, string | number | boolean>;
  tags?: string[];
  replyTo?: string;
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(input: EmailSendRequest): Promise<IntegrationDeliveryResult>;
}

export interface OtpDispatchRequest {
  userId: number;
  target: string;
  otp: string;
  purpose: string;
  expiresAt: Date;
}

export interface OtpProvider {
  readonly name: string;
  sendOtp(input: OtpDispatchRequest): Promise<IntegrationDeliveryResult>;
}

export interface StorageUploadRequest {
  key: string;
  body: string | Uint8Array | Buffer;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  key: string;
  provider: string;
  location: string;
  etag?: string;
}

export interface StorageDeleteRequest {
  key: string;
}

export interface StorageSignedDownloadRequest {
  key: string;
  expiresInSeconds: number;
  fileName?: string;
}

export interface StorageProvider {
  readonly name: string;
  uploadObject(input: StorageUploadRequest): Promise<StorageUploadResult>;
  deleteObject(input: StorageDeleteRequest): Promise<void>;
  createSignedDownloadUrl(input: StorageSignedDownloadRequest): Promise<string>;
}

export interface PaymentOrderRequest {
  amountMinor: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface PaymentOrder {
  orderId: string;
  amountMinor: number;
  currency: string;
  receipt: string;
  providerPayload?: Record<string, unknown>;
}

export interface PaymentSignatureVerificationInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface PaymentWebhookVerificationInput {
  payload: string;
  signature: string;
}

export interface PaymentGateway {
  readonly name: string;
  createOrder(input: PaymentOrderRequest): Promise<PaymentOrder>;
  verifyPaymentSignature(input: PaymentSignatureVerificationInput): boolean;
  verifyWebhookSignature(input: PaymentWebhookVerificationInput): boolean;
}

export interface ZoomSdkSignatureRequest {
  meetingNumber: string;
  role: 0 | 1;
  issuedAt?: Date;
  expiresInSeconds?: number;
}

export interface ZoomSdkSignature {
  signature: string;
  issuedAt: Date;
  expiresAt: Date;
}

export interface ZoomProvider {
  readonly name: string;
  generateSdkSignature(input: ZoomSdkSignatureRequest): ZoomSdkSignature;
}

export type OpenAiChatRole = 'system' | 'user' | 'assistant';

export interface OpenAiChatMessage {
  role: OpenAiChatRole;
  content: string;
}

export interface OpenAiChatRequest {
  model?: string;
  messages: OpenAiChatMessage[];
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  requestId?: string;
}

export interface OpenAiTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface OpenAiChatResponse {
  responseId: string;
  model: string;
  content: string;
  finishReason?: string;
  usage?: OpenAiTokenUsage;
}

export interface OpenAiProvider {
  readonly name: string;
  createChatCompletion(input: OpenAiChatRequest): Promise<OpenAiChatResponse>;
}

export interface IntegrationLogger {
  debug(message: string, details?: Record<string, unknown>): void;
  info(message: string, details?: Record<string, unknown>): void;
  warn(message: string, details?: Record<string, unknown>): void;
  error(message: string, details?: Record<string, unknown>): void;
}

export interface IntegrationRegistry {
  email: EmailProvider;
  otp: OtpProvider;
  storage: StorageProvider;
  payment: PaymentGateway;
  zoom: ZoomProvider;
  openai: OpenAiProvider;
}
