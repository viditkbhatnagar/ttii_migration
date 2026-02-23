import { createHash, randomUUID } from 'node:crypto';

import type {
  IntegrationLogger,
  OpenAiChatRequest,
  OpenAiChatResponse,
  OpenAiProvider,
  OpenAiTokenUsage,
} from './contracts.js';

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function hashForLogs(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function summarizePrompt(input: OpenAiChatRequest): Record<string, unknown> {
  const characters = input.messages.reduce((sum, message) => sum + message.content.length, 0);

  return {
    model: input.model,
    message_count: input.messages.length,
    roles: input.messages.map((message) => message.role),
    total_characters: characters,
    temperature: input.temperature,
    max_tokens: input.maxTokens,
    request_id_hash: input.requestId ? hashForLogs(input.requestId) : undefined,
    user_id_hash: input.userId ? hashForLogs(input.userId) : undefined,
  };
}

function isRetriableStatus(status: number): boolean {
  return status === 429 || status === 408 || status === 500 || status === 502 || status === 503 || status === 504;
}

function extractAssistantText(choice: unknown): string {
  if (!choice || typeof choice !== 'object') {
    return '';
  }

  const message = (choice as { message?: unknown }).message;
  if (!message || typeof message !== 'object') {
    return '';
  }

  const content = (message as { content?: unknown }).content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== 'object') {
          return '';
        }

        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      })
      .join('')
      .trim();
  }

  return '';
}

function parseUsage(value: unknown): OpenAiTokenUsage | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const usage = value as {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };

  const promptTokens = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : undefined;
  const completionTokens = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : undefined;
  const totalTokens = typeof usage.total_tokens === 'number' ? usage.total_tokens : undefined;

  if (
    typeof promptTokens !== 'number' &&
    typeof completionTokens !== 'number' &&
    typeof totalTokens !== 'number'
  ) {
    return undefined;
  }

  return {
    ...(typeof promptTokens === 'number' ? { promptTokens } : {}),
    ...(typeof completionTokens === 'number' ? { completionTokens } : {}),
    ...(typeof totalTokens === 'number' ? { totalTokens } : {}),
  };
}

export class MockOpenAiProvider implements OpenAiProvider {
  readonly name = 'mock-openai';

  createChatCompletion(input: OpenAiChatRequest): Promise<OpenAiChatResponse> {
    const model = input.model ?? 'mock-model';
    const latestUserMessage = [...input.messages].reverse().find((message) => message.role === 'user');

    return Promise.resolve({
      responseId: `mock-${randomUUID()}`,
      model,
      content: latestUserMessage?.content ?? '',
      finishReason: 'stop',
    });
  }
}

export interface OpenAiHttpProviderConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
  maxAttempts: number;
  baseDelayMs: number;
}

export class OpenAiHttpProvider implements OpenAiProvider {
  readonly name = 'openai-http';

  constructor(
    private readonly config: OpenAiHttpProviderConfig,
    private readonly logger: IntegrationLogger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async createChatCompletion(input: OpenAiChatRequest): Promise<OpenAiChatResponse> {
    if (input.messages.length === 0) {
      throw new Error('OpenAI chat request requires at least one message.');
    }

    const requestBody: Record<string, unknown> = {
      model: input.model ?? this.config.defaultModel,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      user: input.userId,
    };

    this.logger.debug('integration.openai.request', summarizePrompt(input));

    let lastError: unknown;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const response = await this.fetchImpl(`${this.config.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.config.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          const bodyText = await response.text();
          const retriable = isRetriableStatus(response.status);

          this.logger.warn('integration.openai.response_error', {
            status: response.status,
            attempt,
            retriable,
          });

          if (!retriable || attempt >= this.config.maxAttempts) {
            throw new Error(
              `OpenAI completion failed (${response.status}): ${bodyText.slice(0, 256)}`,
            );
          }

          const delay = this.config.baseDelayMs * 2 ** (attempt - 1);
          await sleep(delay);
          continue;
        }

        const body = (await response.json()) as {
          id?: string;
          model?: string;
          choices?: Array<{ message?: unknown; finish_reason?: string }>;
          usage?: unknown;
        };

        const firstChoice = Array.isArray(body.choices) ? body.choices[0] : undefined;
        const content = extractAssistantText(firstChoice);

        this.logger.info('integration.openai.response', {
          model: body.model,
          response_id: body.id,
          finish_reason: firstChoice?.finish_reason,
        });

        const usage = parseUsage(body.usage);
        return {
          responseId: body.id ?? `openai-${randomUUID()}`,
          model: body.model ?? String(requestBody.model),
          content,
          ...(firstChoice?.finish_reason ? { finishReason: firstChoice.finish_reason } : {}),
          ...(usage ? { usage } : {}),
        };
      } catch (error) {
        lastError = error;

        const timedOut = error instanceof DOMException && error.name === 'AbortError';
        const retriable = timedOut;

        this.logger.warn('integration.openai.request_error', {
          attempt,
          retriable,
          timed_out: timedOut,
          error: error instanceof Error ? error.message : String(error),
        });

        if (!retriable || attempt >= this.config.maxAttempts) {
          break;
        }

        const delay = this.config.baseDelayMs * 2 ** (attempt - 1);
        await sleep(delay);
      } finally {
        clearTimeout(timeout);
      }
    }

    this.logger.error('integration.openai.request_failed', {
      attempts: this.config.maxAttempts,
      error: lastError instanceof Error ? lastError.message : String(lastError),
    });

    throw lastError instanceof Error ? lastError : new Error('OpenAI completion failed.');
  }
}
