import type { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { decide } from './decide';
import { composePost } from './messages';
import { getPostedState, replacePostedState } from './posted-state';
import { logger } from './powertools';
import { postToX } from './x-client';
import type { StationStatusMessage } from '../api-stack/status';
import { parseStations } from '../storage-stack/stations';

interface StationBatch {
  latest: StationStatusMessage;
  messageIds: string[];
}

/** Groups a batch's status messages by station, keeping each station's newest. */
function groupByStation(event: SQSEvent) {
  const batches = new Map<string, StationBatch>();
  for (const record of event.Records) {
    let message: StationStatusMessage;
    try {
      message = JSON.parse(record.body);
    } catch {
      logger.warn('Ignoring a message that is not JSON', {
        messageId: record.messageId,
      });
      continue;
    }
    const batch = batches.get(message.station);
    if (!batch) {
      batches.set(message.station, {
        latest: message,
        messageIds: [record.messageId],
      });
      continue;
    }
    batch.messageIds.push(record.messageId);
    if (message.lastUpdate > batch.latest.lastUpdate) {
      batch.latest = message;
    }
  }
  return batches;
}

/** Posts (or, in log mode, logs) a station's state change if it should be announced. */
async function notifyStation(status: StationStatusMessage, website?: string) {
  if (!status.state) {
    return;
  }
  const posted = await getPostedState(status.station);
  const now = Date.now();
  const decision = decide(status.state, posted, now);

  if (decision.action === 'none') {
    if (decision.reason === 'cooldown') {
      logger.info('State changed during the cooldown, not posting yet', {
        state: status.state,
        postedState: posted?.state,
      });
    }
    return;
  }
  if (decision.action === 'seed') {
    await replacePostedState(status.station, null, {
      state: status.state,
      postedAt: 0,
    });
    logger.info('Recorded the first state without posting', {
      state: status.state,
    });
    return;
  }

  const next = { state: status.state, postedAt: now };
  if (!(await replacePostedState(status.station, posted, next))) {
    logger.info('Another invocation already handled this change');
    return;
  }
  const text = composePost(decision.transition, website);
  if (process.env.MODE !== 'post') {
    logger.info('Would post (log mode)', {
      transition: decision.transition,
      text,
    });
    return;
  }
  try {
    const { id, rateLimit } = await postToX(text);
    logger.info('Posted to X', { transition: decision.transition, id, rateLimit });
  } catch (error) {
    // Put the previous record back, so the retry posts again
    await replacePostedState(status.station, next, posted!);
    throw error;
  }
}

/**
 * Receives station statuses from the station-status topic (through SQS, with
 * raw message delivery) and posts to X when a ford's state changes, at most
 * once an hour per station. In log mode it only logs the post.
 *
 * A station that fails has its messages reported back for retry.
 */
export async function handler(
  event: SQSEvent,
  context?: Context,
): Promise<SQSBatchResponse> {
  if (context) {
    logger.addContext(context);
  }
  const websites = new Map(
    parseStations(process.env.STATIONS).map((station) => [
      station.id,
      station.ford?.website,
    ]),
  );

  const failedMessageIds: string[] = [];
  for (const [station, batch] of groupByStation(event)) {
    logger.appendKeys({ station });
    try {
      await notifyStation(batch.latest, websites.get(station));
    } catch (error) {
      logger.error('Notifying failed for station', { error: error as Error });
      failedMessageIds.push(...batch.messageIds);
    } finally {
      logger.removeKeys(['station']);
    }
  }
  return {
    batchItemFailures: failedMessageIds.map((itemIdentifier) => ({
      itemIdentifier,
    })),
  };
}
