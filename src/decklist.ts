/**
 * Decklist parsing for the workspace's `<count> <card name>  #tag #tag` format.
 *
 * Format rules:
 *  - `//` comment lines and blank lines are ignored.
 *  - Each entry begins with an integer count, then the card name.
 *  - Optional inline role tags follow the name; each tag is a whitespace-delimited token
 *    starting with `#`. The name ends at the first such token. Tags are stored without `#`.
 */

/** A single parsed decklist entry. */
export type DeckEntry = {
  /** Number of copies (always 1 in singleton Commander, except basic lands). */
  readonly count: number;
  /** The clean card name, with trailing whitespace and any inline tags removed. */
  readonly name: string;
  /** Role/archetype tags (without the leading `#`), in source order. */
  readonly tags: readonly string[];
};

/**
 * The set of clean card names present in a decklist (lowercased for case-insensitive lookup).
 * @param entries - Parsed decklist entries.
 * @returns A set of lowercased card names.
 */
export function deckNameSet(
  entries: readonly DeckEntry[],
): ReadonlySet<string> {
  return new Set(entries.map((entry) => entry.name.toLowerCase()));
}

/**
 * Parse a full decklist file's text into entries, skipping comments and blank lines.
 * @param text - The full contents of a `list.txt` decklist.
 * @returns All parsed entries in source order.
 */
export function parseDecklist(text: string): DeckEntry[] {
  const entries: DeckEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const entry = parseLine(line);
    if (entry !== null) entries.push(entry);
  }
  return entries;
}

/**
 * Parse a single non-comment decklist line into a {@link DeckEntry}.
 * @param line - A raw line such as `1 Avenger of Zendikar  #tokens #payoff`.
 * @returns The parsed entry, or `null` if the line is not a valid `<count> <name>` entry.
 */
export function parseLine(line: string): DeckEntry | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("//")) return null;

  const match = /^(\d+)\s+(.*)$/.exec(trimmed);
  if (match === null) return null;

  const count = Number.parseInt(match[1] ?? "", 10);
  const remainder = (match[2] ?? "").trim();
  if (!Number.isFinite(count) || remainder.length === 0) return null;

  const tokens = remainder.split(/\s+/);
  const firstTagIndex = tokens.findIndex((token) => token.startsWith("#"));

  if (firstTagIndex === -1) {
    return { count, name: remainder, tags: [] };
  }

  const name = tokens.slice(0, firstTagIndex).join(" ");
  const tags = tokens
    .slice(firstTagIndex)
    .filter((token) => token.startsWith("#"))
    .map((token) => token.slice(1))
    .filter((tag) => tag.length > 0);

  return { count, name, tags };
}

/**
 * Total number of cards across all entries (sum of counts).
 * @param entries - Parsed decklist entries.
 * @returns The total card count (should be {@link TARGET_DECK_SIZE} for a legal deck).
 */
export function totalCount(entries: readonly DeckEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}
