import { Prisma } from '@prisma/client';

export type DataLayerErrorCode = 'CONFLICT' | 'NOT_FOUND' | 'QUERY_FAILED';

export class DataLayerError extends Error {
  readonly code: DataLayerErrorCode;
  readonly details?: unknown;

  constructor(message: string, code: DataLayerErrorCode, details?: unknown) {
    super(message);
    this.name = 'DataLayerError';
    this.code = code;
    this.details = details;
  }
}

export function toDataLayerError(error: unknown, context: string): DataLayerError {
  if (error instanceof DataLayerError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return new DataLayerError(`${context} failed: unique constraint`, 'CONFLICT', error.meta);
    }

    if (error.code === 'P2025') {
      return new DataLayerError(`${context} failed: record not found`, 'NOT_FOUND', error.meta);
    }

    return new DataLayerError(`${context} failed: prisma ${error.code}`, 'QUERY_FAILED', error.meta);
  }

  if (error instanceof Error) {
    return new DataLayerError(`${context} failed: ${error.message}`, 'QUERY_FAILED', error);
  }

  return new DataLayerError(`${context} failed: unknown error`, 'QUERY_FAILED', error);
}
