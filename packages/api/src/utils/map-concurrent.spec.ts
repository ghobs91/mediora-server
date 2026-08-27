import { mapConcurrent } from "./map-concurrent";

describe("mapConcurrent", () => {
  it("limits active work and preserves input order", async () => {
    let active = 0;
    let maximumActive = 0;

    const result = await mapConcurrent([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    });

    expect(maximumActive).toBe(2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it("returns an empty result without invoking the mapper", async () => {
    const mapper = jest.fn();

    await expect(mapConcurrent([], 2, mapper)).resolves.toEqual([]);
    expect(mapper).not.toHaveBeenCalled();
  });
});
