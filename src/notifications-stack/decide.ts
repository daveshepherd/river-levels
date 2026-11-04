import { getTransition, Transition } from './messages';
import type { FordState } from '../api-stack/status';

/** The least time between two posts about the same station. */
export const COOLDOWN_MS = 60 * 60 * 1000;

/** The last state posted about a station, as stored in the state table. */
export interface PostedState {
  state: FordState;
  /** When it was posted, in epoch milliseconds; 0 if it was only recorded, never posted. */
  postedAt: number;
}

export type Decision =
  | { action: 'seed' }
  | { action: 'none'; reason: 'unchanged' | 'cooldown' }
  | { action: 'post'; transition: Transition };

/**
 * Whether to post about a station's latest state.
 *
 * - With nothing recorded yet, the state is recorded without posting, so a
 *   deploy doesn't announce the current state.
 * - A state that differs from the last one posted is posted, unless the last
 *   post was less than COOLDOWN_MS ago. A state that persists is posted once
 *   the cooldown ends, because the status arrives with every batch.
 */
export function decide(
  state: FordState,
  posted: PostedState | null,
  now: number,
): Decision {
  if (!posted) {
    return { action: 'seed' };
  }
  const transition = getTransition(posted.state, state);
  if (!transition) {
    return { action: 'none', reason: 'unchanged' };
  }
  if (now - posted.postedAt < COOLDOWN_MS) {
    return { action: 'none', reason: 'cooldown' };
  }
  return { action: 'post', transition };
}
