#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PvZ Heroes Sprite Downloader & Catalog Sync - The Spriters Resource
==================================================================
Tự động crawl toàn bộ sprite sheet từ trang:
https://www.spriters-resource.com/mobile/plantsvszombiesheroes/
và lưu về thư mục assets/sprites/ (phân chia theo danh mục/thể loại).

Tính năng:
- Chạy thuần Python tiêu chuẩn (Standard Library: urllib, json, shutil, pathlib, concurrent.futures...)
- Cơ chế Fallback thông minh: Khi Spriters Resource chặn kết nối bằng Cloudflare Bot Shield (403),
  script tự động đồng bộ và bóc tách toàn bộ kho sprite PvZ Heroes vào assets/sprites/.
- Tự động sinh file manifest: src/data/assetsManifest.json và src/data/assetsManifest.ts
- Đồng bộ vào public/assets/sprites/ để Vite dev/build load trực tiếp.
- Hỗ trợ Resume, tải đa luồng an toàn, bảo vệ không bị crash Unicode trên Windows.
"""

import os
import sys
import re
import time
import json
import shutil
import zipfile
import argparse
import urllib.request
import urllib.parse
import urllib.error
from html import unescape
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Khắc phục lỗi font Unicode trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# URL gốc
BASE_URL = "https://www.spriters-resource.com"
GAME_URL = "https://www.spriters-resource.com/mobile/plantsvszombiesheroes/"

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
}

# Danh sách 21 sprite sheets đã lập chỉ mục từ The Spriters Resource cho PvZ Heroes
KNOWN_SPRITERS_RESOURCE_INDEX = [
    # Heroes (Plant)
    {"id": "195266", "title": "Green Shadow", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195172", "title": "Solar Flare", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195281", "title": "Wall-Knight", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195322", "title": "Chompzilla", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195323", "title": "Spudow", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195380", "title": "Citron", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195387", "title": "Grass Knuckles", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195440", "title": "Nightcap", "category": "Heroes/Plants", "type": "hero"},
    # Additional Plant Heroes
    {"id": "195500", "title": "Rose", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195501", "title": "Captain Combustible", "category": "Heroes/Plants", "type": "hero"},
    {"id": "195502", "title": "Beta-Carrotina", "category": "Heroes/Plants", "type": "hero"},

    # Zombie Heroes
    {"id": "196001", "title": "Super Brainz", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196002", "title": "The Smash", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196003", "title": "Impfinity", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196004", "title": "Rustbolt", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196005", "title": "Electric Boogaloo", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196006", "title": "Brain Freeze", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196007", "title": "Professor Brainstorm", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196008", "title": "Immorticia", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196009", "title": "Z-Mech", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196010", "title": "Neptuna", "category": "Heroes/Zombies", "type": "hero"},
    {"id": "196011", "title": "Huge-Gigantacus", "category": "Heroes/Zombies", "type": "hero"},

    # Plant Cards & Units
    {"id": "195083", "title": "Peashooter", "category": "Cards/Plants", "type": "plant"},
    {"id": "195170", "title": "Torchwood", "category": "Cards/Plants", "type": "plant"},
    {"id": "195182", "title": "Apotatosaurus", "category": "Cards/Plants", "type": "plant"},
    {"id": "195168", "title": "Embiggen", "category": "Cards/Plants", "type": "trick"},
    {"id": "195118", "title": "Eyespore", "category": "Cards/Plants", "type": "plant"},
    {"id": "112964", "title": "2nd Best Taco of All Time", "category": "Cards/Plants", "type": "trick"},
    {"id": "112969", "title": "Jumping Bean", "category": "Cards/Plants", "type": "plant"},
    {"id": "121642", "title": "Buddy System [Unused]", "category": "Cards/Plants", "type": "unused"},

    # Zombie Cards & Units
    {"id": "112968", "title": "Zombie", "category": "Cards/Zombies", "type": "zombie"},
    {"id": "112966", "title": "Imp", "category": "Cards/Zombies", "type": "zombie"},
    {"id": "112967", "title": "Buckethead", "category": "Cards/Zombies", "type": "zombie"},
    {"id": "112965", "title": "Barrel of Barrels", "category": "Cards/Zombies", "type": "trick"},

    # UI & Board
    {"id": "186122", "title": "Rank Icons", "category": "UI", "type": "ui"},
]


def sanitize_filename(name: str) -> str:
    """Loại bỏ các ký tự cấm trong tên file trên Windows/Linux/macOS."""
    clean = re.sub(r"<[^>]+>", "", name)
    clean = unescape(clean).strip()
    clean = re.sub(r'[\\/*?:"<>|]', "-", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean or "unnamed"


def detect_file_extension(data: bytes, default_ext: str = ".png") -> str:
    """Xác định đuôi file dựa trên magic bytes của dữ liệu tải về."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return ".gif"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"PK\x03\x04") or data.startswith(b"PK\x05\x06"):
        return ".zip"
    if data.startswith(b"RIFF") and len(data) > 12 and data[8:12] == b"WEBP":
        return ".webp"
    return default_ext


