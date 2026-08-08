import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class KnowledgeEngineError extends BaseAppError {
  public readonly errorCode = 'KNOWLEDGE_ENGINE_ERROR';
  public readonly httpStatus = 500;

  constructor(message: string = 'Knowledge evaluation failed', options?: ErrorOptions) {
    super(message, options);
  }
}

export class InvalidKnowledgeRuleError extends BaseAppError {
  public readonly errorCode = 'INVALID_KNOWLEDGE_RULE';
  public readonly httpStatus = 400;

  constructor(message: string = 'Knowledge rule definition is malformed', options?: ErrorOptions) {
    super(message, options);
  }
}
