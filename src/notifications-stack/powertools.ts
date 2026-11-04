import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';

export const logger = new Logger({ serviceName: 'x-notifier' });
export const tracer = new Tracer({ serviceName: 'x-notifier' });
