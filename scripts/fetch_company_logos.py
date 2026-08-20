#!/usr/bin/env python3
"""Download square favicons derived from each company's official domain."""

from __future__ import annotations

import argparse
import json
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DOMAINS = {
    "005930.KS":"samsung.com", "000660.KS":"skhynix.com", "MU":"micron.com", "285A.T":"kioxia-holdings.com",
    "SNDK":"sandisk.com", "2408.TW":"nanya.com", "2344.TW":"winbond.com", "2337.TW":"macronix.com",
    "WDC":"westerndigital.com", "STX":"seagate.com", "SIMO":"siliconmotion.com", "8299.TWO":"phison.com",
    "RMBS":"rambus.com", "MRVL":"marvell.com", "603986.SS":"gigadevice.com", "688110.SS":"dosilicon.com",
    "300223.SZ":"ingenic.com.cn", "688008.SS":"montage-tech.com", "688449.SS":"maxio-tech.com",
    "301308.SZ":"longsys.com", "688525.SS":"biwintech.com", "001309.SZ":"twsc.com.cn", "300042.SZ":"netac.com.cn",
    "300475.SZ":"shannonx.com", "300184.SZ":"icbase.com", "300975.SZ":"sunlord.com.cn", "000062.SZ":"szhq.com",
    "300131.SZ":"yitoa.com", "002371.SZ":"naura.com", "688012.SS":"amec-inc.com", "688072.SS":"piotech.cn",
    "688082.SS":"acmrcsh.com", "688120.SS":"hwatsing.com", "688037.SS":"kingsemi.com", "600641.SS":"wanye.com",
    "300236.SZ":"sinyang.com.cn", "688019.SS":"anji-tech.com", "300346.SZ":"natachem.com", "300666.SZ":"konfoong.com",
    "688432.SS":"gritek.com", "600584.SS":"jcetglobal.com", "002156.SZ":"tfme.com", "002185.SZ":"ht-tech.com",
    "688825.SS":"cxmt.com", "YMTC":"ymtc.com", "JHICC":"jhicc.com", "TOSHIBA-HDD":"toshiba-storage.com"
}


def filename(symbol: str) -> str:
    return "".join(ch if ch.isalnum() else "-" for ch in symbol) + ".png"


def make_badge(path: Path, label: str, symbol: str) -> None:
    """Create a deterministic square company badge when no public favicon exists."""
    palette = ["#C9152E", "#1D3557", "#006D77", "#6D3B8C", "#A45A16", "#246B4B"]
    color = palette[sum(map(ord, symbol)) % len(palette)]
    image = Image.new("RGB", (128, 128), color)
    draw = ImageDraw.Draw(image)
    text = (label or symbol).strip()[:4]
    font_path = Path("C:/Windows/Fonts/msyhbd.ttc")
    font = ImageFont.truetype(str(font_path), 38 if len(text) <= 2 else 27)
    box = draw.textbbox((0, 0), text, font=font)
    draw.text(((128-(box[2]-box[0]))/2, (128-(box[3]-box[1]))/2-box[1]), text, font=font, fill="white")
    image.save(path, "PNG")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True)
    args = parser.parse_args()
    root = Path(args.project_root).resolve()
    out = root / "web/assets/logos"
    out.mkdir(parents=True, exist_ok=True)
    watchlist = json.loads((root / "storage_intel/config/market_watchlist.json").read_text(encoding="utf-8"))
    labels = {x["symbol"]: x.get("icon") or x.get("short_name") or x.get("name") for key in ("foreign", "domestic", "unlisted") for x in watchlist.get(key, [])}
    errors = []
    official = 0
    badges = 0
    for symbol, domain in DOMAINS.items():
        path = out / filename(symbol)
        if path.exists():
            official += 1
            continue
        url = "https://www.google.com/s2/favicons?domain=" + urllib.parse.quote(domain) + "&sz=128"
        try:
            req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                payload = response.read()
            if len(payload) < 100:
                raise ValueError("empty favicon")
            path.write_bytes(payload)
            official += 1
        except Exception as exc:
            errors.append(f"{symbol}: {exc}")
            make_badge(path, labels.get(symbol, symbol), symbol)
            badges += 1
    print(json.dumps({"requested":len(DOMAINS), "official_icons":official, "square_badges":badges, "errors":errors}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
