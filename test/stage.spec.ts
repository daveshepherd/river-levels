import { resolveStage } from '../src/stage';

describe('resolveStage', () => {
  test('that it defaults to local when STAGE is not set', () => {
    expect(resolveStage({})).toBe('local');
  });

  test('that it defaults to local when STAGE is empty', () => {
    expect(resolveStage({ STAGE: '  ' })).toBe('local');
  });

  test.each(['local', 'development', 'production'])(
    'that it accepts %s',
    (stage) => {
      expect(resolveStage({ STAGE: stage })).toBe(stage);
    },
  );

  test('that it rejects an unknown stage', () => {
    expect(() => resolveStage({ STAGE: 'prod' })).toThrow(
      'Unknown STAGE "prod". Expected one of: local, development, production',
    );
  });
});
