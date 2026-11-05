import type { FordState } from '../api-stack/status';

/** The kinds of ford state change that are announced. */
export type Transition =
  | 'risingFlooded'
  | 'risingImpassable'
  | 'droppingFlooded'
  | 'droppingClear';

const RANK: Record<FordState, number> = { clear: 0, flooded: 1, impassable: 2 };

/**
 * Wording for each change, from the original flood-readings service, with
 * its typos fixed. One is picked at random for each post.
 */
export const MESSAGES: Record<Transition, string[]> = {
  risingFlooded: [
    'The ford is rising and may now be flooded, be careful if you drive through it.',
    'Watch out! The ford may be flooded, but may be passable.',
    'Be careful. The ford may be flooded, but may be passable.',
    'Be cautious when driving through the ford as the water levels continue to rise and it may now be flooded.',
    'Exercise caution when traversing the ford, which may now have become flooded due to rising water levels.',
    'Drive cautiously through the ford as it may be flooded and the water levels are on the rise.',
  ],
  risingImpassable: [
    'The ford is rising and may now be impassable, you may want to find another route.',
    "Due to the rising water levels, the ford might have become impassable; it's advisable to seek an alternative route.",
    'The ford is likely to be impassable due to the rising water; consider finding an alternate path.',
    'The ford may have become impassable, consider finding an alternative route.',
    'Due to the rising water, the ford is likely to be impassable; it would be wise to explore alternative routes.',
  ],
  droppingFlooded: [
    'The ford is dropping and may be passable.',
    'The water level at the ford is decreasing, potentially making it feasible to cross.',
    "The ford's water level is receding, suggesting it may now be navigable.",
    'The water level at the ford is decreasing, indicating that it might now be possible to pass through.',
    "The ford's water level is diminishing, hinting at the possibility of it being traversable now.",
  ],
  droppingClear: [
    'The ford is dropping and is no longer flooding the road.',
    'The water level at the ford is decreasing, and the road is no longer submerged.',
    "The ford's water level is receding, and the road is now clear of flooding.",
    'The water level at the ford is decreasing, and the road is no longer flooded.',
    "The ford's water level is dropping, and the road is no longer submerged by flooding.",
  ],
};

/**
 * The announcement for a change from one state to another, or null if the
 * state hasn't changed. A rise straight from clear to impassable is
 * announced as impassable.
 */
export function getTransition(
  previous: FordState,
  next: FordState,
): Transition | null {
  if (previous === next) {
    return null;
  }
  if (RANK[next] > RANK[previous]) {
    return next === 'impassable' ? 'risingImpassable' : 'risingFlooded';
  }
  return next === 'clear' ? 'droppingClear' : 'droppingFlooded';
}

/** The post for a transition, with a link to the ford's website if it has one. */
export function composePost(
  transition: Transition,
  website?: string,
  random: () => number = Math.random,
): string {
  const options = MESSAGES[transition];
  const text = options[Math.floor(random() * options.length)];
  return website ? `${text} See ${website} for more details.` : text;
}
