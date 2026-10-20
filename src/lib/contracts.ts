export type LocalDate = string;
export type Instant = string;
export type MoneyCents = number;
export type CommandMeta = { operationId: string; expectedVersion?: number };
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
export type ApiErrorCode = 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND' | 'DUPLICATE_OPERATION' | 'UNAVAILABLE' | 'FORBIDDEN_ORIGIN' | 'BUSINESS_RULE';

export class DomainError extends Error {
  constructor(public code: ApiErrorCode, message: string, public fieldErrors?: Record<string, string>, public currentVersion?: number) {
    super(message);
    this.name = 'DomainError';
  }
}
