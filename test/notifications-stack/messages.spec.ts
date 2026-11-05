import {
  composePost,
  getTransition,
  MESSAGES,
} from '../../src/notifications-stack/messages';

describe('getTransition', () => {
  test.each([
    ['clear', 'flooded', 'risingFlooded'],
    ['clear', 'impassable', 'risingImpassable'],
    ['flooded', 'impassable', 'risingImpassable'],
    ['impassable', 'flooded', 'droppingFlooded'],
    ['impassable', 'clear', 'droppingClear'],
    ['flooded', 'clear', 'droppingClear'],
  ] as const)('that %s to %s is %s', (previous, next, transition) => {
    expect(getTransition(previous, next)).toBe(transition);
  });

  test.each(['clear', 'flooded', 'impassable'] as const)(
    'that %s to itself is no change',
    (state) => {
      expect(getTransition(state, state)).toBeNull();
    },
  );
});

describe('composePost', () => {
  test('that it picks a message for the transition and links the website', () => {
    expect(composePost('risingFlooded', 'https://kenilworthford.com', () => 0)).toBe(
      `${MESSAGES.risingFlooded[0]} See https://kenilworthford.com for more details.`,
    );
  });

  test('that it picks the last message for a random number just below 1', () => {
    const options = MESSAGES.droppingClear;
    expect(composePost('droppingClear', undefined, () => 0.9999)).toBe(
      options[options.length - 1],
    );
  });

  test('that it leaves the link out without a website', () => {
    expect(composePost('risingImpassable', undefined, () => 0)).toBe(
      MESSAGES.risingImpassable[0],
    );
  });

  test('that every post fits in an X post with the link', () => {
    for (const options of Object.values(MESSAGES)) {
      for (const text of options) {
        expect(
          `${text} See https://kenilworthford.com for more details.`.length,
        ).toBeLessThanOrEqual(280);
      }
    }
  });
});
