import { describe, expect, it } from "vitest";

import type { CardRow } from "../db/model.ts";

import { colorMask } from "../db/model.ts";
import {
  commanderSlug,
  crossReference,
  type EdhrecCardView,
  parseEdhrecPage,
  selectCardviews,
} from "./model.ts";

const card = (over: Partial<CardRow>): CardRow => ({
  ci_mask: 0,
  cmc: 0,
  color_identity: "",
  edhrec_rank: null,
  game_changer: 0,
  keywords: "",
  mana_cost: "",
  name: "X",
  name_lower: "x",
  oracle_id: "id",
  oracle_text: "",
  price_usd: null,
  set_code: "xxx",
  type_line: "Instant",
  ...over,
});

const view = (over: Partial<EdhrecCardView>): EdhrecCardView => ({
  name: "Card",
  numDecks: 10,
  potentialDecks: 100,
  synergy: 0.1,
  ...over,
});

describe("commanderSlug", () => {
  it("slugs a plain name", () => {
    expect(commanderSlug("Riku of Two Reflections")).toBe(
      "riku-of-two-reflections",
    );
  });

  it("drops commas and apostrophes", () => {
    expect(commanderSlug("Wort, the Raidmother")).toBe("wort-the-raidmother");
    expect(commanderSlug("Gonti, Lord of Luxury")).toBe("gonti-lord-of-luxury");
  });

  it("strips diacritics and uses the front face of a DFC name", () => {
    expect(commanderSlug("Jüber // Back")).toBe("juber");
  });
});

describe("parseEdhrecPage", () => {
  const page = {
    container: {
      json_dict: {
        cardlists: [
          {
            cardviews: [
              {
                name: "Sol Ring",
                num_decks: 90,
                potential_decks: 100,
                synergy: 0.5,
              },
              { name: 42, num_decks: 1, potential_decks: 2, synergy: 0 },
            ],
            header: "Top Cards",
            tag: "topcards",
          },
          "garbage",
        ],
      },
    },
  };

  it("extracts cardlists and skips malformed cardviews", () => {
    const parsed = parseEdhrecPage(page);
    expect(parsed?.cardlists).toHaveLength(1);
    expect(parsed?.cardlists[0]?.cards).toEqual([
      { name: "Sol Ring", numDecks: 90, potentialDecks: 100, synergy: 0.5 },
    ]);
  });

  it("returns null when the shape is wrong", () => {
    expect(parseEdhrecPage(null)).toBeNull();
    expect(parseEdhrecPage({})).toBeNull();
    expect(parseEdhrecPage({ container: { json_dict: {} } })).toBeNull();
  });
});

describe("selectCardviews", () => {
  it("flattens wanted tags and de-duplicates by name", () => {
    const page = {
      cardlists: [
        {
          cards: [view({ name: "A" }), view({ name: "B" })],
          header: "",
          tag: "highsynergycards",
        },
        {
          cards: [view({ name: "b" }), view({ name: "C" })],
          header: "",
          tag: "topcards",
        },
        { cards: [view({ name: "Z" })], header: "", tag: "gamechangers" },
      ],
    };
    expect(selectCardviews(page).map((v) => v.name)).toEqual(["A", "B", "C"]);
  });
});

describe("crossReference", () => {
  const gu = colorMask(["G", "U"]);

  it("skips owned cards and filters out-of-identity and game changers", () => {
    const resolve = (key: string): CardRow | undefined =>
      ({
        "cyclonic rift": card({ ci_mask: colorMask(["U"]), game_changer: 1 }),
        "lightning bolt": card({ ci_mask: colorMask(["R"]) }),
        "tatyova, benthic druid": card({
          ci_mask: gu,
          price_usd: 1.5,
          type_line: "Legendary Creature",
        }),
      })[key];

    const recs = crossReference(
      [
        view({ name: "Sol Ring" }), // owned
        view({ name: "Cyclonic Rift" }), // game changer -> dropped
        view({ name: "Lightning Bolt" }), // off-identity -> dropped
        view({
          name: "Tatyova, Benthic Druid",
          numDecks: 50,
          potentialDecks: 200,
        }),
        view({ name: "Some Uncached Card" }), // unresolved -> kept, flagged
      ],
      {
        idMask: gu,
        includeGameChangers: false,
        limit: 25,
        owned: new Set(["sol ring"]),
        resolve,
      },
    );

    expect(recs.map((r) => r.name)).toEqual([
      "Tatyova, Benthic Druid",
      "Some Uncached Card",
    ]);
    expect(recs[0]).toMatchObject({
      inclusion: 0.25,
      priceUsd: 1.5,
      resolved: true,
    });
    expect(recs[1]?.resolved).toBe(false);
  });

  it("keeps game changers when asked and honours the limit", () => {
    const resolve = (): CardRow => card({ ci_mask: gu, game_changer: 1 });
    const recs = crossReference(
      [view({ name: "A" }), view({ name: "B" }), view({ name: "C" })],
      {
        idMask: gu,
        includeGameChangers: true,
        limit: 2,
        owned: new Set(),
        resolve,
      },
    );
    expect(recs).toHaveLength(2);
  });
});
