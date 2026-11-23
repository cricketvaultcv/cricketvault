import { afterEach, describe, expect, it, vi } from "vitest";
import { Coach } from "./models.js";
import { reserveCoachCapacity } from "./capacity.js";

afterEach(() => vi.restoreAllMocks());

describe("coach capacity reservation", () => {
  it("uses one atomic eligibility-and-increment update under concurrent requests", async () => {
    let activeAndReserved = 7;
    const capacity = 8;
    const spy = vi
      .spyOn(Coach, "findOneAndUpdate")
      .mockImplementation((async (filter: any, update: any) => {
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (activeAndReserved >= capacity) return null;
        activeAndReserved += update.$inc.reservedCount;
        return { _id: filter._id } as never;
      }) as never);

    const results = await Promise.all([
      reserveCoachCapacity("coach-1"),
      reserveCoachCapacity("coach-1"),
      reserveCoachCapacity("coach-1"),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(activeAndReserved).toBe(capacity);
    expect(spy).toHaveBeenCalledTimes(3);
    const [filter, update, options] = spy.mock.calls[0] as unknown as [
      Record<string, any>,
      Record<string, any>,
      Record<string, any>,
    ];
    expect(filter).toMatchObject({ approved: true, available: true });
    expect(filter.$expr).toEqual({
      $lt: [
        {
          $add: [
            { $ifNull: ["$activeCount", 0] },
            { $ifNull: ["$reservedCount", 0] },
          ],
        },
        { $ifNull: ["$capacity", 8] },
      ],
    });
    expect(update).toEqual({ $inc: { reservedCount: 1 } });
    expect(options).toMatchObject({ new: true });
  });
});
