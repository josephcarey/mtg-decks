import { describe, expect, it } from "vitest";

import {
  deckNameSet,
  parseDecklist,
  parseLine,
  totalCount,
} from "./decklist.ts";

describe("parseLine", () => {
  it("parses a tagged single-copy line", () => {
    expect(parseLine("1 Avenger of Zendikar  #tokens #payoff #wincon")).toEqual(
      {
        count: 1,
        name: "Avenger of Zendikar",
        tags: ["tokens", "payoff", "wincon"],
      },
    );
  });

  it("parses an untagged line", () => {
    expect(parseLine("1 Sol Ring")).toEqual({
      count: 1,
      name: "Sol Ring",
      tags: [],
    });
  });

  it("parses a basic land with a count greater than one", () => {
    expect(parseLine("11 Forest  #land")).toEqual({
      count: 11,
      name: "Forest",
      tags: ["land"],
    });
  });

  it("keeps punctuation and commas in the card name", () => {
    expect(parseLine("1 Uro, Titan of Nature's Wrath  #ramp #draw")).toEqual({
      count: 1,
      name: "Uro, Titan of Nature's Wrath",
      tags: ["ramp", "draw"],
    });
  });

  it("treats a single space before the tag as still splitting on the tag token", () => {
    expect(parseLine("1 Command Tower #land #fixing")).toEqual({
      count: 1,
      name: "Command Tower",
      tags: ["land", "fixing"],
    });
  });

  it("returns null for comment lines", () => {
    expect(parseLine("// Ramp: rocks & fixing")).toBeNull();
  });

  it("returns null for blank lines", () => {
    expect(parseLine("   ")).toBeNull();
  });

  it("returns null for lines without a leading count", () => {
    expect(parseLine("Sol Ring")).toBeNull();
  });
});

describe("parseDecklist", () => {
  const sample = [
    "// Commander",
    "1 The Wandering Minstrel  #commander",
    "",
    "// Ramp",
    "1 Sol Ring  #ramp",
    "11 Forest  #land",
  ].join("\n");

  it("skips comments and blanks and parses entries in order", () => {
    const entries = parseDecklist(sample);
    expect(entries).toHaveLength(3);
    expect(entries[0]?.name).toBe("The Wandering Minstrel");
    expect(entries[2]).toEqual({ count: 11, name: "Forest", tags: ["land"] });
  });

  it("handles CRLF line endings", () => {
    const entries = parseDecklist(
      "1 Sol Ring  #ramp\r\n1 Arcane Signet  #ramp",
    );
    expect(entries).toHaveLength(2);
  });
});

describe("totalCount", () => {
  it("sums counts across entries", () => {
    const entries = parseDecklist("1 Sol Ring\n11 Forest\n5 Island");
    expect(totalCount(entries)).toBe(17);
  });
});

describe("deckNameSet", () => {
  it("lowercases names for case-insensitive membership", () => {
    const set = deckNameSet(parseDecklist("1 Sol Ring\n1 Command Tower"));
    expect(set.has("sol ring")).toBe(true);
    expect(set.has("command tower")).toBe(true);
    expect(set.has("island")).toBe(false);
  });
});
