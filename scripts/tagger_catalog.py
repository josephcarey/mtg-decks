#!/usr/bin/env python3
"""Fetch the full Scryfall Tagger ORACLE_CARD_TAG (function tag) catalog.

Scryfall's Tagger dataset powers the `otag:` (function) search filter. The complete list
of function-tag slugs is only exposed via the Tagger GraphQL API (not the normal REST API),
so this script walks that API and writes `reference/oracle-tags.txt`.

Environment quirk (same as scryfall.py):
  * This environment's `python3` has SSL certificate failures with `urllib`/`requests`, so
    we shell out to **`curl`** (via subprocess) for every request.

Recipe (verified working):
  1. GET https://tagger.scryfall.com/ with a cookie jar; scrape the CSRF token from the
     `<meta name="csrf-token" content="...">` tag.
  2. POST https://tagger.scryfall.com/graphql with headers Content-Type/Accept JSON,
     `X-CSRF-Token: <token>`, and the same cookie jar.
  3. Query: `{ tags(input:{type:ORACLE_CARD_TAG, page:N}) { total results { name slug category } } }`
     - `type` is a TagType enum with exactly two values: ORACLE_CARD_TAG (function/otags) and
       ILLUSTRATION_TAG (art tags).
     - Input accepts `type` and `page` only (NO perPage; fixed 100 results per page).
     - total for ORACLE_CARD_TAG = 4524 => pages 1..46.
  4. Tagger rate-limits: sleep briefly between pages and retry pages that come back without a
     `data` field. GraphQL introspection (__schema/__type) is disabled.

Usage:
    python3 scripts/tagger_catalog.py           # writes/overwrites reference/oracle-tags.txt
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from typing import Dict, List, Optional, Tuple

TAGGER_HOME = "https://tagger.scryfall.com/"
TAGGER_GRAPHQL = "https://tagger.scryfall.com/graphql"
TAG_TYPE = "ORACLE_CARD_TAG"
PAGE_SIZE = 100  # Tagger fixes this; not configurable.
MAX_ATTEMPTS = 12
PAGE_SLEEP = 0.3
CSRF_META_RE = re.compile(r'<meta name="csrf-token" content="([^"]+)"')

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "reference",
    "oracle-tags.txt",
)
COOKIE_JAR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), ".tagger-cookies.txt"
)


def get_csrf_token() -> str:
    """Fetch the Tagger home page and scrape the CSRF token, seeding the cookie jar."""
    proc = subprocess.run(
        ["curl", "-sS", "--fail", "-c", COOKIE_JAR, TAGGER_HOME],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Failed to load Tagger home (exit {proc.returncode}): {proc.stderr}")
    match = CSRF_META_RE.search(proc.stdout)
    if not match:
        raise RuntimeError("Could not find csrf-token meta tag in Tagger home page.")
    return match.group(1)


def fetch_page(token: str, page: int) -> Optional[dict]:
    """POST a single page query. Returns parsed JSON, or None on a retryable failure."""
    query = (
        "{ tags(input:{type:%s, page:%d}) { total results { name slug category } } }"
        % (TAG_TYPE, page)
    )
    payload = json.dumps({"query": query})
    proc = subprocess.run(
        [
            "curl",
            "-sS",
            "-b",
            COOKIE_JAR,
            "-c",
            COOKIE_JAR,
            "-X",
            "POST",
            TAGGER_GRAPHQL,
            "-H",
            "Content-Type: application/json",
            "-H",
            "Accept: application/json",
            "-H",
            f"X-CSRF-Token: {token}",
            "-d",
            payload,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if proc.returncode != 0:
        return None
    try:
        body = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None
    # A rate-limited / rejected response may lack the `data` field.
    if not isinstance(body, dict) or body.get("data") is None:
        return None
    return body


def fetch_page_with_retry(token: str, page: int) -> Tuple[Optional[dict], str]:
    """Fetch a page with retry/backoff. Returns (body_or_None, token_possibly_refreshed)."""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        body = fetch_page(token, page)
        if body is not None:
            return body, token
        # Backoff; refresh the CSRF token on later attempts in case it expired.
        backoff = min(0.6 * attempt, 2.5)
        time.sleep(backoff)
        if attempt >= MAX_ATTEMPTS - 4:
            try:
                token = get_csrf_token()
            except RuntimeError:
                pass
    return None, token


def main() -> int:
    print("Fetching Scryfall Tagger ORACLE_CARD_TAG catalog...")
    try:
        token = get_csrf_token()
    except RuntimeError as exc:
        print(f"[error] {exc}", file=sys.stderr)
        return 1
    print("  Got CSRF token; querying page 1 for total count...")

    first, token = fetch_page_with_retry(token, 1)
    if first is None:
        print("[error] Could not fetch page 1 after retries (Tagger auth/rate-limit).",
              file=sys.stderr)
        return 1

    total = first["data"]["tags"]["total"]
    pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    print(f"  Total tags reported: {total}  ({pages} pages of {PAGE_SIZE})")

    tags: Dict[str, str] = {}  # slug -> name
    failed_pages: List[int] = []

    def absorb(body: dict) -> None:
        for row in body["data"]["tags"]["results"]:
            slug = row.get("slug")
            name = row.get("name", "")
            if slug:
                tags[slug] = name

    absorb(first)
    print(f"  Page 1/{pages}: {len(tags)} tags so far")

    for page in range(2, pages + 1):
        time.sleep(PAGE_SLEEP)
        body, token = fetch_page_with_retry(token, page)
        if body is None:
            failed_pages.append(page)
            print(f"  Page {page}/{pages}: FAILED after retries", file=sys.stderr)
            continue
        absorb(body)
        if page % 5 == 0 or page == pages:
            print(f"  Page {page}/{pages}: {len(tags)} tags so far")

    if failed_pages:
        print(f"[warn] {len(failed_pages)} page(s) failed: {failed_pages}", file=sys.stderr)
        print("[warn] Writing the partial catalog collected so far (not fabricating).",
              file=sys.stderr)

    # Write the catalog: `slug\tname`, sorted by slug, with a header.
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as fh:
        fh.write(
            "# Scryfall Tagger function-tag catalog (source: Tagger GraphQL API)\n"
            f"# Tag type: {TAG_TYPE} (function / otag: search filter)\n"
            f"# Total reported by Tagger: {total}; slugs written here: {len(tags)}\n"
            "# Format: <slug>\\t<name>, sorted by slug.\n"
            "# Note: `cycle-*` slugs are Tagger's internal per-set bookkeeping and are\n"
            "#       usually NOT useful for card search.\n"
        )
        for slug in sorted(tags):
            fh.write(f"{slug}\t{tags[slug]}\n")

    # Clean up the cookie jar.
    try:
        os.remove(COOKIE_JAR)
    except OSError:
        pass

    print(f"\nWrote {len(tags)} tags to {OUTPUT_PATH}")
    if failed_pages:
        print(f"(Partial: {len(failed_pages)} page(s) missing out of {pages}.)")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
