import { legacyPathsFunctionCode } from '../../src/api-stack/distribution';

type Handler = (event: { request: { uri: string } }) => { uri: string };

/** Loads the generated CloudFront Function code as a callable handler. */
function loadHandler(stationId: string): Handler {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  return new Function(`${legacyPathsFunctionCode(stationId)}\nreturn handler;`)();
}

describe('legacyPathsFunctionCode', () => {
  const handler = loadHandler('kenilworth');
  const rewrite = (uri: string) => handler({ request: { uri } }).uri;

  test.each([
    ['/status', '/stations/kenilworth/status.json'],
    ['/status/', '/stations/kenilworth/status.json'],
    ['/chart', '/stations/kenilworth/chart.json'],
    ['/chart/', '/stations/kenilworth/chart.json'],
  ])('that %s is served from %s', (uri, expected) => {
    expect(rewrite(uri)).toBe(expected);
  });

  test.each([
    '/stations/kenilworth/status.json',
    '/stations/warwick/chart.json',
    '/statuses',
    '/',
  ])('that %s is passed through unchanged', (uri) => {
    expect(rewrite(uri)).toBe(uri);
  });

  test('that it uses the given station', () => {
    expect(loadHandler('warwick')({ request: { uri: '/status' } }).uri).toBe(
      '/stations/warwick/status.json',
    );
  });
});
