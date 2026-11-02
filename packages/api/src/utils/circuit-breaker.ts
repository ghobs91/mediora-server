export class CircuitOpenError extends Error {
  public constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Minimal circuit breaker.
 *
 * After `failureThreshold` consecutive failures the circuit opens for
 * `cooldownMs`, during which calls fail immediately instead of waiting on a
 * dependency that is already known to be down. Once the cooldown elapses a
 * single probe request is let through; success closes the circuit, failure
 * re-opens it.
 */
export class CircuitBreaker {
  private failures = 0;
  private openUntil = 0;
  private probing = false;

  public constructor(
    private readonly failureThreshold: number,
    private readonly cooldownMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  public get state(): CircuitState {
    if (this.openUntil === 0) return 'closed';
    return this.now() < this.openUntil ? 'open' : 'half-open';
  }

  public async run<T>(
    operation: () => Promise<T>,
    shouldCountFailure: (error: unknown) => boolean = () => true,
  ): Promise<T> {
    const state = this.state;

    if (state === 'open') {
      throw new CircuitOpenError(
        `Circuit breaker is open, retry in ${Math.max(
          0,
          this.openUntil - this.now(),
        )}ms`,
      );
    }

    if (state === 'half-open') {
      if (this.probing) {
        throw new CircuitOpenError('Circuit breaker probe already in flight');
      }
      this.probing = true;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(shouldCountFailure(error));
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.openUntil = 0;
    this.probing = false;
  }

  private onFailure(counted: boolean) {
    this.probing = false;

    // While half-open a single failed probe re-opens the circuit.
    if (this.openUntil !== 0) {
      this.openUntil = this.now() + this.cooldownMs;
      return;
    }

    if (!counted) return;

    this.failures += 1;
    if (this.failures >= this.failureThreshold) {
      this.openUntil = this.now() + this.cooldownMs;
    }
  }
}
