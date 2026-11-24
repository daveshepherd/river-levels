import type { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import type { Announcement } from './announcement';
import { composePost, MESSAGES } from './messages';
import { logger } from './powertools';
import { postToX } from './x-client';
import { parseStations } from '../storage-stack/stations';

/** Posts (or, in log mode, logs) one announcement. */
async function postAnnouncement(announcement: Announcement, website?: string) {
  const text = composePost(announcement.transition, website);
  if (process.env.MODE !== 'post') {
    logger.info('Would post (log mode)', {
      transition: announcement.transition,
      text,
    });
    return;
  }
  const { id, rateLimit } = await postToX(text);
  logger.info('Posted to X', { transition: announcement.transition, id, rateLimit });
}

/**
 * Receives ford state changes from the ford-announcements topic (through SQS,
 * with raw message delivery) and posts each to X. In log mode it only logs
 * the post.
 *
 * An announcement that fails is reported back for retry; after 5 attempts it
 * goes to the dead-letter queue.
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
  for (const record of event.Records) {
    let announcement: Announcement;
    try {
      announcement = JSON.parse(record.body);
    } catch {
      logger.warn('Ignoring a message that is not JSON', {
        messageId: record.messageId,
      });
      continue;
    }
    // Such as a station status left in the queue from before the announcer
    if (!Object.hasOwn(MESSAGES, announcement.transition)) {
      logger.warn('Ignoring a message that is not an announcement', {
        messageId: record.messageId,
      });
      continue;
    }
    logger.appendKeys({ station: announcement.station, announcementId: announcement.id });
    try {
      await postAnnouncement(announcement, websites.get(announcement.station));
    } catch (error) {
      logger.error('Posting failed for announcement', { error: error as Error });
      failedMessageIds.push(record.messageId);
    } finally {
      logger.removeKeys(['station', 'announcementId']);
    }
  }
  return {
    batchItemFailures: failedMessageIds.map((itemIdentifier) => ({
      itemIdentifier,
    })),
  };
}
