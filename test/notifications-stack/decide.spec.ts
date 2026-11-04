import { COOLDOWN_MS, decide } from '../../src/notifications-stack/decide';

const NOW = 1_800_000_000_000;

describe('decide', () => {
  test('that the first state is recorded without posting', () => {
    expect(decide('flooded', null, NOW)).toStrictEqual({ action: 'seed' });
  });

  test('that an unchanged state does nothing', () => {
    expect(decide('clear', { state: 'clear', postedAt: 0 }, NOW)).toStrictEqual({
      action: 'none',
      reason: 'unchanged',
    });
  });

  test('that a change after a seeded record is posted straight away', () => {
    expect(decide('flooded', { state: 'clear', postedAt: 0 }, NOW)).toStrictEqual({
      action: 'post',
      transition: 'risingFlooded',
    });
  });

  test('that a change within the cooldown is held back', () => {
    expect(
      decide('clear', { state: 'flooded', postedAt: NOW - COOLDOWN_MS + 1 }, NOW),
    ).toStrictEqual({ action: 'none', reason: 'cooldown' });
  });

  test('that a change is posted once the cooldown has passed', () => {
    expect(
      decide('clear', { state: 'flooded', postedAt: NOW - COOLDOWN_MS }, NOW),
    ).toStrictEqual({ action: 'post', transition: 'droppingClear' });
  });
});
