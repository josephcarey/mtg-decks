import { describe, expect, it } from "vitest";

import { formatVersion, VERSION } from "./version.ts";

describe("formatVersion", () => {
  it("formats the default version", () => {
    expect(formatVersion()).toBe(`mtg-decks v${VERSION}`);
  });

  it("formats an explicit version", () => {
    expect(formatVersion("1.2.3")).toBe("mtg-decks v1.2.3");
  });
});
