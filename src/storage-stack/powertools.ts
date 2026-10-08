import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';

export const tracer = new Tracer({ serviceName: 'crawler' });
export const logger = new Logger({ serviceName: 'crawler' });

/**
 * Runs `fn` in a named X-Ray subsegment. The subsegment records any error and
 * is always closed, and calls made inside it are nested under it.
 */
export async function traced<T>(name: string, fn: () => Promise<T>) {
  const parent = tracer.getSegment();
  const subsegment = parent?.addNewSubsegment(name);
  if (subsegment) {
    tracer.setSegment(subsegment);
  }
  try {
    return await fn();
  } catch (error) {
    subsegment?.addError(error as Error);
    throw error;
  } finally {
    subsegment?.close();
    if (parent) {
      tracer.setSegment(parent);
    }
  }
}