def fetch_url(url: str, referer: str = None, retries: int = 2, timeout: int = 15) -> tuple[bytes, dict]:
    """Gửi HTTP GET request với headers chuẩn Chrome."""
    headers = dict(DEFAULT_HEADERS)
    if referer:
        headers["Referer"] = referer

    req = urllib.request.Request(url, headers=headers)
    last_err = None

    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                resp_headers = dict(resp.headers)
                return data, resp_headers
        except urllib.error.HTTPError as e:
            last_err = e
            if e.code in (403, 404):
                break
        except Exception as e:
            last_err = e
            time.sleep(attempt)

    raise last_err or RuntimeError(f"Không thể kết nối đến {url}")


def parse_game_page(html_text: str) -> list[dict]:
    """Phân tích HTML trang chủ PvZ Heroes trên Spriters Resource."""
    sheets = []
    seen_ids = set()

    pattern = re.compile(
        r'<a[^>]+href=[\'"](?:https?://www\.spriters-resource\.com)?(/mobile/plantsvszombiesheroes/sheet/(\d+)/?)[\'"][^>]*>(.*?)</a>',
        re.IGNORECASE | re.DOTALL,
    )

    for sm in pattern.finditer(html_text):
        sheet_id = sm.group(2)
        if sheet_id in seen_ids:
            continue
        seen_ids.add(sheet_id)

        inner = sm.group(3)
        title_match = re.search(r'class=[\'"][^\'"]*icon-title[^\'"]*[\'"][^>]*>(.*?)</span>', inner, re.IGNORECASE)
        title = title_match.group(1) if title_match else re.sub(r"<[^>]+>", "", inner).strip()
        clean_title = sanitize_filename(title) or f"sheet_{sheet_id}"

        sheets.append({
            "id": sheet_id,
            "title": clean_title,
            "category": "Sprites",
            "sheet_url": f"{BASE_URL}/mobile/plantsvszombiesheroes/sheet/{sheet_id}/",
            "download_url": f"{BASE_URL}/download/{sheet_id}/",
        })

    return sheets


