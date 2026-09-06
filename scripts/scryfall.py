#!/usr/bin/env python3
"""Scryfall-backed decklist analyzer for the MTG Commander workspace.

Reads a decklist file (the workspace's `<count> <card name>` format, with `//` comment
lines) and reports:

  (a) total card count with a pass/fail check against 100,
  (b) mana curve — average mana value (MV), a histogram, and the count of cards at MV 5+,
  (c) color pip ratio across all mana costs,
  (d) a fetch-vs-basics note listing basic land counts, and
  (e) total deck price using Scryfall `prices.usd`.

Environment quirks (important):
  * This environment's `python3` has SSL certificate failures when using `urllib`/`requests`
    against Scryfall, so this script shells out to **`curl`** (via subprocess) instead.
  * Card data is fetched from the Scryfall `/cards/collection` endpoint, which accepts a
    maximum of **75 identifiers per POST**. We therefore batch requests in groups of 75.

Usage:
    python3 scripts/scryfall.py decks/wandering-minstrel/list.txt

If the network is unavailable, the parsing / curve / pip / basics sections still run using
whatever card data was retrievable; the price and curve sections degrade gracefully and note
how many cards could not be fetched.
"""

from __future__ import annotations

import json
import subprocess
import sys
from collections import Counter
from typing import Dict, List, Tuple

SCRYFALL_COLLECTION_URL = "https://api.scryfall.com/cards/collection"
BATCH_SIZE = 75  # Scryfall /cards/collection hard limit: 75 identifiers per POST.
TARGET_DECK_SIZE = 100

BASIC_LAND_NAMES = {"Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"}
PIP_COLORS = ["W", "U", "B", "R", "G"]
COLOR_NAMES = {"W": "White", "U": "Blue", "B": "Black", "R": "Red", "G": "Green"}


def parse_decklist(path: str) -> List[Tuple[int, str]]:
    """Parse a decklist file into a list of (count, card_name) tuples.

    Ignores blank lines and lines that start with `//`.
    """
    entries: List[Tuple[int, str]] = []
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
            name = parts[1].strip()
            entries.append((count, name))
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
    total = sum(count for count, _ in entries)

    print("=" * 60)
    print(f"Deck analysis: {path}")
    print("=" * 60)

    # (a) Card count -------------------------------------------------------
    status = "PASS" if total == TARGET_DECK_SIZE else "FAIL"
    print(f"\n[a] Card count: {total} / {TARGET_DECK_SIZE}  -> {status}")
    if total != TARGET_DECK_SIZE:
        print(f"    (off by {total - TARGET_DECK_SIZE:+d})")

    # Fetch card data ------------------------------------------------------
    unique_names = sorted({name for _, name in entries})
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
    for count, name in entries:
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
    for count, name in entries:
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
    for count, name in entries:
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
    for count, name in entries:
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

    print("\n" + "=" * 60)
    return 0 if total == TARGET_DECK_SIZE else 1


def main(argv: List[str]) -> int:
    if len(argv) != 2:
        print(f"Usage: python3 {argv[0] if argv else 'scryfall.py'} <decklist.txt>",
              file=sys.stderr)
        return 2
    return analyze(argv[1])


if __name__ == "__main__":
    sys.exit(main(sys.argv))
