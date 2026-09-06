import { errAsync, okAsync, ResultAsync } from "neverthrow";
/**
 * Scryfall bulk-data access. Bun's native `fetch` works here (the historical SSL issue was
 * specific to Python's urllib), so no curl subprocess is needed.
 *
 * Bulk exports are large gzipped JSONL files whose download URIs are dated and change daily,
 * so the URI is always resolved fresh from the API rather than hardcoded.
 */
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { DATA_DIR } from "../constants.ts";

/** The bulk export types this workspace consumes. */
export type BulkType = "oracle_cards" | "oracle_tags";

/** Result of downloading a bulk export to disk. */
type BulkDownload = {
  readonly bytes: number;
  readonly path: string;
  readonly type: BulkType;
  readonly updatedAt: string;
};

/** Metadata describing a resolved bulk export. */
type BulkInfo = {
  readonly compressedSize: number;
  readonly downloadUri: string;
  readonly type: BulkType;
  readonly updatedAt: string;
};

const BULK_API = "https://api.scryfall.com/bulk-data";

/** A structured error from the bulk pipeline. */
type BulkError = { readonly kind: "bulk"; readonly message: string };

const bulkError = (message: string): BulkError => ({ kind: "bulk", message });

/**
 * Local filesystem path for a bulk export's gzipped JSONL file.
 * @param type - The bulk export type.
 * @returns A repo-relative path under {@link DATA_DIR}.
 */
export function bulkPath(type: BulkType): string {
  return join(DATA_DIR, `${type}.jsonl.gz`);
}

/**
 * Download a single bulk export's gzipped JSONL to {@link DATA_DIR}.
 * @param type - The bulk export type to download.
 * @returns The {@link BulkDownload} record, or a {@link BulkError} on failure.
 */
export function downloadBulk(
  type: BulkType,
): ResultAsync<BulkDownload, BulkError> {
  const destination = bulkPath(type);
  return resolveBulkUri(type).andThen((info) =>
    ResultAsync.fromPromise(
      (async (): Promise<BulkDownload> => {
        await mkdir(dirname(destination), { recursive: true });
        const response = await fetch(info.downloadUri);
        if (!response.ok || response.body === null) {
          throw new Error(`download ${type}: HTTP ${response.status}`);
        }
        const bytes = await response.arrayBuffer();
        await Bun.write(destination, bytes);
        return {
          bytes: bytes.byteLength,
          path: destination,
          type,
          updatedAt: info.updatedAt,
        };
      })(),
      (error) => bulkError(String(error)),
    ),
  );
}

/**
 * Resolve the current download URI + metadata for a bulk export.
 * @param type - The bulk export type (`oracle_cards` or `oracle_tags`).
 * @returns The resolved {@link BulkInfo}, or a {@link BulkError} on network/parse failure.
 */
export function resolveBulkUri(
  type: BulkType,
): ResultAsync<BulkInfo, BulkError> {
  return ResultAsync.fromPromise(
    fetch(`${BULK_API}/${type}`, {
      headers: { Accept: "application/json" },
    }).then((response) => {
      if (!response.ok) {
        throw new Error(
          `Scryfall returned HTTP ${response.status} for ${type}`,
        );
      }
      return response.json() as Promise<{
        compressed_size?: number;
        jsonl_download_uri?: string;
        updated_at?: string;
      }>;
    }),
    (error) => bulkError(`resolve ${type}: ${String(error)}`),
  ).andThen((body) => {
    if (typeof body.jsonl_download_uri !== "string") {
      return errAsync(bulkError(`resolve ${type}: missing jsonl_download_uri`));
    }
    return okAsync<BulkInfo, BulkError>({
      compressedSize: body.compressed_size ?? 0,
      downloadUri: body.jsonl_download_uri,
      type,
      updatedAt: body.updated_at ?? "unknown",
    });
  });
}
