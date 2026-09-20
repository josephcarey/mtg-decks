import { describe, expect, it } from "vitest";

import {
  buildCardRow,
  buildTagRow,
  ciSubsetOf,
  colorIdentityString,
  colorMask,
  ftsMatchQuery,
  isReadOnlySql,
  mergePrintingSummary,
  priceToNumber,
} from "./model.ts";

describe("colorMask", () => {
  it("computes WUBRG bits", () => {
    expect(colorMask(["G", "U"])).toBe(16 | 2);
    expect(colorMask([])).toBe(0);
    expect(colorMask(["w", "u", "b", "r", "g"])).toBe(31);
  });
  it("ignores unknown symbols", () => {
    expect(colorMask(["G", "X"])).toBe(16);
  });
});

describe("colorIdentityString", () => {
  it("sorts alphabetically", () => {
    expect(colorIdentityString(["U", "G"])).toBe("GU");
    expect(colorIdentityString(["R", "G", "W", "U", "B"])).toBe("BGRUW");
    expect(colorIdentityString([])).toBe("");
  });
});

describe("ciSubsetOf", () => {
  it("accepts subsets and rejects supersets", () => {
    const gu = colorMask(["G", "U"]);
    expect(ciSubsetOf(colorMask(["G"]), gu)).toBe(true);
    expect(ciSubsetOf(colorMask(["G", "U"]), gu)).toBe(true);
    expect(ciSubsetOf(colorMask([]), gu)).toBe(true);
    expect(ciSubsetOf(colorMask(["G", "W"]), gu)).toBe(false);
  });
});

describe("priceToNumber", () => {
  it("parses numeric strings", () => {
    expect(priceToNumber("0.26")).toBeCloseTo(0.26);
  });
  it("returns null for null/undefined/garbage", () => {
    expect(priceToNumber(null)).toBeNull();
    const missing: unknown = undefined;
    expect(priceToNumber(missing)).toBeNull();
    expect(priceToNumber("n/a")).toBeNull();
  });
});

describe("buildCardRow", () => {
  it("maps a full record", () => {
    const row = buildCardRow({
      cmc: 3,
      color_identity: ["U", "G"],
      edhrec_rank: 123,
      game_changer: false,
      games: ["paper"],
      keywords: ["Escape"],
      mana_cost: "{1}{G}{U}",
      name: "Uro, Titan of Nature's Wrath",
      oracle_id: "abc",
      oracle_text: "When Uro...",
      prices: { usd: "5.00" },
      released_at: "2020-01-24",
      set: "thb",
      set_name: "Theros Beyond Death",
      set_type: "expansion",
      type_line: "Legendary Creature — Elder Giant",
    });
    expect(row).not.toBeNull();
    expect(row?.name_lower).toBe("uro, titan of nature's wrath");
    expect(row?.color_identity).toBe("GU");
    expect(row?.ci_mask).toBe(colorMask(["G", "U"]));
    expect(row?.price_usd).toBeCloseTo(5);
    expect(row?.game_changer).toBe(0);
    expect(row?.set_code).toBe("thb");
    expect(JSON.parse(row?.keywords ?? "[]")).toEqual(["Escape"]);
  });

  it("flags game changers", () => {
    const row = buildCardRow({
      game_changer: true,
      name: "Cyclonic Rift",
      oracle_id: "x",
    });

    expect(row?.game_changer).toBe(1);
  });

  it("uses printing aggregates for paper availability, dates, and price", () => {
    const row = buildCardRow(
      {
        games: ["arena"],
        name: "Reprinted Card",
        oracle_id: "reprint",
        prices: { usd: "99.00" },
        released_at: "2024-01-01",
      },
      {
        firstReleasedAt: "2001-01-01",
        lastReleasedAt: "2026-01-01",
        paperAvailable: true,
        priceUsd: 0.2,
      },
    );
    expect(row).toMatchObject({
      first_released_at: "2001-01-01",
      last_released_at: "2026-01-01",
      paper_available: 1,
      price_usd: 0.2,
    });
  });

  describe("mergePrintingSummary", () => {
    it("tracks release range and the cheapest physical printing", () => {
      const first = mergePrintingSummary(undefined, {
        games: ["paper", "mtgo"],
        prices: { usd: "4.50" },
        released_at: "2020-01-01",
        set_type: "expansion",
      });
      const second = mergePrintingSummary(first, {
        games: ["paper"],
        prices: { usd: "0.25" },
        released_at: "2024-01-01",
        set_type: "commander",
      });
      expect(second).toEqual({
        firstReleasedAt: "2020-01-01",
        lastReleasedAt: "2024-01-01",
        paperAvailable: true,
        priceUsd: 0.25,
      });
    });

    it("ignores digital release dates and prices", () => {
      const summary = mergePrintingSummary(undefined, {
        games: ["arena"],
        prices: { usd: "0.01" },
        released_at: "2025-01-01",
        set_type: "alchemy",
      });
      expect(summary).toEqual({
        firstReleasedAt: "",
        lastReleasedAt: "",
        paperAvailable: false,
        priceUsd: null,
      });
    });

    it("excludes novelty set types even when games includes paper", () => {
      const summary = mergePrintingSummary(undefined, {
        games: ["paper"],
        prices: { usd: "1.00" },
        released_at: "2022-01-01",
        set_type: "funny",
      });
      expect(summary.paperAvailable).toBe(false);
      expect(summary.priceUsd).toBeNull();
    });
  });

  it("returns null without oracle_id or name", () => {
    expect(buildCardRow({ name: "X" })).toBeNull();
    expect(buildCardRow({ oracle_id: "x" })).toBeNull();
  });
});

