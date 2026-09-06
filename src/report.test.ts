import { describe, expect, it } from "vitest";

import type { BasicsAudit, CurveSummary } from "./analysis.ts";
import type { Candidate, TagListItem } from "./db/queries.ts";

import {
  formatBasics,
  formatCount,
  formatCurve,
  formatDiscoverTable,
  formatGameChangerLint,
  formatPips,
  formatPrice,
  formatTagDistribution,
  formatTagList,
} from "./report.ts";

describe("formatCount", () => {
  it("passes at exactly 100", () => {
    expect(formatCount(100)).toContain("100/100 ✓");
  });
  it("warns otherwise", () => {
    expect(formatCount(99)).toContain("⚠");
  });
});

describe("formatCurve", () => {
  it("reports average and 5+ count", () => {
    const curve: CurveSummary = {
      averageMv: 3.5,
      countAtFivePlus: 1,
      histogram: new Map([
        [2, 3],
        [6, 1],
      ]),
      nonlandCount: 4,
    };
    const out = formatCurve(curve);
    expect(out).toContain("avg MV 3.50");
    expect(out).toContain("1 at MV 5+");
    expect(out).toContain("MV  2");
  });
  it("collapses everything at MV 7+ into a single bucket", () => {
    const curve: CurveSummary = {
      averageMv: 7.5,
      countAtFivePlus: 3,
      histogram: new Map([
        [7, 1],
        [8, 1],
        [9, 1],
      ]),
      nonlandCount: 3,
    };
    const out = formatCurve(curve);
    const sevenPlusRows = out
      .split("\n")
      .filter((line) => line.includes("MV 7+"));
    expect(sevenPlusRows).toHaveLength(1);
    expect(sevenPlusRows[0]).toContain(" 3 ");
  });
});

describe("formatPips", () => {
  it("shows counts and percentages for present colors only", () => {
    const out = formatPips({ B: 0, G: 6, R: 0, U: 2, W: 0 });
    expect(out).toContain("G 6 (75%)");
    expect(out).toContain("U 2 (25%)");
    expect(out).not.toContain("W ");
  });
});

describe("formatBasics", () => {
  it("lists basics sorted by count", () => {
    const audit: BasicsAudit = {
      basics: new Map([
        ["Forest", 11],
        ["Island", 5],
      ]),
      totalBasics: 16,
      totalLands: 20,
    };
    const out = formatBasics(audit);
    expect(out).toContain("20 total, 16 basics");
    expect(out.indexOf("Forest")).toBeLessThan(out.indexOf("Island"));
  });
});

describe("formatPrice", () => {
  it("notes missing prices", () => {
    expect(formatPrice(146.5, 2)).toBe(
      "[e] Approx. deck price: $146.50 (2 without price data)",
    );
  });
  it("omits the note when complete", () => {
    expect(formatPrice(10, 0)).toBe("[e] Approx. deck price: $10.00");
  });
});

describe("formatTagDistribution", () => {
  it("lists tags with a header count", () => {
    const out = formatTagDistribution([
      { count: 30, tag: "landfall" },
      { count: 12, tag: "ramp" },
    ]);
    expect(out).toContain("[f] Tag distribution (2 tags):");
    expect(out).toContain("landfall");
    expect(out).toContain("ramp");
  });
});

describe("formatGameChangerLint", () => {
  it("passes clean when empty", () => {
    expect(formatGameChangerLint([])).toContain("none ✓");
  });
  it("lists offenders", () => {
    expect(formatGameChangerLint(["Cyclonic Rift"])).toContain("Cyclonic Rift");
  });
});

describe("formatDiscoverTable", () => {
  const owned: Candidate = {
    cmc: 3,
    edhrecRank: 100,
    name: "Scute Swarm",
    owned: true,
    priceUsd: 1.5,
    typeLine: "Creature",
  };
  const fresh: Candidate = {
    cmc: 4,
    edhrecRank: 200,
    name: "Felidar Retreat",
    owned: false,
    priceUsd: 2,
    typeLine: "Enchantment",
  };

  it("ranks new cards and marks owned ones with =", () => {
    const out = formatDiscoverTable("landfall", "Lands entering.", [
      owned,
      fresh,
    ]);
    expect(out).toContain("otag:landfall — Lands entering.");
    expect(out).toContain("=");
    expect(out).toMatch(/1 .*Felidar Retreat/);
  });

  it("handles the empty case", () => {
    expect(formatDiscoverTable("x", "d", [])).toContain("no candidates");
  });
});

describe("formatTagList", () => {
  it("renders matches", () => {
    const items: TagListItem[] = [
      { description: "Lands entering.", label: "landfall", slug: "landfall" },
    ];
    expect(formatTagList(items)).toContain("landfall — Lands entering.");
  });
  it("notes no matches", () => {
    expect(formatTagList([])).toBe("(no matching tags)");
  });
});
