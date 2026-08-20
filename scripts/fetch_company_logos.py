#!/usr/bin/env python3
"""Download square favicons derived from each company's official domain."""

from __future__ import annotations

import argparse
import io
import json
import re
import ssl
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DOMAINS = {
    "005930.KS":"samsung.com", "000660.KS":"skhynix.com", "MU":"micron.com", "285A.T":"kioxia-holdings.com",
    "SNDK":"sandisk.com", "2408.TW":"nanya.com", "2344.TW":"winbond.com", "2337.TW":"macronix.com",
    "WDC":"westerndigital.com", "STX":"seagate.com", "SIMO":"siliconmotion.com", "8299.TWO":"phison.com",
    "RMBS":"rambus.com", "MRVL":"marvell.com", "603986.SS":"gigadevice.com", "688110.SS":"dosilicon.com",
    "300223.SZ":"ingenic.com.cn", "688008.SS":"montage-tech.com", "688449.SS":"maxio-tech.com",
    "301308.SZ":"longsys.com", "688525.SS":"biwintech.com", "001309.SZ":"twsc.com.cn", "300042.SZ":"netac.com.cn",
    "300475.SZ":"shannonxsemi.com", "300184.SZ":"icbase.com", "300975.SZ":"jssunlord.com", "000062.SZ":"szhq.com",
    "300131.SZ":"yitoa.com", "002371.SZ":"naura.com", "688012.SS":"amec-inc.com", "688072.SS":"piotech.cn",
    "688082.SS":"acmrcsh.com.cn", "688120.SS":"hwatsing.com", "688037.SS":"kingsemi.com", "600641.SS":"600641.com.cn",
    "300236.SZ":"sinyang.com.cn", "688019.SS":"anjimicro.com", "300346.SZ":"natachem.com", "300666.SZ":"kfmic.com",
    "688432.SS":"gritek.com", "600584.SS":"jcetglobal.com", "002156.SZ":"tfme.com", "002185.SZ":"ht-tech.com",
    "688825.SS":"cxmt.com", "YMTC":"ymtc.com", "JHICC":"jhicc.cn", "TOSHIBA-HDD":"toshiba-storage.com"
}