describe("buildTagRow", () => {
  it("maps a record and defaults label to slug", () => {
    const row = buildTagRow({
      aliases: ["land-fall"],
      child_ids: [],
      description: "Cards that care about lands entering.",
      id: "t1",
      parent_ids: ["p1"],
      slug: "landfall",
    });
    expect(row?.label).toBe("landfall");
    expect(JSON.parse(row?.aliases ?? "[]")).toEqual(["land-fall"]);
    expect(JSON.parse(row?.parent_ids ?? "[]")).toEqual(["p1"]);
  });
  it("returns null without id or slug", () => {
    expect(buildTagRow({ slug: "x" })).toBeNull();
  });
});

describe("ftsMatchQuery", () => {
  it("quotes and ANDs terms", () => {
    expect(ftsMatchQuery("draw a card")).toBe('"draw" AND "a" AND "card"');
  });
  it("strips FTS metacharacters", () => {
    expect(ftsMatchQuery('sac*rifice "x"')).toBe('"sacrifice" AND "x"');
  });
  it("returns null for empty input", () => {
    expect(ftsMatchQuery("   ")).toBeNull();
  });
});

describe("isReadOnlySql", () => {
  it("allows single select/with/explain", () => {
    expect(isReadOnlySql("SELECT * FROM cards LIMIT 5")).toBe(true);
    expect(isReadOnlySql("  with x as (select 1) select * from x  ")).toBe(
      true,
    );
    expect(isReadOnlySql("SELECT 1;")).toBe(true);
  });
  it("rejects writes, DDL, and multiple statements", () => {
    expect(isReadOnlySql("DELETE FROM cards")).toBe(false);
    expect(isReadOnlySql("UPDATE cards SET name='x'")).toBe(false);
    expect(isReadOnlySql("DROP TABLE cards")).toBe(false);
    expect(isReadOnlySql("SELECT 1; DELETE FROM cards")).toBe(false);
    expect(isReadOnlySql("PRAGMA table_info(cards)")).toBe(false);
    expect(isReadOnlySql("")).toBe(false);
  });
});
