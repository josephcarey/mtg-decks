/**
 * Decklist export formatting. Turns parsed {@link DeckEntry} lists into clean, paste-ready
 * plain-text output for external tools.
 *
 * ManaBox has no public write API and its Google Drive `.backup` file is an opaque,
 * app-private blob (see IDEAS.md research) — so the supported, non-destructive way in is its
 * deck **text import**, which accepts one `<count> <card name>` per line. That is exactly what
 * these formats emit: comments and inline role tags are stripped so nothing confuses the parser.
 */
import type { DeckEntry } from "./decklist.ts";

/** Supported export targets. All currently emit the same clean `<count> <name>` list. */
export const EXPORT_FORMATS = ["text", "manabox", "arena"] as const;

/** A supported export format name. */
type ExportFormat = (typeof EXPORT_FORMATS)[number];

/**
 * Render decklist entries as a clean, paste-ready list for the given target.
 *
 * Inline role tags and section comments are dropped; each entry becomes a single
 * `<count> <name>` line. The output is deterministic (source order preserved) and ends with a
 * trailing newline so it can be written straight to a file or piped to a clipboard.
 * @param entries - Parsed decklist entries.
 * @param format - The export target (all formats share the clean plain-text shape today).
 * @returns The formatted decklist text.
 */
export function formatExport(
  entries: readonly DeckEntry[],
  format: ExportFormat = "text",
): string {
  void format;
  const lines = entries.map((entry) => `${String(entry.count)} ${entry.name}`);
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
