import { describe, expect, it } from "vitest";

import { parseDecklist } from "./decklist.ts";
import { EXPORT_FORMATS, formatExport, isExportFormat } from "./export.ts";

describe("isExportFormat", () => {
  it("accepts known formats", () => {
    for (const format of EXPORT_FORMATS) {
      expect(isExportFormat(format)).toBe(true);
    }
  });

  it("rejects unknown formats", () => {
    expect(isExportFormat("mtggoldfish")).toBe(false);
    expect(isExportFormat("")).toBe(false);
  });
});

describe("formatExport", () => {
  it("strips comments and inline role tags to a clean list", () => {
    const entries = parseDecklist(
      [
        "// Commander: Riku of Two Reflections",
        "",
        "1 Riku of Two Reflections  #commander",
        "// Ramp",
        "1 Sol Ring  #ramp",
        "8 Forest  #land",
      ].join("\n"),
    );
    expect(formatExport(entries)).toBe(
      "1 Riku of Two Reflections\n1 Sol Ring\n8 Forest\n",
    );
  });

  it("emits identical clean output for the non-moxfield formats", () => {
    const entries = parseDecklist("1 Sol Ring  #ramp\n2 Island");
    const text = formatExport(entries, "text");
    expect(formatExport(entries, "manabox")).toBe(text);
    expect(formatExport(entries, "arena")).toBe(text);
  });

  it("preserves inline tags for moxfield, single-spaced, comments dropped", () => {
    const entries = parseDecklist(
      "// Ramp\n1 Sol Ring  #ramp #artifact\n2 Island",
    );
    expect(formatExport(entries, "moxfield")).toBe(
      "1 Sol Ring #ramp #artifact\n2 Island\n",
    );
  });

  it("returns an empty string for no entries", () => {
    expect(formatExport([])).toBe("");
  });
});
