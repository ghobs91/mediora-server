export async function mapConcurrent<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (values.length === 0) return [];

  const workerCount = Math.min(
    Math.max(1, Math.floor(concurrency)),
    values.length,
  );
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const index = nextIndex++;
        if (index >= values.length) return;
        results[index] = await mapper(values[index], index);
      }
    }),
  );

  return results;
}