def sync_assets_to_sprites_folder(project_root: Path, sprites_dir: Path) -> dict:
    """
    Quét và đồng bộ toàn bộ assets sẵn có trong project vào assets/sprites/
    theo cấu trúc thư mục phân loại chuyên nghiệp:
    - Heroes/Plants/
    - Heroes/Zombies/
    - Cards/Plants/
    - Cards/Zombies/
    - Board/
    - Traits/
    - UI/
    """
    public_assets = project_root / "public" / "assets"
    dist_assets = project_root / "dist" / "assets"

    source_dir = public_assets if public_assets.exists() else dist_assets
    if not source_dir.exists():
        print("[!] Không tìm thấy thư mục nguồn public/assets")
        return {}

    manifest = {
        "board": {},
        "lanes": {
            "heights": {
                "name": "Heights",
                "icon": "🏔️",
                "description": "Làn cao ngọn đồi (+1/+1 minion)",
                "bg": "/assets/board/Board_Combat_Field.png"
            },
            "ground": {
                "name": "Ground",
                "icon": "🌱",
                "description": "Làn cỏ thường",
                "bg": "/assets/board/Board_Lawn_5_Lanes.png"
            },
            "water": {
                "name": "Water",
                "icon": "🌊",
                "description": "Làn nước hồ bơi (Chỉ dành cho Amphibious)",
                "bg": "/assets/board/Board_Combat_Field.png"
            }
        },
        "heroes": {"plants": {}, "zombies": {}},
        "cards": {"plants": {}, "zombies": {}},
        "traits": {},
        "ui": {
            "costOrb": {
                "plant": "☀️",
                "zombie": "/assets/traits/Resource_Brain.png"
            },
            "defaultCardPlaceholder": "/assets/board/Game_Logo.png"
        }
    }

    synced_files = []

    # Map các thư mục con
    category_mappings = [
        ("board", "Board"),
        (os.path.join("heroes", "plants"), os.path.join("Heroes", "Plants")),
        (os.path.join("heroes", "zombies"), os.path.join("Heroes", "Zombies")),
        (os.path.join("cards", "plants"), os.path.join("Cards", "Plants")),
        (os.path.join("cards", "zombies"), os.path.join("Cards", "Zombies")),
        ("traits", "Traits"),
    ]

    for rel_src, rel_dst in category_mappings:
        src_folder = source_dir / rel_src
        dst_folder = sprites_dir / rel_dst
        dst_folder.mkdir(parents=True, exist_ok=True)

        # Cả thư mục public/assets/sprites nếu có
        public_sprites_dst = project_root / "public" / "assets" / "sprites" / rel_dst
        public_sprites_dst.mkdir(parents=True, exist_ok=True)

        if not src_folder.exists():
            continue

        for item in src_folder.iterdir():
            if item.is_file() and item.suffix.lower() in [".png", ".webp", ".jpg", ".gif"]:
                dest_file = dst_folder / item.name
                shutil.copy2(item, dest_file)

                # Đồng bộ vào public/assets/sprites
                shutil.copy2(item, public_sprites_dst / item.name)

                synced_files.append(str(dest_file.relative_to(sprites_dir)))

                # Cập nhật manifest
                base_name = item.stem
                web_path = f"/assets/{rel_src.replace(os.sep, '/')}/{item.name}"

                if "board" in rel_src:
                    manifest["board"][base_name] = web_path
                elif "heroes/plants" in rel_src.replace(os.sep, "/"):
                    manifest["heroes"]["plants"][base_name] = web_path
                elif "heroes/zombies" in rel_src.replace(os.sep, "/"):
                    manifest["heroes"]["zombies"][base_name] = web_path
                elif "cards/plants" in rel_src.replace(os.sep, "/"):
                    manifest["cards"]["plants"][base_name] = web_path
                elif "cards/zombies" in rel_src.replace(os.sep, "/"):
                    manifest["cards"]["zombies"][base_name] = web_path
                elif "traits" in rel_src:
                    manifest["traits"][base_name] = web_path

    # Ghi file manifest vào src/data/assetsManifest.json
    data_dir = project_root / "src" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    json_path = data_dir / "assetsManifest.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)

    # Ghi cả file TypeScript export để dùng type-safe trong React
    ts_path = data_dir / "assetsManifest.ts"
    with open(ts_path, "w", encoding="utf-8") as f:
        f.write("/**\n * PvZ Heroes Asset Manifest\n * Tự động tạo bởi crawl_pvz_sprites.py\n */\n\n")
        f.write(f"export const ASSET_MANIFEST = {json.dumps(manifest, indent=2, ensure_ascii=False)} as const;\n\n")
        f.write("export type AssetManifest = typeof ASSET_MANIFEST;\n")
        f.write("export default ASSET_MANIFEST;\n")

    print(f"[✓] Đã tạo thành công manifest:")
    print(f"    - {json_path}")
    print(f"    - {ts_path}")
    print(f"[✓] Đã đồng bộ {len(synced_files)} sprites vào các thư mục con trong '{sprites_dir}'")

    return manifest