# Some official sites hide the header mark in CSS/JavaScript, block automated
# favicon requests, or expose only SVG assets.  Keep an auditable, deterministic
# override for those cases instead of falling back to a synthetic badge.
OVERRIDE_ASSETS = {
    "000660.KS": ("https://www.companieslogo.com/img/orig/000660.KS_BIG-aa301243.png?download=true", "public_brand_asset"),
    "MU": ("https://upload.wikimedia.org/wikipedia/commons/8/8e/Micron_Logo.png", "public_brand_asset"),
    "SIMO": ("https://s4.itho.me/sites/default/files/styles/picture_size_large/public/hui_rong_smi-logo_960x420_8.png?itok=qUoD7lyG", "public_brand_asset"),
    "300223.SZ": ("https://www.ingenic.com.cn/images/header/logo2.png", "official_asset"),
    "688449.SS": ("https://s3-symbol-logo.tradingview.com/maxio-technology-hangzhou-coltd--600.png", "market_brand_asset"),
    "300042.SZ": ("https://quantum.cc/img/Netac.webp", "public_brand_asset"),
    "300975.SZ": ("https://omo-oss-image.thefastimg.com/portal-saas/pg2024110817044106602/cms/image/7bc3d37a-c7d4-4aca-b218-ba023fa24f2c.png", "official_asset"),
    "300236.SZ": ("https://www.logo9.net/userfiles/images/9NGHAISINY.jpg", "public_brand_asset"),
    "300184.SZ": ("https://www.icbase.com/images/logo.jpg", "official_asset"),
    "300666.SZ": ("https://s3-symbol-logo.tradingview.com/konfoong-materials--600.png", "market_brand_asset"),
    "688432.SS": ("https://s3-symbol-logo.tradingview.com/grinm-semiconductor-materials-coltd--600.png", "market_brand_asset"),
    "600584.SS": ("https://s3-symbol-logo.tradingview.com/jcet--600.png", "market_brand_asset"),
    "002156.SZ": ("https://s3-symbol-logo.tradingview.com/tongfu-microelectr--600.png", "market_brand_asset"),
    "002185.SZ": ("https://s3-symbol-logo.tradingview.com/tianshui-huatian-t--600.png", "market_brand_asset"),
    "688110.SS": ("https://s.laoyaoba.com/jwImg/637228379505.1627.png?insert-from=gallery", "public_brand_asset"),
    "688037.SS": ("https://chinagazelle.cn-bj.ufileos.com/ab5e4e89089a47fc870c6f5537152b42.jpg", "public_brand_asset"),
    "688019.SS": ("https://exhibitors.semi-e.com/File/zslogo/202506191051112341.jpg", "public_brand_asset"),
    "688825.SS": ("https://storage-public.zhaopin.cn/org/logo/1660010546123053445/CXMT-logo%E3%80%90%E7%99%BD%E8%89%B2%E8%83%8C%E6%99%AF%E7%94%A8%E8%93%9D%E8%89%B2%EF%BC%8C%E6%B7%B1%E8%89%B2%E8%83%8C%E6%99%AF%E7%94%A8%E5%8F%8D%E7%99%BD%E3%80%91.png", "public_brand_asset"),
    "YMTC": ("https://pbs.twimg.com/media/F-qcPPHaQAANvga.png", "public_brand_asset"),
    "JHICC": ("https://p3-sdbk2-media.byteimg.com/tos-cn-i-xv4ileqgde/405ba63789004d45ae3dbbf14c27670a~tplv-xv4ileqgde-resize-w%3A720.image", "public_brand_asset"),
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


class LogoParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.candidates: list[tuple[int, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() not in {"img", "source"}:
            return
        data = {k.lower(): (v or "") for k, v in attrs}
        src = data.get("src") or data.get("data-src") or data.get("data-lazy-src") or data.get("srcset", "").split(" ")[0]
        if not src or src.startswith("data:"):
            return
        haystack = " ".join([src, data.get("alt", ""), data.get("class", ""), data.get("id", "")]).lower()
        score = 0
        if "logo" in haystack: score += 10
        if "header" in haystack or "brand" in haystack: score += 4
        if "footer" in haystack: score -= 5
        if re.search(r"icon|favicon", haystack): score -= 2
        self.candidates.append((score, src))


def normalize_image(payload: bytes, path: Path) -> bool:
    try:
        image = Image.open(io.BytesIO(payload)).convert("RGBA")
        if image.width < 24 or image.height < 16:
            return False
        image.thumbnail((112, 112), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (128, 128), "white")
        canvas.alpha_composite(image, ((128-image.width)//2, (128-image.height)//2))
        canvas.convert("RGB").save(path, "PNG")
        return True
    except Exception:
        return False


def download(req_url: str, timeout: int = 8) -> bytes:
    req = urllib.request.Request(
        req_url,
        headers={"User-Agent":"Mozilla/5.0", "Referer":"https://www.tradingview.com/"},
    )
    context = ssl._create_unverified_context()
    with urllib.request.urlopen(req, timeout=timeout, context=context) as response:
        return response.read()


def fetch_official_header_logo(domain: str, path: Path) -> str | None:
    for homepage in (f"https://www.{domain}/", f"https://{domain}/"):
        try:
            html = download(homepage).decode("utf-8", errors="ignore")
            parser = LogoParser(); parser.feed(html)
            for score, raw in sorted(parser.candidates, reverse=True):
                if score < 4:
                    continue
                asset = urllib.parse.urljoin(homepage, raw)
                if asset.lower().split("?")[0].endswith(".svg"):
                    continue
                try:
                    if normalize_image(download(asset), path):
                        return asset
                except Exception:
                    continue
        except Exception:
            continue
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", required=True)
    args = parser.parse_args()
    root = Path(args.project_root).resolve()
    out = root / "web/assets/logos"
    out.mkdir(parents=True, exist_ok=True)
    watchlist = json.loads((root / "storage_intel/config/market_watchlist.json").read_text(encoding="utf-8"))
    labels = {x["symbol"]: x.get("icon") or x.get("short_name") or x.get("name") for key in ("foreign", "domestic", "unlisted") for x in watchlist.get(key, [])}
    def process(item: tuple[str, str]) -> tuple[str, dict, str | None]:
        symbol, domain = item
        path = out / filename(symbol)
        if symbol in OVERRIDE_ASSETS:
            asset, asset_type = OVERRIDE_ASSETS[symbol]
            try:
                if normalize_image(download(asset), path):
                    return symbol, {"type":asset_type, "domain":domain, "asset_url":asset}, None
                raise ValueError("invalid override image")
            except Exception as exc:
                override_error = f"override failed: {exc}"
        else:
            override_error = ""
        header_logo = fetch_official_header_logo(domain, path)
        if header_logo:
            return symbol, {"type":"official_header", "domain":domain, "asset_url":header_logo}, None
        url = "https://www.google.com/s2/favicons?domain=" + urllib.parse.quote(domain) + "&sz=128"
        try:
            req = urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as response:
                payload = response.read()
            if len(payload) < 100:
                raise ValueError("empty favicon")
            if not normalize_image(payload, path):
                raise ValueError("invalid favicon")
            return symbol, {"type":"official_favicon", "domain":domain, "asset_url":url}, None
        except Exception as exc:
            make_badge(path, labels.get(symbol, symbol), symbol)
            detail = f"{override_error}; favicon failed: {exc}" if override_error else str(exc)
            return symbol, {"type":"text_badge", "domain":domain}, f"{symbol}: {detail}"

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(process, DOMAINS.items()))
    manifest = {symbol: detail for symbol, detail, _ in results}
    errors = [error for _, _, error in results if error]
    official = sum(detail["type"] != "text_badge" for _, detail, _ in results)
    badges = len(results) - official
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"requested":len(DOMAINS), "official_icons":official, "square_badges":badges, "errors":errors}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
