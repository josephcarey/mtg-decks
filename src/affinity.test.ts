import { describe, expect, it } from "vitest";

import type { RawTagCount } from "./affinity.ts";

import { rankAffinity } from "./affinity.ts";

const raw: RawTagCount[] = [
  { seedCount: 50, slug: "generic", univCount: 500 }, // share .5, base .5 → lift 1
  { seedCount: 10, slug: "niche", univCount: 20 }, // share .1, base .02 → lift 5
  { seedCount: 30, slug: "themey", univCount: 150 }, // share .3, base .15 → lift 2
  { seedCount: 2, slug: "rare", univCount: 2 }, // filtered by minCount
];

describe("rankAffinity", () => {
  it("computes share and lift and sorts by lift by default", () => {
    const rows = rankAffinity(raw, 100, 1000, {
      limit: 10,
      minCount: 5,
      sort: "lift",
    });
    expect(rows.map((r) => r.slug)).toEqual(["niche", "themey", "generic"]);
    expect(rows[0]?.lift).toBeCloseTo(5);
    expect(rows[0]?.share).toBeCloseTo(0.1);
  });

  it("drops rows below minCount", () => {
    const rows = rankAffinity(raw, 100, 1000, {
      limit: 10,
      minCount: 5,
      sort: "lift",
    });
    expect(rows.some((r) => r.slug === "rare")).toBe(false);
  });

  it("sorts by raw count when asked", () => {
    const rows = rankAffinity(raw, 100, 1000, {
      limit: 10,
      minCount: 5,
      sort: "count",
    });
    expect(rows.map((r) => r.slug)).toEqual(["generic", "themey", "niche"]);
  });

  it("sorts by share (== seedCount for a fixed seed) when asked", () => {
    const rows = rankAffinity(raw, 100, 1000, {
      limit: 10,
      minCount: 5,
      sort: "share",
    });
    expect(rows.map((r) => r.slug)).toEqual(["generic", "themey", "niche"]);
  });

  it("honours the limit", () => {
    const rows = rankAffinity(raw, 100, 1000, {
      limit: 2,
      minCount: 5,
      sort: "lift",
    });
    expect(rows).toHaveLength(2);
  });

  it("excludes named slugs (e.g. the seed tag itself)", () => {
    const rows = rankAffinity(raw, 100, 1000, {
      exclude: new Set(["niche"]),
      limit: 10,
      minCount: 5,
      sort: "lift",
    });
    expect(rows.some((r) => r.slug === "niche")).toBe(false);
  });

  it("returns nothing for an empty seed or universe", () => {
    expect(
      rankAffinity(raw, 0, 1000, { limit: 10, minCount: 1, sort: "lift" }),
    ).toEqual([]);
    expect(
      rankAffinity(raw, 100, 0, { limit: 10, minCount: 1, sort: "lift" }),
    ).toEqual([]);
  });
});
