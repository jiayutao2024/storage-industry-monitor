#!/usr/bin/env python3
"""Backfill one year of daily closes for every listed company in the watchlist."""

from __future__ import annotations

import argparse
import json
import tempfile
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

CN_TZ = ZoneInfo("Asia/Shanghai")
USER_AGENT = "Mozilla/5.0 storage-industry-monitor/1.0"


def fetch(entry: dict) -> tuple[list[dict], str | None]:
    symbol = entry["symbol"]
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(symbol)}?range=1y&interval=1d"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as response:
            result = json.load(response)["chart"]["result"][0]
        quote = result["indicators"]["quote"][0]
        adjusted = (result.get("indicators", {}).get("adjclose") or [{}])[0].get("adjclose") or []
        rows = []
        for i, ts in enumerate(result.get("timestamp") or []):
            close = adjusted[i] if i < len(adjusted) and adjusted[i] is not None else (quote.get("close") or [])[i]
            if close is None or float(close) <= 0:
                continue
            rows.append({
                "symbol": symbol, "name": entry["name"], "short_name": entry.get("short_name", entry["name"]),
                "category": entry.get("category", "未分类"), "role": entry.get("role", ""),
                "region": entry.get("region", ""), "listed": True,
                "trade_date": datetime.fromtimestamp(ts, timezone.utc).astimezone(CN_TZ).date().isoformat(),
                "price": round(float(close), 4),
                "volume": (quote.get("volume") or [None] * len(result.get("timestamp") or []))[i],
                "currency": result.get("meta", {}).get("currency", ""),
                "source_url": f"https://finance.yahoo.com/quote/{urllib.parse.quote(symbol)}",
            })
        return rows, None
    except Exception as exc:
        return [], f"{symbol}: {type(exc).__name__}: {exc}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True)
    args = parser.parse_args()
    root = Path(args.project_root).resolve()
    config = json.loads((root / "storage_intel/config/market_watchlist.json").read_text(encoding="utf-8"))
    entries = [*config.get("foreign", []), *config.get("domestic", [])]
    collected, errors = [], []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch, entry): entry for entry in entries}
        for future in as_completed(futures):
            rows, error = future.result()
            collected.extend(rows)
            if error:
                errors.append(error)
    path = root / "storage_intel/data/market_history.jsonl"
    existing = []
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                existing.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    by_key = {(row.get("symbol"), row.get("trade_date")): row for row in [*existing, *collected] if row.get("symbol") and row.get("trade_date") and (row.get("price") or 0) > 0}
    rows = sorted(by_key.values(), key=lambda row: (row["trade_date"], row["symbol"]))
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", dir=path.parent, suffix=".tmp") as handle:
        temp = Path(handle.name)
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
    temp.replace(path)
    print(json.dumps({"companies": len(entries), "new_rows": len(collected), "history_rows": len(rows), "errors": errors}, ensure_ascii=False))
    return 0 if len(errors) < max(3, len(entries) // 5) else 1


if __name__ == "__main__":
    raise SystemExit(main())
