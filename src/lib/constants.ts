export const PAGINATION_DEFAULTS = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const);

export const HTTP_HEADERS = Object.freeze({
  CORRELATION_ID: 'x-correlation-id',
  AUTHORIZATION: 'authorization',
  CONTENT_TYPE: 'content-type',
  ACCEPT: 'accept',
  USER_AGENT: 'user-agent',
} as const);

export const ENVIRONMENTS = Object.freeze({
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test',
} as const);

export const APP_DEFAULTS = Object.freeze({
  APP_NAME: 'JKR Site Diary Platform',
  DEFAULT_LOG_LEVEL: 'info',
  DEFAULT_TIMEZONE: 'UTC',
} as const);

export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];
