/**
 * EDHREC page fetch + on-disk cache. Isolated behind this thin adapter because EDHREC is an
 * unofficial source (no license grant), so we cache hard and stay polite: a cached JSON under
 * `data/edhrec/` is reused until it is older than the TTL. Native Bun `fetch` works here.
 *
 * All parsing/business logic lives in the pure {@link "./model.ts"}; this file only does I/O and
 * is excluded from coverage like the other network glue.
 */
import { errAsync, ResultAsync } from "neverthrow";
import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

import { DATA_DIR } from "../constants.ts";
import { commanderSlug } from "./model.ts";

/** Directory holding cached EDHREC page JSON. */
const EDHREC_CACHE_DIR = join(DATA_DIR, "edhrec");

/** Default cache lifetime: one day, matching EDHREC's own refresh cadence. */
const EDHREC_TTL_MS = 24 * 60 * 60 * 1000;

const EDHREC_BASE = "https://json.edhrec.com/pages/commanders";

/** A structured error from the EDHREC pipeline. */
type EdhrecError = { readonly kind: "edhrec"; readonly message: string };

const edhrecError = (message: string): EdhrecError => ({
  kind: "edhrec",
  message,
});

/** Local cache path for a commander slug's page JSON (optionally a theme subpage). */
const cachePath = (slug: string, theme?: string): string =>
  join(
    EDHREC_CACHE_DIR,
    theme === undefined ? `${slug}.json` : `${slug}__${theme}.json`,
  );

const isFresh = async (path: string, ttlMs: number): Promise<boolean> => {
  const info = await stat(path).catch(() => null);
  if (info === null) return false;
  return Date.now() - info.mtimeMs < ttlMs;
};

/**
 * Fetch a commander's EDHREC page JSON, using the on-disk cache when it is still fresh.
 * @param commander - Commander name (slugged internally) or an explicit EDHREC slug.
 * @param theme - Optional theme slug (e.g. `theft`) to fetch that theme's subpage.
 * @param ttlMs - Cache lifetime in milliseconds (default {@link EDHREC_TTL_MS}).
 * @returns The parsed JSON body, or an {@link EdhrecError}.
 */
export function fetchCommanderPage(
  commander: string,
  theme?: string,
  ttlMs: number = EDHREC_TTL_MS,
): ResultAsync<unknown, EdhrecError> {
  const slug = commander.includes(" ") ? commanderSlug(commander) : commander;
  if (slug.length === 0) return errAsync(edhrecError("empty commander name"));
  const path = cachePath(slug, theme);
  const url =
    theme === undefined
      ? `${EDHREC_BASE}/${slug}.json`
      : `${EDHREC_BASE}/${slug}/${theme}.json`;

  return ResultAsync.fromPromise(
    (async (): Promise<unknown> => {
      if (await isFresh(path, ttlMs)) {
        return (await Bun.file(path).json()) as unknown;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const suffix = theme === undefined ? "" : ` theme "${theme}"`;
        throw new Error(
          `EDHREC ${String(response.status)} for slug "${slug}"${suffix} — check the commander name`,
        );
      }
      const body = (await response.json()) as unknown;
      await mkdir(dirname(path), { recursive: true });
      await Bun.write(path, JSON.stringify(body));
      return body;
    })(),
    (error) =>
      edhrecError(error instanceof Error ? error.message : String(error)),
  );
}
