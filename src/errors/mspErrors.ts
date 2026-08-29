import { BaseAppError, ErrorOptions } from '@/lib/errors';

export class MspDuplicateImportError extends BaseAppError {
  public readonly errorCode = 'MSP_DUPLICATE_IMPORT';
  public readonly httpStatus = 400;

  constructor(message: string = 'Duplicate MSP file hash detected for this programme', options?: ErrorOptions) {
    super(message, options);
  }
}

export class MspXmlParseError extends BaseAppError {
  public readonly errorCode = 'MSP_XML_PARSE_ERROR';
  public readonly httpStatus = 400;

  constructor(message: string = 'Failed to parse MSP XML file', options?: ErrorOptions) {
    super(message, options);
  }
}

export class MspIngestionValidationError extends BaseAppError {
  public readonly errorCode = 'MSP_INGESTION_VALIDATION_ERROR';
  public readonly httpStatus = 400;

  constructor(message: string = 'MSP ingestion validation failed', options?: ErrorOptions) {
    super(message, options);
  }
}
