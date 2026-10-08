import { tracer, traced } from '../../src/storage-stack/powertools';

function fakeSegments() {
  const subsegment = { addError: jest.fn(), close: jest.fn() };
  const parent = { addNewSubsegment: jest.fn().mockReturnValue(subsegment) };
  jest.spyOn(tracer, 'getSegment').mockReturnValue(parent as never);
  const setSegment = jest.spyOn(tracer, 'setSegment').mockImplementation();
  return { parent, subsegment, setSegment };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('traced', () => {
  test('that it runs the function in a named subsegment and restores the parent', async () => {
    const { parent, subsegment, setSegment } = fakeSegments();

    await expect(traced('step', async () => 'result')).resolves.toBe('result');

    expect(parent.addNewSubsegment).toHaveBeenCalledWith('step');
    expect(setSegment).toHaveBeenNthCalledWith(1, subsegment);
    expect(setSegment).toHaveBeenNthCalledWith(2, parent);
    expect(subsegment.close).toHaveBeenCalledTimes(1);
    expect(subsegment.addError).not.toHaveBeenCalled();
  });

  test('that it records the error, closes the subsegment and rethrows', async () => {
    const { parent, subsegment, setSegment } = fakeSegments();
    const error = new Error('boom');

    await expect(
      traced('step', async () => {
        throw error;
      }),
    ).rejects.toThrow('boom');

    expect(subsegment.addError).toHaveBeenCalledWith(error);
    expect(subsegment.close).toHaveBeenCalledTimes(1);
    expect(setSegment).toHaveBeenLastCalledWith(parent);
  });

  test('that it still runs the function when there is no active segment', async () => {
    jest.spyOn(tracer, 'getSegment').mockReturnValue(undefined);

    await expect(traced('step', async () => 42)).resolves.toBe(42);
  });
});
