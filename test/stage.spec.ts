import {
  apiCustomDomainEnabled,
  apiDomainName,
  resolveStage,
  xNotifierMode,
} from '../src/stage';

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

describe('apiDomainName', () => {
  test.each([
    ['local', 'api.local.kenilworthford.com'],
    ['development', 'api.dev.kenilworthford.com'],
    ['production', 'api.kenilworthford.com'],
  ] as const)('that the %s API is served at %s', (stage, domain) => {
    expect(apiDomainName(stage)).toBe(domain);
  });
});

describe('apiCustomDomainEnabled', () => {
  test.each([
    ['local', false],
    ['development', true],
    ['production', true],
  ] as const)('that %s serving at its API domain is %s', (stage, enabled) => {
    expect(apiCustomDomainEnabled(stage)).toBe(enabled);
  });
});

describe('xNotifierMode', () => {
  test.each([
    ['local', 'log'],
    ['development', 'post'],
    ['production', 'log'],
  ] as const)('that %s is in %s mode', (stage, mode) => {
    expect(xNotifierMode(stage)).toBe(mode);
  });
});