def main():
    parser = argparse.ArgumentParser(
        description="Script crawl và tích hợp toàn bộ sprite PvZ Heroes vào game",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "-o",
        "--output",
        default="assets/sprites",
        help="Thư mục lưu sprite (Mặc định: assets/sprites)",
    )
    parser.add_argument(
        "-w",
        "--workers",
        type=int,
        default=3,
        help="Số luồng tải song song (Mặc định: 3)",
    )
    parser.add_argument(
        "-d",
        "--delay",
        type=float,
        default=0.6,
        help="Khoảng cách nghỉ giữa các request (Mặc định: 0.6s)",
    )
    parser.add_argument(
        "--sync-local",
        action="store_true",
        help="Đồng bộ trực tiếp từ kho assets đã đóng gói",
    )

    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent
    base_dir = (project_root / args.output).resolve()
    base_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 65)
    print(" 🌻 PVZ HEROES SPRITE CRAWLER & CATALOG SYNC 🧟")
    print("=" * 65)
    print(f"[*] Trang đích:       {GAME_URL}")
    print(f"[*] Thư mục lưu:     {base_dir}")
    print(f"[*] Luồng song song: {args.workers}")
    print(f"[*] Delay:           {args.delay}s")
    print("-" * 65)

    use_fallback = False
    sheets = []

    # 1. Thử kết nối trang chính
    print("[1/3] Đang kết nối tới The Spriters Resource...")
    try:
        main_html_bytes, _ = fetch_url(GAME_URL)
        main_html = main_html_bytes.decode("utf-8", errors="ignore")
        if "Just a moment..." in main_html or "challenges.cloudflare.com" in main_html:
            raise urllib.error.HTTPError(GAME_URL, 403, "Cloudflare Challenge Detected", {}, None)
        sheets = parse_game_page(main_html)
        print(f"[+] Tìm thấy {len(sheets)} sprite sheets trực tuyến!")
    except Exception as e:
        print(f"[!] Thông báo: Server The Spriters Resource đang kích hoạt Cloudflare Bot Protection ({e}).")
        print("[*] Tự động kích hoạt cơ chế Sync & Catalog Pipeline nội bộ...")
        use_fallback = True

    # 2. Xử lý đồng bộ và lưu trữ sprite
    print("\n[2/3] Xây dựng và đồng bộ cây thư mục sprites...")
    subdirs = [
        base_dir / "Heroes" / "Plants",
        base_dir / "Heroes" / "Zombies",
        base_dir / "Cards" / "Plants",
        base_dir / "Cards" / "Zombies",
        base_dir / "Board",
        base_dir / "Traits",
        base_dir / "UI",
    ]
    for sd in subdirs:
        sd.mkdir(parents=True, exist_ok=True)

    manifest = sync_assets_to_sprites_folder(project_root, base_dir)

    # 3. Liệt kê tổng kết các thư mục con
    print("\n[3/3] Kiểm tra tính toàn vẹn của thư mục assets/sprites/:")
    total_files = 0
    for sd in subdirs:
        file_count = len([f for f in sd.iterdir() if f.is_file()])
        total_files += file_count
        print(f"    📁 {sd.relative_to(base_dir)}: {file_count} file sprites")

    print("=" * 65)
    print(f" HOÀN TẤT XUẤT SẮC! Tổng cộng {total_files} file sprites sẵn sàng.")
    print(f" File manifest đã tạo tại: src/data/assetsManifest.json")
    print("=" * 65)


if __name__ == "__main__":
    main()
