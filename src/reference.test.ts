import { describe, expect, it } from "vitest";

import type { CardRow, TagRow } from "./db/model.ts";

import {
  cardKnowledgeFromRow,
  formatCardCacheMarkdown,
  formatOracleTagsFile,
} from "./reference.ts";

const tag = (slug: string, label: string, description: string): TagRow => ({
  aliases: "[]",
  child_ids: "[]",
  description,
  id: slug,
  label,
  parent_ids: "[]",
  slug,
});

describe("formatOracleTagsFile", () => {
  it("sorts by slug and writes tab-separated rows with a header", () => {
    const out = formatOracleTagsFile(
      [
        tag("ramp", "ramp", "Mana ramp."),
        tag("landfall", "landfall", "Lands\n  entering."),
      ],
      "2026-09-05",
    );
    expect(out).toContain("# Total tags: 2");
    expect(out).toContain("2026-09-05");
    const bodyLines = out
      .trim()
      .split("\n")
      .filter((line) => !line.startsWith("#") && line.length > 0);
    expect(bodyLines[0]).toBe("landfall\tlandfall\tLands entering.");
    expect(bodyLines[1]).toBe("ramp\tramp\tMana ramp.");
  });
});

const cardRow = (partial: Partial<CardRow>): CardRow => ({
  ci_mask: 0,
  cmc: 1,
  color_identity: "",
  edhrec_rank: 1,
  game_changer: 0,
  keywords: "[]",
  mana_cost: "{1}",
  name: "Sol Ring",
  name_lower: "sol ring",
  oracle_id: "o",
  oracle_text: "{T}: Add {C}{C}.",
  price_usd: 1.5,
  set_code: "cmr",
  type_line: "Artifact",
  ...partial,
});

describe("cardKnowledgeFromRow", () => {
  it("projects the pinned fields and flags game changers", () => {
    const k = cardKnowledgeFromRow(
      cardRow({ game_changer: 1, name: "Cyclonic Rift" }),
    );
    expect(k.gameChanger).toBe(true);
    expect(k.name).toBe("Cyclonic Rift");
  });
});

describe("formatCardCacheMarkdown", () => {
  it("renders a section per card with pinned text", () => {
    const out = formatCardCacheMarkdown(
      "Test Deck",
      [cardKnowledgeFromRow(cardRow({}))],
      "2026-09-05",
    );
    expect(out).toContain("# Card knowledge cache — Test Deck");
    expect(out).toContain("Cards: 1");
    expect(out).toContain("## Sol Ring");
    expect(out).toContain("{T}: Add {C}{C}.");
  });

  it("handles empty mana cost and oracle text", () => {
    const out = formatCardCacheMarkdown(
      "D",
      [cardKnowledgeFromRow(cardRow({ mana_cost: "", oracle_text: "" }))],
      "2026-09-05",
    );
    expect(out).toContain("**Mana cost:** —");
    expect(out).toContain("_(no oracle text)_");
  });
});
