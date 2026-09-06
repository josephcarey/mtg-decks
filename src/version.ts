/**
 * The workspace tooling version string.
 * Kept as a pure module-level constant so it is trivially testable.
 */
export const VERSION = "0.1.0";

/**
 * Format the tooling version for display on the CLI.
 * @param version - A semver-ish version string (defaults to {@link VERSION}).
 * @returns A human-readable version banner, e.g. `mtg-decks v0.1.0`.
 */
export function formatVersion(version: string = VERSION): string {
  return `mtg-decks v${version}`;
}
