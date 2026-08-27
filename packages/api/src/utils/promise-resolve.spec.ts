import { firstOf, PromiseRaceAll } from './promise-resolve';

describe('firstOf', () => {
  it('resolves with the first fulfilled value', async () => {
    jest.useFakeTimers();
    const slow = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('slow')), 1000)
    );
    const promise = firstOf([slow, Promise.resolve('fast')]);
    const result = await promise;
    expect(result).toEqual('fast');
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('rejects with the list of reasons when every promise rejects', async () => {
    const error = new Error('nope');
    await expect(firstOf([Promise.reject(error)])).rejects.toEqual([error]);
  });
});

describe('PromiseRaceAll', () => {
  it('resolves every promise value', async () => {
    const results = await PromiseRaceAll<number>(
      [Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)],
      1000
    );
    expect(results).toEqual([1, 2, 3]);
  });

  it('resolves promises that finish before the timeout', async () => {
    const results = await PromiseRaceAll<string>(
      [
        new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 10)),
      ],
      1000
    );
    expect(results).toEqual(['ok']);
  });
});
