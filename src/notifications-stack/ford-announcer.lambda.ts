import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import type { Announcement } from './announcement';
import { logger, tracer } from './announcer-powertools';
import { decide } from './decide';
import { getPostedState, replacePostedState } from './posted-state';
import type { StationStatusMessage } from '../api-stack/status';

// Created once per Lambda container and reused across invocations.
const snsClient = tracer.captureAWSv3Client(new SNSClient({}));

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

/** Announces a station's state change if it should be announced. */
async function announceStation(status: StationStatusMessage) {
  if (!status.state) {
    return;
  }
  const posted = await getPostedState(status.station);
  const now = Date.now();
  const decision = decide(status.state, posted, now);

  if (decision.action === 'none') {
    if (decision.reason === 'cooldown') {
      logger.info('State changed during the cooldown, not announcing yet', {
        state: status.state,
        announcedState: posted?.state,
      });
    }
    return;
  }
  if (decision.action === 'seed') {
    await replacePostedState(status.station, null, {
      state: status.state,
      postedAt: 0,
    });
    logger.info('Recorded the first state without announcing', {
      state: status.state,
    });
    return;
  }

  // Claim the change first, so only one invocation, in one region, announces it
  const next = { state: status.state, postedAt: now };
  if (!(await replacePostedState(status.station, posted, next))) {
    logger.info('Another invocation already handled this change');
    return;
  }
  const announcement: Announcement = {
    id: `${status.station}:${status.state}:${now}`,
    station: status.station,
    transition: decision.transition,
    state: status.state,
    previousState: posted!.state,
    depth: status.depth,
    lastUpdate: status.lastUpdate,
    announcedAt: new Date(now).toISOString(),
  };
  try {
    await snsClient.send(
      new PublishCommand({
        Message: JSON.stringify(announcement),
        TopicArn: process.env.ANNOUNCEMENTS_TOPIC_ARN,
      }),
    );
  } catch (error) {
    // Put the previous record back, so the retry announces it
    await replacePostedState(status.station, next, posted!);
    throw error;
  }
  logger.info('Announced a state change', {
    id: announcement.id,
    transition: announcement.transition,
  });
}

/**
 * Receives station statuses from the station-status topic (through SQS, with
 * raw message delivery) and announces each ford state change on the
 * ford-announcements topic, at most once an hour per station. The claim on
 * the multi-region state table means only one region announces each change.
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
  const failedMessageIds: string[] = [];
  for (const [station, batch] of groupByStation(event)) {
    logger.appendKeys({ station });
    try {
      await announceStation(batch.latest);
    } catch (error) {
      logger.error('Announcing failed for station', { error: error as Error });
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
