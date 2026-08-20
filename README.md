# 存储产业监测

独立的存储行业在线监测站，覆盖短期价格与库存、中期供需与有效 bit、长期国产化与价值池迁移。

## 在线更新

- 每日 05:00 与 17:00（Asia/Shanghai）由 GitHub Actions 自动更新。
- 新闻历史、价格历史和公司行情历史随每次运行增量保存。
- 页面访问口令为 `8888`。该口令是静态站点访问门槛，不构成服务端加密。

## 页面

1. 今日总览：每日判断、五条新闻、七家核心原厂动态。
2. 周期与价格：DRAM/NAND/SSD 公开价格历史。
3. 供需与有效 bit：G3 供需模型、缺口和产能时间轴。
4. 产品与技术：HBM、DRAM、NAND、SSD、HDD 与新型存储。
5. 竞争格局与公司：全球及 A 股完整产业链覆盖池。
6. 事件与新闻库：核心事件和全部历史检索。
7. 数据与方法：定义、来源、频率与证据边界。

## 本地构建

```powershell
python storage_intel/scripts/run_storage_intel.py --hours 36 --target-news 8 --max-news 10
python scripts/collect_storage_prices.py --project-root .
python scripts/build_site.py --project-root .
```

站点产物位于 `_site/`。GitHub Pages 默认可能公开可访问；真正的私有 Pages 访问控制仅适用于符合条件的 GitHub Enterprise Cloud 组织。
