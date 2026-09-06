/**
 * Pure generators for the committed, human+AI-readable reference artifacts derived from the
 * SQLite cache: the oracle-tag catalog and the per-deck card knowledge cache. Kept pure so
 * the CLI only handles file I/O.
 */
import type { CardRow, TagRow } from "./db/model.ts";

/** A single card's pinned knowledge, sourced from the bulk cache. */
type CardKnowledge = {
  readonly cmc: number;
  readonly gameChanger: boolean;
  readonly manaCost: string;
  readonly name: string;
  readonly oracleText: string;
  readonly typeLine: string;
};

/**
 * Convert a {@link CardRow} to the {@link CardKnowledge} shape used by the card cache.
 * @param row - A resolved card row.
 * @returns The pinned-knowledge projection.
 */
export function cardKnowledgeFromRow(row: CardRow): CardKnowledge {
  return {
    cmc: row.cmc,
    gameChanger: row.game_changer === 1,
    manaCost: row.mana_cost,
    name: row.name,
    oracleText: row.oracle_text,
    typeLine: row.type_line,
  };
}

/**
 * Render a per-deck card knowledge cache (`reference/cards/<slug>.md`) that pins real card
 * text so future sessions don't hallucinate.
 * @param deckName - The deck's display name.
 * @param cards - Pinned knowledge for each card, in decklist order.
 * @param date - The bulk export date to record in the header.
 * @returns The full markdown document.
 */
export function formatCardCacheMarkdown(
  deckName: string,
  cards: readonly CardKnowledge[],
  date: string,
): string {
  const header = [
    `# Card knowledge cache — ${deckName}`,
    "",
    `Real card text pinned from Scryfall bulk data (oracle_cards, updated ${date}). ` +
      "Regenerate with `bun run deck gen-reference`.",
    "",
    `Cards: ${cards.length}`,
    "",
  ].join("\n");

  const sections = cards.map((card) => {
    const cost = card.manaCost.length > 0 ? card.manaCost : "—";
    const gc = card.gameChanger ? " · ⚠ Game Changer" : "";
    const text =
      card.oracleText.length > 0 ? card.oracleText : "_(no oracle text)_";
    return [
      `## ${card.name}`,
      "",
      `- **Mana cost:** ${cost} · **MV:** ${card.cmc}${gc}`,
      `- **Type:** ${card.typeLine}`,
      "",
      text,
      "",
    ].join("\n");
  });

  return `${header}${sections.join("\n")}`;
}

/**
 * Render `reference/oracle-tags.txt`: a header comment block followed by one
 * `slug<TAB>label<TAB>description` line per tag, sorted by slug.
 * @param tags - All tags (any order; this sorts by slug).
 * @param date - The bulk export date to record in the header.
 * @returns The full file contents.
 */
export function formatOracleTagsFile(
  tags: readonly TagRow[],
  date: string,
): string {
  const sorted = [...tags].sort((a, b) => a.slug.localeCompare(b.slug));
  const header = [
    "# Scryfall oracle (function) tag catalog",
    "# Source: Scryfall bulk data (oracle_tags export)",
    `# Bulk updated_at: ${date}`,
    `# Total tags: ${sorted.length}`,
    "# Format: slug<TAB>label<TAB>description",
    "# Note: `cycle-*` slugs are Tagger's internal per-set bookkeeping (usually not useful",
    "#       for card search).",
    "",
  ].join("\n");
  const body = sorted
    .map(
      (tag) =>
        `${tag.slug}\t${tag.label}\t${tag.description.replaceAll(/\s+/g, " ").trim()}`,
    )
    .join("\n");
  return `${header}${body}\n`;
}
