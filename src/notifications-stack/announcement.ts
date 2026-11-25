import type { Transition } from './messages';
import type { FordState } from '../api-stack/status';

/**
 * A ford state change, published once to the ford-announcements topic by the
 * region that claimed it. Each channel's deliverer turns it into a post or a
 * notification.
 */
export interface Announcement {
  /** Unique per announcement: the station, the new state and when it was claimed. */
  id: string;
  station: string;
  transition: Transition;
  state: FordState;
  previousState: FordState;
  /** The depth, in metres, in the status that triggered it. */
  depth: number;
  /** When that status's latest reading was taken, as an ISO date. */
  lastUpdate: string;
  /** When the change was claimed, as an ISO date. */
  announcedAt: string;
}
