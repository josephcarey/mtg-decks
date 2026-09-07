import { describe, expect, it } from "vitest";

import type { AnalyzedCard } from "./analysis.ts";

import {
  cardPips,
  computeCurve,
  computePips,
  fetchVsBasics,
  isLand,
  priceBreakdown,
  tagDistribution,
} from "./analysis.ts";
import { parseDecklist } from "./decklist.ts";

const card = (partial: Partial<AnalyzedCard>): AnalyzedCard => ({
  cmc: 0,
  count: 1,
  manaCost: "",
  name: "X",
  typeLine: "Instant",
  ...partial,
});

describe("isLand", () => {
  it("detects lands", () => {
    expect(isLand("Basic Land — Forest")).toBe(true);
    expect(isLand("Legendary Land")).toBe(true);
  });
  it("rejects non-lands (including 'Landfall' text is not a type)", () => {
    expect(isLand("Legendary Creature — Elf Druid")).toBe(false);
    expect(isLand("Sorcery")).toBe(false);
  });
});

describe("cardPips", () => {
  it("counts single-color pips", () => {
    expect(cardPips("{3}{G}{G}")).toEqual({ B: 0, G: 2, R: 0, U: 0, W: 0 });
  });
  it("counts multicolor costs", () => {
    expect(cardPips("{G}{U}")).toEqual({ B: 0, G: 1, R: 0, U: 1, W: 0 });
  });
  it("counts hybrid symbols toward each payable color", () => {
    expect(cardPips("{G/U}")).toEqual({ B: 0, G: 1, R: 0, U: 1, W: 0 });
  });
  it("returns zero pips for empty/colorless costs", () => {
    expect(cardPips("")).toEqual({ B: 0, G: 0, R: 0, U: 0, W: 0 });
    expect(cardPips("{2}")).toEqual({ B: 0, G: 0, R: 0, U: 0, W: 0 });
  });
});

describe("computePips", () => {
  it("weights pips by copy count", () => {
    const cards = [
      card({ count: 3, manaCost: "{G}" }),
      card({ count: 2, manaCost: "{U}{U}" }),
    ];
    expect(computePips(cards)).toEqual({ B: 0, G: 3, R: 0, U: 4, W: 0 });
  });
});

describe("computeCurve", () => {
  it("averages MV over nonland cards and counts MV 5+", () => {
    const cards = [
      card({ cmc: 1, typeLine: "Artifact" }),
      card({ cmc: 3, typeLine: "Sorcery" }),
      card({ cmc: 6, typeLine: "Creature" }),
      card({ cmc: 0, count: 10, typeLine: "Basic Land — Forest" }),
    ];
    const curve = computeCurve(cards);
    expect(curve.nonlandCount).toBe(3);
    expect(curve.averageMv).toBeCloseTo((1 + 3 + 6) / 3);
    expect(curve.countAtFivePlus).toBe(1);
    expect(curve.histogram.get(6)).toBe(1);
  });

  it("returns zero average for an all-land input", () => {
    const curve = computeCurve([card({ cmc: 0, typeLine: "Land" })]);
    expect(curve.averageMv).toBe(0);
    expect(curve.nonlandCount).toBe(0);
  });
});

describe("tagDistribution", () => {
  it("counts tags weighted by copies, sorted by count then name", () => {
    const entries = parseDecklist(
      ["1 A  #ramp #fixing", "1 B  #ramp", "5 C  #land"].join("\n"),
    );
    const dist = tagDistribution(entries);
    expect(dist[0]).toEqual({ count: 5, tag: "land" });
    expect(dist).toContainEqual({ count: 2, tag: "ramp" });
    expect(dist).toContainEqual({ count: 1, tag: "fixing" });
  });
});

describe("fetchVsBasics", () => {
  it("tallies basics and total lands", () => {
    const entries = parseDecklist(
      [
        "11 Forest  #land",
        "5 Island  #land",
        "1 Command Tower  #land #fixing",
        "1 Sol Ring  #ramp",
      ].join("\n"),
    );
    const audit = fetchVsBasics(entries);
    expect(audit.basics.get("Forest")).toBe(11);
    expect(audit.basics.get("Island")).toBe(5);
    expect(audit.totalBasics).toBe(16);
    expect(audit.totalLands).toBe(17);
  });
});

describe("priceBreakdown", () => {
  const cards = [
    { count: 1, name: "Chase", priceUsd: 50 },
    { count: 4, name: "Cheap", priceUsd: 2 },
    { count: 1, name: "Mid", priceUsd: 16 },
    { count: 1, name: "Unpriced", priceUsd: null },
  ];
  it("totals price weighted by copy count and counts missing copies", () => {
    const result = priceBreakdown(cards, { threshold: 15, top: 10 });
    expect(result.total).toBe(50 + 8 + 16);
    expect(result.missing).toBe(1);
  });
  it("flags proxy candidates at or above the threshold and totals without them", () => {
    const result = priceBreakdown(cards, { threshold: 15, top: 10 });
    expect(result.proxies.map((card) => card.name)).toEqual(["Chase", "Mid"]);
    expect(result.totalWithoutProxies).toBe(8);
  });
  it("returns the priciest cards up to the top limit, unit-price descending", () => {
    const result = priceBreakdown(cards, { threshold: 15, top: 2 });
    expect(result.top.map((card) => card.name)).toEqual(["Chase", "Mid"]);
  });
});
