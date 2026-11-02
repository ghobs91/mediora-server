import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  const failing = () => Promise.reject(new Error('boom'));

  it('stays closed while calls succeed', async () => {
    const breaker = new CircuitBreaker(2, 1000);

    await expect(breaker.run(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(breaker.state).toBe('closed');
  });

  it('opens after the failure threshold and fails fast', async () => {
    const breaker = new CircuitBreaker(2, 1000);
    const operation = jest.fn(failing);

    await expect(breaker.run(operation)).rejects.toThrow('boom');
    await expect(breaker.run(operation)).rejects.toThrow('boom');

    expect(breaker.state).toBe('open');
    await expect(breaker.run(operation)).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('does not count failures the caller marks as non-fatal', async () => {
    const breaker = new CircuitBreaker(2, 1000);
    const notFound = () => Promise.reject(new Error('404'));

    await expect(
      breaker.run(notFound, () => false),
    ).rejects.toThrow('404');
    await expect(
      breaker.run(notFound, () => false),
    ).rejects.toThrow('404');

    expect(breaker.state).toBe('closed');
  });

  it('lets a single probe through after the cooldown and closes on success', async () => {
    let now = 1000;
    const breaker = new CircuitBreaker(1, 500, () => now);

    await expect(breaker.run(failing)).rejects.toThrow('boom');
    expect(breaker.state).toBe('open');

    now += 500;
    expect(breaker.state).toBe('half-open');

    await expect(breaker.run(() => Promise.resolve('ok'))).resolves.toBe('ok');
    expect(breaker.state).toBe('closed');
  });

  it('re-opens when the half-open probe fails', async () => {
    let now = 1000;
    const breaker = new CircuitBreaker(1, 500, () => now);

    await expect(breaker.run(failing)).rejects.toThrow('boom');

    now += 500;
    await expect(breaker.run(failing)).rejects.toThrow('boom');
    expect(breaker.state).toBe('open');

    await expect(breaker.run(failing)).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
  });
});
