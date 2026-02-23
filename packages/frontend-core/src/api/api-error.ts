export interface ApiErrorDetails {
  statusCode: number;
  status?: unknown;
  payload?: unknown;
  path: string;
}

export class ApiError extends Error {
  readonly statusCode: number;

  readonly status?: unknown;

  readonly payload?: unknown;

  readonly path: string;

  constructor(message: string, details: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = details.statusCode;
    this.status = details.status;
    this.payload = details.payload;
    this.path = details.path;
  }
}

export function toApiError(error: unknown, fallbackPath = 'unknown'): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(error.message, {
      statusCode: 500,
      payload: error,
      path: fallbackPath,
    });
  }

  return new ApiError('Unexpected API failure.', {
    statusCode: 500,
    payload: error,
    path: fallbackPath,
  });
}
