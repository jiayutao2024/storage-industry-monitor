# 存储产业监测

独立的存储行业在线监测站，覆盖短期价格与库存、中期供需与有效 bit、长期国产化与价值池迁移。

## 在线更新

- 每日 05:00 与 17:00（Asia/Shanghai）由 GitHub Actions 自动更新。
- 新闻历史、价格历史和公司行情历史随每次运行增量保存。
- 页面通过 GitHub Pages 公开访问，不设置前置密码。

## 页面

1. 今日总览：每日判断、五条新闻、七家核心原厂动态。
2. 周期与价格：DRAM/NAND/SSD 公开价格历史。
3. 供需与有效 bit：G3 供需模型、缺口和产能时间轴。
4. 产品与技术：HBM、DRAM、NAND、SSD、HDD 与新型存储。
5. 竞争格局与公司：全球及 A 股完整产业链覆盖池、核心原厂股价指数与长鑫经营序列。
6. 事件与新闻库：核心事件和全部历史检索。
7. 数据与方法：细颗粒指标字典、定义、来源、频率与证据边界。

## 数据接口

- `api/dashboard.json`：页面使用的精简交互数据。
- `api/market-history.json`：44 家上市公司近一年日频行情完整历史。
- `api/storage-events.json`：可检索事件历史。
- `api/storage-research.json`：供需模型、行业指标、竞争份额与来源台账。

缺失价格保持为空，不以 0 填补。跨市场股价采用本币复权收盘价，页面比较统一指数化；不同规格的存储报价不直接比较绝对价格。

## 本地构建

```powershell
python storage_intel/scripts/run_storage_intel.py --hours 36 --target-news 8 --max-news 10
python scripts/collect_storage_prices.py --project-root .
python scripts/build_site.py --project-root .
```

站点产物位于 `_site/`。
