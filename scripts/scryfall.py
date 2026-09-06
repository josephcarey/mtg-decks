#!/usr/bin/env python3
"""Scryfall-backed decklist analyzer + card discovery for the MTG Commander workspace.

Two modes:

  1. Analyze mode (default): `scryfall.py <decklist.txt>` reads a decklist file (the
     workspace's `<count> <card name>` format with optional inline `#tags`, and `//` comment
     lines) and reports:
       (a) total card count with a pass/fail check against 100,
       (b) mana curve — average mana value (MV), a histogram, and the count of cards at MV 5+,
       (c) color pip ratio across all mana costs,
       (d) a fetch-vs-basics note listing basic land counts,
       (e) total deck price using Scryfall `prices.usd`, and
       (f) a distribution of the inline role tags.

  2. Discovery mode: `scryfall.py --discover <otag-slug> [...]` queries Scryfall's Tagger
     dataset (via the normal search API's `otag:` filter) for cards matching a function tag,
     filtered by color identity, price, and set, with the banned Game Changers list excluded
     by default, ranked by EDHREC popularity. `--list-tags [substr]` searches the local tag
     catalog (reference/oracle-tags.txt) for valid slugs offline.

Environment quirks (important):
  * This environment's `python3` has SSL certificate failures when using `urllib`/`requests`
    against Scryfall, so this script shells out to **`curl`** (via subprocess) instead.
  * Card data is fetched from the Scryfall `/cards/collection` endpoint, which accepts a
    maximum of **75 identifiers per POST**. We therefore batch requests in groups of 75.

Usage:
    python3 scripts/scryfall.py decks/wandering-minstrel/list.txt
    python3 scripts/scryfall.py --discover landfall --id gu --max-price 8 --limit 10 \
        --deck decks/wandering-minstrel/list.txt
    python3 scripts/scryfall.py --list-tags landfall

If the network is unavailable, the analyze mode's parsing / curve / pip / basics / tag
sections still run using whatever card data was retrievable; the price and curve sections
degrade gracefully and note how many cards could not be fetched.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.parse
from collections import Counter
from typing import Dict, List, Optional, Tuple

SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection"
SCRYFALL_SEARCH_URL = "https://api.scryfall.com/cards/search"
BATCH_SIZE = 75  # Scryfall /cards/collection hard limit: 75 identifiers per POST.
TARGET_DECK_SIZE = 100

ORACLE_TAGS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "reference",
    "oracle-tags.txt",
)

BASIC_LAND_NAMES = {"Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"}
PIP_COLORS = ["W", "U", "B", "R", "G"]
COLOR_NAMES = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}


def parse_decklist(path: str) -> List[Tuple[int, str, List[str]]]:
    """Parse a decklist file into a list of (count, card_name, tags) tuples.

    Line format: `<count> <card name>` with optional trailing inline role tags,
    each a whitespace-delimited token starting with `#` (two spaces before the
    first tag by convention), e.g.:

        1 Avenger of Zendikar  #payoff #tokens #landfall

    Parsing rules:
      * Split off the leading integer count.
      * In the remainder, find the first whitespace-delimited token that starts
        with `#`. Everything before it is the card name (trailing spaces stripped);
        everything from that token on is the tag list. Tags are stored without the
        leading `#`.
      * Lines with no `#` token have tags = [].

    Ignores blank lines and lines that start with `//`.
    """
    entries: List[Tuple[int, str, List[str]]] = []
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith("//"):
                continue
            parts = line.split(maxsplit=1)
            if len(parts) != 2 or not parts[0].isdigit():
                # Not a `<count> <name>` line; skip defensively.
                continue
            count = int(parts[0])
            remainder = parts[1]

            # Find the first whitespace-delimited token starting with '#'.
            tokens = remainder.split()
            tag_start = None
            for idx, tok in enumerate(tokens):
                if tok.startswith("#"):
                    tag_start = idx
                    break

            if tag_start is None:
                name = remainder.strip()
                tags: List[str] = []
            else:
                name = " ".join(tokens[:tag_start]).strip()
                tags = [tok.lstrip("#") for tok in tokens[tag_start:]
                        if tok.startswith("#") and tok.lstrip("#")]

            entries.append((count, name, tags))
    return entries


def curl_collection(names: List[str]) -> Tuple[Dict[str, dict], List[str]]:
    """Fetch card data for `names` via Scryfall /cards/collection using curl.

    Returns (data_by_lowercase_name, not_found_names). Network / parse failures are handled
    gracefully: on failure the whole batch is reported as not-found.
    """
    data: Dict[str, dict] = {}
    not_found: List[str] = []

    for start in range(0, len(names), BATCH_SIZE):
        batch = names[start : start + BATCH_SIZE]
        payload = json.dumps({"identifiers": [{"name": n} for n in batch]})
        try:
            proc = subprocess.run(
                [
                    "curl",
                    "-sS",
                    "--fail",
                    "-X",
                    "POST",
                    SCRYFALL_COLLECTION_URL,
                    "-H",
                    "Content-Type: application/json",
                    "-H",
                    "Accept: application/json",
                    "-d",
                    payload,
                ],
                capture_output=True,
                text=True,
                timeout=60,
            )
        except (subprocess.SubprocessError, OSError) as exc:
            print(f"  [warn] curl failed for a batch: {exc}", file=sys.stderr)
            not_found.extend(batch)
            continue

        if proc.returncode != 0:
            print(
                f"  [warn] Scryfall request failed (exit {proc.returncode}); "
                f"treating {len(batch)} cards as unpriced.",
                file=sys.stderr,
            )
            not_found.extend(batch)
            continue

        try:
            body = json.loads(proc.stdout)
        except json.JSONDecodeError as exc:
            print(f"  [warn] could not parse Scryfall response: {exc}", file=sys.stderr)
            not_found.extend(batch)
            continue

        for card in body.get("data", []):
            data[card["name"].lower()] = card
            # Also index the front face name for split/DFC lookups.
            if "card_faces" in card and card["card_faces"]:
                front = card["card_faces"][0].get("name")
                if front:
                    data.setdefault(front.lower(), card)

        for miss in body.get("not_found", []):
            nm = miss.get("name")
            if nm:
                not_found.append(nm)

    return data, not_found


def card_mana_value(card: dict) -> float:
    """Best-effort mana value for a card (handles split/DFC via top-level cmc)."""
    if "cmc" in card and card["cmc"] is not None:
        return float(card["cmc"])
    return 0.0


def card_mana_cost_str(card: dict) -> str:
    """Return a mana-cost string for pip counting, combining faces if needed."""
    if card.get("mana_cost"):
        return card["mana_cost"]
    parts = []
    for face in card.get("card_faces", []) or []:
        if face.get("mana_cost"):
            parts.append(face["mana_cost"])
    return "".join(parts)


def card_usd(card: dict) -> float:
    """Return the USD price (prices.usd, falling back to usd_foil), or 0.0."""
    prices = card.get("prices", {}) or {}
    for key in ("usd", "usd_foil", "usd_etched"):
        val = prices.get(key)
        if val:
            try:
                return float(val)
            except (TypeError, ValueError):
                continue
    return 0.0


def is_land(card: dict) -> bool:
    return "Land" in (card.get("type_line", "") or "")


def count_pips(mana_cost: str) -> Counter:
    """Count colored pips (W/U/B/R/G) in a mana-cost string like '{3}{G}{U}'."""
    pips: Counter = Counter()
    for color in PIP_COLORS:
        pips[color] += mana_cost.count("{" + color + "}")
    # Hybrid pips like {G/U} count toward both colors.
    for a in PIP_COLORS:
        for b in PIP_COLORS:
            if a < b:
                token = "{" + a + "/" + b + "}"
                n = mana_cost.count(token)
                pips[a] += n
                pips[b] += n
    return pips


def analyze(path: str) -> int:
    entries = parse_decklist(path)
    total = sum(count for count, _, _ in entries)

    print("=" * 60)
    print(f"Deck analysis: {path}")
    print("=" * 60)

    # (a) Card count -------------------------------------------------------
    status = "PASS" if total == TARGET_DECK_SIZE else "FAIL"
    print(f"\n[a] Card count: {total} / {TARGET_DECK_SIZE}  -> {status}")
    if total != TARGET_DECK_SIZE:
        print(f"    (off by {total - TARGET_DECK_SIZE:+d})")

    # Fetch card data ------------------------------------------------------
    unique_names = sorted({name for _, name, _ in entries})
    print(f"\nFetching {len(unique_names)} unique cards from Scryfall "
          f"(batched at {BATCH_SIZE}/request)...")
    data, not_found = curl_collection(unique_names)
    if not_found:
        print(f"  [note] {len(not_found)} card(s) not fetched (network or name mismatch): "
              f"{', '.join(sorted(not_found)[:8])}"
              + (" ..." if len(not_found) > 8 else ""))

    # Split into lands / nonlands using fetched data (fallback: unknown = nonland).
    def lookup(name: str) -> dict | None:
        return data.get(name.lower())

    # (b) Mana curve -------------------------------------------------------
    print("\n[b] Mana curve (nonland cards):")
    curve: Counter = Counter()
    mv_sum = 0.0
    mv_count = 0
    five_plus = 0
    unpriced_curve = 0
    for count, name, tags in entries:
        card = lookup(name)
        if card is None:
            unpriced_curve += count
            continue
        if is_land(card):
            continue
        mv = card_mana_value(card)
        bucket = int(mv) if mv < 7 else 7
        curve[bucket] += count
        mv_sum += mv * count
        mv_count += count
        if mv >= 5:
            five_plus += count

    if mv_count:
        avg_mv = mv_sum / mv_count
        print(f"    Average MV (nonland): {avg_mv:.2f}")
        print(f"    Cards at MV 5+: {five_plus}")
        max_bar = max(curve.values()) if curve else 1
        for bucket in range(0, 8):
            label = "7+" if bucket == 7 else str(bucket)
            n = curve.get(bucket, 0)
            bar = "#" * int(round(n / max_bar * 30)) if n else ""
            print(f"      MV {label:>2}: {n:2d}  {bar}")
    else:
        print("    [warn] No nonland card data available (offline?) — curve skipped.")
    if unpriced_curve:
        print(f"    [note] {unpriced_curve} card(s) excluded from curve (no data).")

    # (c) Color pip ratio --------------------------------------------------
    print("\n[c] Color pip ratio (across mana costs):")
    pip_totals: Counter = Counter()
    for count, name, tags in entries:
        card = lookup(name)
        if card is None:
            continue
        cost = card_mana_cost_str(card)
        pips = count_pips(cost)
        for color, n in pips.items():
            pip_totals[color] += n * count
    total_pips = sum(pip_totals.values())
    if total_pips:
        for color in PIP_COLORS:
            n = pip_totals[color]
            pct = (n / total_pips * 100) if total_pips else 0
            bar = "#" * int(round(pct / 100 * 30))
            print(f"    {COLOR_NAMES[color]:>5} ({color}): {n:3d}  {pct:5.1f}%  {bar}")
        print(f"    Total colored pips: {total_pips}")
    else:
        print("    [warn] No pip data available (offline?) — pips skipped.")

    # (d) Fetch-vs-basics --------------------------------------------------
    print("\n[d] Fetch-vs-basics audit:")
    basics: Counter = Counter()
    for count, name, tags in entries:
        # Match on the printed name so this works even offline.
        if name in BASIC_LAND_NAMES:
            basics[name] += count
    if basics:
        for name in ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]:
            if basics.get(name):
                print(f"    {name:>8}: {basics[name]}")
        print(f"    Total basics: {sum(basics.values())}")
        print("    Reminder: green land-fetch usually grabs Forests only — keep the "
              "Forest count high enough to keep fetches live.")
    else:
        print("    No basic lands found by name.")

    # (e) Total price ------------------------------------------------------
    print("\n[e] Total deck price (Scryfall prices.usd):")
    total_price = 0.0
    priced = 0
    missing_price = 0
    priciest: List[Tuple[float, str]] = []
    for count, name, tags in entries:
        card = lookup(name)
        if card is None:
            missing_price += count
            continue
        usd = card_usd(card)
        if usd > 0:
            total_price += usd * count
            priced += count
            priciest.append((usd, name))
        else:
            missing_price += count
    print(f"    Total: ${total_price:,.2f}  ({priced} cards priced)")
    if missing_price:
        print(f"    [note] {missing_price} card(s) had no price (offline or no USD price).")
    if priciest:
        priciest.sort(reverse=True)
        print("    Priciest cards:")
        for usd, name in priciest[:5]:
            print(f"      ${usd:>7.2f}  {name}")

    # (f) Tag distribution -------------------------------------------------
    print("\n[f] Tag distribution (from inline #tags in the decklist):")
    tag_totals: Counter = Counter()
    tagged_cards = 0
    untagged_cards = 0
    for count, name, tags in entries:
        if tags:
            tagged_cards += count
        else:
            untagged_cards += count
        for tag in tags:
            tag_totals[tag] += count
    if tag_totals:
        max_bar = max(tag_totals.values())
        # Sort by count descending, then alphabetically for stable output.
        for tag, n in sorted(tag_totals.items(), key=lambda kv: (-kv[1], kv[0])):
            bar = "#" * int(round(n / max_bar * 30)) if n else ""
            print(f"    {tag:>12}: {n:2d}  {bar}")
        print(f"    Cards with tags: {tagged_cards}"
              + (f"; without tags: {untagged_cards}" if untagged_cards else ""))
    else:
        print("    No inline tags found in this decklist.")

    print("\n" + "=" * 60)
    return 0 if total == TARGET_DECK_SIZE else 1


def curl_search(query: str) -> Tuple[Optional[List[dict]], Optional[str]]:
    """Run a Scryfall /cards/search via curl. Returns (cards, error_message).

    `query` is the raw (un-encoded) Scryfall query string; it is URL-encoded here.
    On the "no cards matched" case Scryfall returns HTTP 404 with a JSON error body; we
    surface that as a friendly message rather than a crash.
    """
    encoded = urllib.parse.quote(query)
    url = f"{SCRYFALL_SEARCH_URL}?q={encoded}&order=edhrec"
    try:
        proc = subprocess.run(
            ["curl", "-sS", url, "-H", "Accept: application/json"],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (subprocess.SubprocessError, OSError) as exc:
        return None, f"curl failed: {exc}"

    if not proc.stdout.strip():
        return None, f"empty response (curl exit {proc.returncode})"

    try:
        body = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        return None, f"could not parse Scryfall response: {exc}"

    if body.get("object") == "error":
        return None, body.get("details", "Scryfall returned an error.")

    return body.get("data", []), None


def deck_card_names(deck_path: str) -> set:
    """Return a set of lowercase card names already in a decklist (for skip/mark)."""
    names = set()
    for _, name, _ in parse_decklist(deck_path):
        names.add(name.lower())
    return names


def discover(args: argparse.Namespace) -> int:
    """Discover candidate cards for an otag via Scryfall search, ranked by EDHREC."""
    slug = args.slug
    parts = [f"otag:{slug}"]
    if args.id:
        parts.append(f"id:{args.id}")
    if not args.include_gamechangers:
        parts.append("-is:gamechanger")
    if args.set:
        parts.append(f"set:{args.set}")
    if args.max_price is not None:
        parts.append(f"usd<={args.max_price}")
    query = " ".join(parts)

    print(f"Discovery query: {query}   (order=edhrec)")
    cards, err = curl_search(query)
    if err is not None:
        print(f"  [error] {err}")
        print(f"  Hint: check the slug against the tag catalog: "
              f"python3 {os.path.basename(sys.argv[0])} --list-tags {slug}")
        return 1
    if not cards:
        print("  No cards matched.")
        return 1

    owned = deck_card_names(args.deck) if args.deck else set()

    print(f"  {len(cards)} match(es); showing up to {args.limit}"
          + (" NEW candidates (owned cards shown as context, marked '=')" if owned else "")
          + ":\n")
    print(f"  {'#':>3}  {'MV':>3}  {'USD':>7}  {'':1} {'Name':<32} Type")
    print("  " + "-" * 78)

    new_shown = 0
    rank = 0
    for card in cards:
        if new_shown >= args.limit:
            break
        name = card.get("name", "?")
        is_owned = args.deck and name.lower() in owned
        marker = "=" if is_owned else " "
        # Owned cards are shown for context but don't consume the NEW-candidate budget.
        if not is_owned:
            new_shown += 1
        rank += 1
        mv = card.get("cmc", 0.0)
        prices = card.get("prices", {}) or {}
        usd = prices.get("usd") or prices.get("usd_foil") or "-"
        usd_str = f"{float(usd):.2f}" if usd not in ("-", None) else "-"
        type_line = card.get("type_line", "")
        print(f"  {rank:>3}  {mv:>3.0f}  {usd_str:>7}  {marker} {name:<32.32} {type_line}")

    if owned:
        print("\n  Legend: '=' already in the target deck (context only, not counted "
              "toward the NEW limit).")
    return 0


def list_tags(substring: Optional[str]) -> int:
    """Search the local Tagger catalog for slugs containing `substring`."""
    if not os.path.exists(ORACLE_TAGS_PATH):
        print(f"[note] Tag catalog not found at {ORACLE_TAGS_PATH}.")
        print("       Generate it with: python3 scripts/tagger_catalog.py")
        return 1
    needle = (substring or "").lower()
    matches: List[Tuple[str, str]] = []
    with open(ORACLE_TAGS_PATH, encoding="utf-8") as fh:
        for line in fh:
            if line.startswith("#") or not line.strip():
                continue
            slug, _, name = line.rstrip("\n").partition("\t")
            if not needle or needle in slug.lower() or needle in name.lower():
                matches.append((slug, name))
    if not matches:
        print(f"No tags matching '{substring}'.")
        return 1
    print(f"{len(matches)} tag(s) matching '{substring or '*'}':")
    for slug, name in matches:
        print(f"  {slug}\t{name}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Analyze a Commander decklist, or discover cards via Scryfall Tagger tags.",
    )
    parser.add_argument("decklist", nargs="?",
                        help="Path to a decklist file to analyze (analyze mode).")
    parser.add_argument("--discover", metavar="OTAG-SLUG", dest="slug",
                        help="Discovery mode: find cards with this Scryfall function tag "
                             "(otag). See reference/oracle-tags.txt for valid slugs.")
    parser.add_argument("--id", default="gu",
                        help="Color identity filter for discovery (default: gu). "
                             "Use e.g. wubrg for all colors.")
    parser.add_argument("--set", dest="set", metavar="CODE",
                        help="Restrict discovery to a set code (e.g. fin).")
    parser.add_argument("--max-price", type=float, metavar="USD",
                        help="Max USD price for discovery candidates.")
    parser.add_argument("--limit", type=int, default=25,
                        help="Max candidates to show in discovery (default: 25).")
    parser.add_argument("--include-gamechangers", action="store_true",
                        help="Do NOT exclude the banned Game Changers list (off by default).")
    parser.add_argument("--deck", metavar="DECKLIST",
                        help="A decklist to compare against; owned cards are marked.")
    parser.add_argument("--list-tags", nargs="?", const="", metavar="SUBSTR",
                        dest="list_tags",
                        help="List tag slugs from the local catalog containing SUBSTR.")
    return parser


def main(argv: List[str]) -> int:
    parser = build_parser()
    args = parser.parse_args(argv[1:])

    # --list-tags is an offline lookup mode.
    if args.list_tags is not None:
        return list_tags(args.list_tags)

    # Discovery mode.
    if args.slug:
        return discover(args)

    # Analyze mode.
    if not args.decklist:
        parser.print_help(sys.stderr)
        return 2
    return analyze(args.decklist)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
