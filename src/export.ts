/**
 * Decklist export formatting. Turns parsed {@link DeckEntry} lists into paste-ready plain-text
 * output for external tools.
 *
 * ManaBox has no public write API and its Google Drive `.backup` file is an opaque, app-private
 * blob (see IDEAS.md research) — so the supported way in is its deck **text import** (a bare
 * `<count> <card name>` per line). Moxfield's bulk-edit import instead reads inline
 * `<count> <name> #tag #tag`, which is exactly our source shape, so the `moxfield` target keeps
 * the role tags. Either way `//` section comments are dropped.
 */
import type { DeckEntry } from "./decklist.ts";

/** Supported export targets. `moxfield` preserves inline `#tags`; the rest emit a clean list. */
export const EXPORT_FORMATS = ["text", "manabox", "moxfield", "arena"] as const;

/** A supported export format name. */
type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Render decklist entries as a paste-ready list for the given target.
 *
 * Section comments are always dropped. Inline role tags are preserved only for `moxfield`
 * (`<count> <name> #tag #tag`, which its bulk-edit import turns into card tags); every other
 * target emits a bare `<count> <name>` line. Output is deterministic (source order) and
 * newline-terminated so it can be written straight to a file or piped to a clipboard.
 * @param entries - Parsed decklist entries.
 * @param format - The export target.
 * @returns The formatted decklist text.
 */
export function formatExport(
  entries: readonly DeckEntry[],
  format: ExportFormat = "text",
): string {
  const withTags = format === "moxfield";
  const lines = entries.map((entry) => {
    const base = `${String(entry.count)} ${entry.name}`;
    if (!withTags || entry.tags.length === 0) return base;
    return `${base} ${entry.tags.map((tag) => `#${tag}`).join(" ")}`;
  });
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

/**
 * Whether a string is a supported {@link ExportFormat}.
 * @param value - Candidate format name.
 * @returns `true` if the value is a known export format.
 */
export function isExportFormat(value: string): value is ExportFormat {
  return (EXPORT_FORMATS as readonly string[]).includes(value);
}
