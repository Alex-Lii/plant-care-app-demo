#!/usr/bin/env python3
"""把 assets.jpg 切成 Android mipmap 各密度 + 自适应图标背景 + iOS AppIcon 占位 + 512 商店图"""
from PIL import Image, ImageDraw
import os, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets.jpg")
ANDROID_RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
STORE = os.path.join(ROOT, "store")
os.makedirs(STORE, exist_ok=True)

img = Image.open(SRC).convert("RGBA")

# 各密度尺寸：mdpi=1 baseline, hdpi×1.5, xhdpi×2, xxhdpi×3, xxxhdpi×4
mipmaps = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

print("Writing Android mipmap icons…")
for folder, size in mipmaps.items():
    out = os.path.join(ANDROID_RES, folder, "ic_launcher.png")
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(out, "PNG")
    print(f"  {folder}: {size}px")
    # Android 8.0+ 自适应图标用 ic_launcher_round 也指向同一张（保留圆角裁剪）
    out_round = os.path.join(ANDROID_RES, folder, "ic_launcher_round.png")
    # 自动生成圆角 square icon：把圆角 mask 应用上去
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    # 圆角半径按图标尺寸的 22%（Material Design 规范）
    r = int(size * 0.22)
    d.rounded_rectangle((0, 0, size, size), radius=r, fill=255)
    rounded = resized.copy()
    rounded.putalpha(mask)
    rounded.save(out_round, "PNG")

# Adaptive icon XML（Android 8+，系统自动加前景/背景层）
print("Writing adaptive icon XMLs…")
anydpi = os.path.join(ANDROID_RES, "mipmap-anydpi-v26")
os.makedirs(anydpi, exist_ok=True)

ic_launcher_xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_round"/>
    <monochrome android:drawable="@mipmap/ic_launcher_round"/>
</adaptive-icon>
"""
with open(os.path.join(anydpi, "ic_launcher.xml"), "w") as f:
    f.write(ic_launcher_xml)
with open(os.path.join(anydpi, "ic_launcher_round.xml"), "w") as f:
    f.write(ic_launcher_xml)

# 自适应图标背景（纯色 cream #f8f4ed）
bg = Image.new("RGBA", (432, 432), (248, 244, 237, 255))
bg_out = os.path.join(ANDROID_RES, "drawable", "ic_launcher_background.png")
bg.save(bg_out, "PNG")
print("  drawable/ic_launcher_background.png")

# iOS AppIcon 占位（统一 PNG + Contents.json）
print("Writing iOS AppIcon placeholder…")
ios_dir = os.path.join(ROOT, "ios")
if os.path.exists(ios_dir):
    appicon_dir = os.path.join(ios_dir, "App", "Assets.xcassets", "AppIcon.appiconset")
    os.makedirs(appicon_dir, exist_ok=True)
    ios_sizes = {
        "Icon-App-20x20@1x.png": 20,
        "Icon-App-20x20@2x.png": 40,
        "Icon-App-20x20@3x.png": 60,
        "Icon-App-29x29@1x.png": 29,
        "Icon-App-29x29@2x.png": 58,
        "Icon-App-29x29@3x.png": 87,
        "Icon-App-40x40@1x.png": 40,
        "Icon-App-40x40@2x.png": 80,
        "Icon-App-40x40@3x.png": 120,
        "Icon-App-60x60@2x.png": 120,
        "Icon-App-60x60@3x.png": 180,
        "Icon-App-76x76@1x.png": 76,
        "Icon-App-76x76@2x.png": 152,
        "Icon-App-83.5x83.5@2x.png": 167,
        "Icon-App-1024x1024@1x.png": 1024,
    }
    for name, sz in ios_sizes.items():
        img.resize((sz, sz), Image.LANCZOS).save(os.path.join(appicon_dir, name), "PNG")

# 512 商店图标
print("Writing store icon 512px…")
store512 = img.resize((512, 512), Image.LANCZOS)
store512.save(os.path.join(STORE, "icon-512.png"), "PNG")

print("\nDone.")
print(f"  Android mipmap ic_launcher / ic_launcher_round × 5 densities")
print(f"  Android adaptive XML + background")
print(f"  iOS AppIcon ({len(ios_sizes) if os.path.exists(ios_dir) else '— ios dir not present'})")
print(f"  store/icon-512.png")
