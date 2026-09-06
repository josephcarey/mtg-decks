/**
 * CLI entry point for the deck tooling.
 *
 * PR A ships a minimal dispatcher so the scaffold has a real entry point and CI gates
 * exist before feature code lands. PR B adds the `fetch-bulk`, `build-db`, `analyze`,
 * `discover`, `tags`, and `synergy` subcommands.
 */
import { formatVersion } from "./version.ts";

function main(): void {
  process.stdout.write(`${formatVersion()}\n`);
}

main();
