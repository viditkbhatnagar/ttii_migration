import { describe, expect, it } from 'vitest';

import type { IntegrationLogger } from '../../src/integrations/contracts.js';
import { OpenAiHttpProvider } from '../../src/integrations/openai-provider.js';

describe('openai integrations', () => {
  it('retries retriable failures and avoids logging prompt content', async () => {
    const logs: Array<{ level: string; details?: Record<string, unknown> }> = [];
    const logger: IntegrationLogger = {
      debug: (_message, details) => {
        logs.push({ level: 'debug', details });
      },
      info: (_message, details) => {
        logs.push({ level: 'info', details });
      },
      warn: (_message, details) => {
        logs.push({ level: 'warn', details });
      },
      error: (_message, details) => {
        logs.push({ level: 'error', details });
      },
    };

    let calls = 0;
    const fetchImpl: typeof fetch = () => {
      calls += 1;

      if (calls === 1) {
        return Promise.resolve(new Response(JSON.stringify({ error: { message: 'rate_limited' } }), {
          status: 429,
          headers: {
            'content-type': 'application/json',
          },
        }));
      }

      return Promise.resolve(new Response(
        JSON.stringify({
          id: 'chatcmpl_123',
          model: 'gpt-4o-mini',
          choices: [
            {
              finish_reason: 'stop',
              message: {
                role: 'assistant',
                content: 'Safe response',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 6,
            total_tokens: 16,
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ));
    };

    const provider = new OpenAiHttpProvider(
      {
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o-mini',
        timeoutMs: 1_000,
        maxAttempts: 3,
        baseDelayMs: 1,
      },
      logger,
      fetchImpl,
    );

    const prompt = 'please keep this prompt private';
    const result = await provider.createChatCompletion({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      requestId: 'req_1234',
      userId: 'user_001',
    });

    expect(calls).toBe(2);
    expect(result.content).toBe('Safe response');

    const serializedLogs = JSON.stringify(logs);
    expect(serializedLogs.includes(prompt)).toBe(false);
  });
});
