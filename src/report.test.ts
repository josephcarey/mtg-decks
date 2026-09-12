import { describe, expect, it } from "vitest";

import type { BasicsAudit, CurveSummary } from "./analysis.ts";
import type {
  AffinityResult,
  Candidate,
  DeckCardRow,
  TagListItem,
} from "./db/queries.ts";

import {
  formatAffinity,
  formatBasics,
  formatCount,
  formatCurve,
  formatDeckCards,
  formatDiscoverTable,
  formatGameChangerLint,
  formatPips,
  formatPrice,
  formatTagDistribution,
  formatTagList,
} from "./report.ts";

describe("formatAffinity", () => {
  const result: AffinityResult = {
    rows: [
      {
        children: [
          {
            lift: 8.5,
            seedCount: 6,
            share: 0.6,
            slug: "removal-fight",
            univCount: 40,
          },
        ],
        lift: 5,
        seedCount: 10,
        share: 0.1,
        slug: "niche",
        univCount: 20,
      },
    ],
    seedLabel: "otag:modal",
    seedN: 100,
    univN: 1000,
  };

  it("renders the header, a row, and the depth-2 child", () => {
    const out = formatAffinity(result, "lift");
    expect(out).toContain("otag:modal");
    expect(out).toContain("seed 100 cards");
    expect(out).toContain("niche");
    expect(out).toContain("5.0×");
    expect(out).toContain("↳");
    expect(out).toContain("removal-fight");
  });

  it("notes when nothing passes the filter", () => {
    const empty: AffinityResult = { ...result, rows: [] };
    expect(formatAffinity(empty, "lift")).toContain("no co-tags");
  });
});

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

describe("formatDeckCards", () => {
  const rows: DeckCardRow[] = [
    {
      corpusTags: ["commander"],
      count: 1,
      inlineTags: ["commander"],
      isCommander: true,
      name: "The Wandering Minstrel",
      resolved: true,
    },
    {
      corpusTags: ["landfall", "tokens"],
      count: 1,
      inlineTags: ["payoff"],
      isCommander: false,
      name: "Scute Swarm",
      resolved: true,
    },
    {
      corpusTags: [],
      count: 1,
      inlineTags: [],
      isCommander: false,
      name: "Brand New Card",
      resolved: false,
    },
  ];

  it("marks the commander, lists corpus tags, and counts unresolved", () => {
    const out = formatDeckCards("wandering-minstrel", rows);
    expect(out).toContain("wandering-minstrel: 3 cards (1 unresolved)");
    expect(out).toContain("★ 1x The Wandering Minstrel");
    expect(out).toContain("[landfall tokens]");
    expect(out).toContain("? 1x Brand New Card  [—]");
  });
});
