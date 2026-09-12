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
    expect(isExportFormat("moxfield")).toBe(false);
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

  it("emits identical clean output for every format", () => {
    const entries = parseDecklist("1 Sol Ring  #ramp\n2 Island");
    const text = formatExport(entries, "text");
    expect(formatExport(entries, "manabox")).toBe(text);
    expect(formatExport(entries, "arena")).toBe(text);
  });

  it("returns an empty string for no entries", () => {
    expect(formatExport([])).toBe("");
  });
});
