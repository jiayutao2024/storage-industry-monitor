#!/usr/bin/env python3
"""Build the standalone storage-industry dashboard and public JSON snapshot."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from collections import Counter
from pathlib import Path
from typing import Any


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")


def public_events(rows: list[dict[str, Any]], translations: dict[str, str]) -> list[dict[str, Any]]:
    evidence_zh = {
        "0_Unspecified": "未明确", "1_Rumor": "传闻", "2_Announcement": "官方发布",
        "3_Sample": "送样", "4_Qualification": "验证", "5_Contract": "合同",
        "6_MassProduction": "量产", "7_ShipmentRevenue": "出货/收入",
    }
    stage_zh = {
        "Equipment/Materials": "设备材料", "Manufacturing": "原厂制造",
        "Packaging/Controller": "封装测试/主控", "Module/Channel": "模组/渠道",
        "System/Demand": "系统/终端需求",
    }
    output = []
    for row in rows:
        title = row.get("title", "")
        title_zh = translations.get(hashlib.sha256(title.encode("utf-8")).hexdigest(), title)
        raw_stage = row.get("chain_layers", [""])[0] if row.get("chain_layers") else ""
        event_types = set(row.get("event_types", []))
        if not raw_stage:
            raw_stage = (
                "Equipment/Materials" if event_types & {"Equipment/Capex", "Fab/Capacity"} else
                "System/Demand" if "Demand/Shipment" in event_types else
                "Manufacturing" if event_types else ""
            )
        score = int(row.get("relevance_score") or 0)
        core = score >= 30 and bool(event_types or row.get("entities")) and not row.get("excluded_as_retail_noise")
        output.append({
            "id": row.get("id"), "published_at": row.get("published_at"), "title": title_zh,
            "title_original": title, "url": row.get("url"), "publisher": row.get("publisher"),
            "source_tier": row.get("source_tier", row.get("feed_tier", 3)),
            "products": row.get("products", []), "event_types": row.get("event_types", []),
            "entities": row.get("entities", []), "tickers": row.get("tickers", []),
            "region": row.get("region", "Unclear"), "stage": raw_stage,
            "stage_zh": stage_zh.get(raw_stage, "未归类"),
            "evidence_stage": row.get("evidence_stage", "0_Unspecified"),
            "evidence_zh": evidence_zh.get(row.get("evidence_stage"), "未明确"),
            "relevance_score": score, "quality_level": "core" if core else "archive",
            "first_seen_at": row.get("first_seen_at"),
        })
    output.sort(key=lambda x: x.get("published_at") or "", reverse=True)
    return output


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True)
    args = parser.parse_args()
    root = Path(args.project_root).resolve()
    output = root / "_site"
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    daily = load_json(root / "storage_intel" / "output" / "latest.json", {})
    prices = load_json(root / "data" / "storage_prices_latest.json", {})
    research = load_json(root / "data" / "storage_research.json", {})
    translations = load_json(root / "storage_intel" / "data" / "translations.json", {})
    event_rows = load_jsonl(root / "storage_intel" / "data" / "news.jsonl")
    events = public_events(event_rows, translations)
    market_history = load_jsonl(root / "storage_intel" / "data" / "market_history.jsonl")
    universe = load_json(root / "storage_intel" / "config" / "market_watchlist.json", {})

    metrics = prices.get("metrics", [])
    fresh = [row for row in metrics if row.get("freshness", {}).get("status") != "stale"]
    changes = [float(row["change_pct"]) for row in fresh if row.get("change_pct") is not None]
    up = sum(value > 0 for value in changes)
    down = sum(value < 0 for value in changes)
    breadth = round(up / len(changes) * 100, 1) if changes else None
    state = "价格上行" if breadth is not None and breadth >= 60 else ("价格转弱" if breadth is not None and breadth <= 35 else "价格分化")
    generated_at = daily.get("meta", {}).get("generated_at") or prices.get("meta", {}).get("generated_at") or research.get("meta", {}).get("version", "")

    universe_rows = [*universe.get("foreign", []), *universe.get("domestic", []), *universe.get("unlisted", [])]
    universe_by_symbol = {row.get("symbol"): row for row in universe_rows}
    market = []
    for raw in daily.get("market", []):
        row = dict(raw)
        meta_row = universe_by_symbol.get(row.get("symbol"), {})
        for key in ("short_name", "category", "icon", "region", "homepage"):
            row[key] = meta_row.get(key, row.get(key))
        row["listed"] = raw.get("listed", not bool(meta_row.get("status")))
        market.append(row)
    existing_symbols = {row.get("symbol") for row in market}
    for meta_row in universe.get("unlisted", []):
        if meta_row.get("symbol") in existing_symbols:
            continue
        market.append({**meta_row, "group": "国内", "listed": False, "price": None, "change_pct": None,
                       "volume": None, "currency": "", "trade_date": "", "exchange": "", "source_url": ""})
    daily["market"] = market
    homepage_market = [row for row in market if row.get("homepage")]
    core_order = ["005930.KS", "MU", "000660.KS", "285A.T", "SNDK", "688825.SS", "YMTC"]
    by_symbol = {row.get("symbol"): row for row in homepage_market}
    homepage_market = [by_symbol[symbol] for symbol in core_order if symbol in by_symbol]
    entity_alias = {"688825.SS": {"CXMT", "ChangXin Memory Technologies", "长鑫科技"}, "YMTC": {"YMTC", "Yangtze Memory Technologies"}}
    for row in homepage_market:
        if row.get("listed"):
            change = row.get("change_pct")
            direction = "上涨" if change is not None and change > 0 else ("下跌" if change is not None and change < 0 else "持平")
            row["daily_note"] = f"最近交易日{direction}{abs(change or 0):.2f}%，成交量{int(row.get('volume') or 0):,}。"
        else:
            aliases = entity_alias.get(row.get("symbol"), {row.get("symbol")})
            count = sum(bool(set(event.get("entities", [])) & aliases) for event in events[:120])
            row["daily_note"] = f"未上市；近阶段事件库收录{count}条相关动态，重点看产品验证与量产证据。"

    core_history_symbols = {"005930.KS", "000660.KS", "MU", "285A.T", "SNDK", "688825.SS"}
    core_market_history = [row for row in market_history if row.get("symbol") in core_history_symbols]

    payload = {
        "meta": {
            "title": "存储产业短中长期趋势与事件监测", "generated_at": generated_at,
            "schedule": "每日 05:00 / 17:00（Asia/Shanghai）", "timezone": "Asia/Shanghai",
            "public_policy": research.get("meta", {}).get("boundary", "仅展示可公开引用数据。"),
        },
        "health": {
            "status": daily.get("quality", {}).get("status", "unknown"),
            "storage_status": daily.get("quality", {}).get("status", "unknown"),
        },
        "storage": {
            "cycle": {
                "label": state, "price_breadth_pct": breadth, "fresh_price_count": len(fresh),
                "price_metric_count": len(metrics), "event_count": len(daily.get("events", [])),
                "method": "状态由公开价格上涨广度表达；新闻数量不进入周期打分。",
            },
            "price_metrics": metrics, "price_history": prices.get("history", []),
            "price_summary": prices.get("summary", {}), "price_quality": prices.get("quality", {}),
            "price_meta": prices.get("meta", {}), "daily": daily,
            "homepage_market": homepage_market,
            "market_universe": universe_rows,
            # Keep the interactive payload lean; the complete listed-company panel
            # remains available from api/market-history.json for download/reuse.
            "market_history": core_market_history,
            "chain": ["终端/AI需求", "bit需求", "库存", "有效供给", "价格", "收入/毛利", "Capex", "设备材料订单"],
        },
    }

    for filename in ("index.html", "app.js", "storage.js", "styles.css", "storage.css"):
        shutil.copy2(root / "web" / filename, output / filename)
    shutil.copytree(root / "web" / "assets", output / "assets")
    (output / ".nojekyll").write_text("", encoding="utf-8")
    api = output / "api"
    write_json(api / "dashboard.json", payload)
    write_json(api / "storage-research.json", research)
    write_json(api / "storage-events.json", {"meta": {"generated_at": generated_at, "rows": len(events), "core_rows": sum(x["quality_level"] == "core" for x in events)}, "rows": events})
    write_json(api / "market-history.json", {"meta": {"generated_at": generated_at, "rows": len(market_history)}, "rows": market_history})
    write_json(api / "index.json", {"name": "Private Storage Industry Monitor", "snapshot_at": generated_at, "endpoints": ["dashboard.json", "storage-research.json", "storage-events.json", "market-history.json"]})
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
