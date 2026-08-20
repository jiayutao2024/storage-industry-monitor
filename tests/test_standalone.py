import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
price_spec = importlib.util.spec_from_file_location("storage_prices", ROOT / "scripts" / "collect_storage_prices.py")
storage_prices = importlib.util.module_from_spec(price_spec)
price_spec.loader.exec_module(storage_prices)
runner_spec = importlib.util.spec_from_file_location("runner", ROOT / "storage_intel" / "scripts" / "run_storage_intel.py")
runner = importlib.util.module_from_spec(runner_spec)
runner_spec.loader.exec_module(runner)


class StandaloneTests(unittest.TestCase):
    def test_password_gate_and_storage_only_title(self):
        html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
        app = (ROOT / "web" / "app.js").read_text(encoding="utf-8")
        self.assertIn('id="access-gate"', html)
        self.assertIn("PASSWORD_SHA256", app)
        self.assertNotIn("AI 与算力", html)

    def test_schedule_is_twice_daily(self):
        workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
        self.assertIn('cron: "0 9,21 * * *"', workflow)

    def test_company_universe_has_all_chain_layers(self):
        data = json.loads((ROOT / "storage_intel" / "config" / "market_watchlist.json").read_text(encoding="utf-8"))
        rows = data["foreign"] + data["domestic"] + data["unlisted"]
        categories = {row["category"] for row in rows}
        self.assertGreaterEqual(len(rows), 40)
        for expected in {"存储原厂", "主控与接口", "模组与品牌", "分销与渠道", "半导体设备", "材料与零部件", "封装测试"}:
            self.assertIn(expected, categories)
        for name in {"力源信息", "商络电子", "长鑫科技", "长江存储"}:
            self.assertIn(name, {row["name"] for row in rows})

    def test_market_history_deduplicates_symbol_date(self):
        quote = {"listed": True, "symbol": "MU", "name": "美光", "short_name": "美光", "category": "存储原厂", "role": "DRAM", "region": "美国", "icon": "M", "price": 100, "change_pct": 1, "volume": 10, "currency": "USD", "trade_date": "2026-08-20", "exchange": "NMS", "source_url": "x"}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "market.jsonl"
            runner.update_market_history(path, [quote])
            quote["price"] = 101
            rows = runner.update_market_history(path, [quote])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["price"], 101)

    def test_research_model_lengths(self):
        data = json.loads((ROOT / "data" / "storage_research.json").read_text(encoding="utf-8"))
        for product in ("dram", "nand"):
            self.assertEqual(len(data["models"][product]["base"]["gap_pct"]), 6)


if __name__ == "__main__":
    unittest.main()
