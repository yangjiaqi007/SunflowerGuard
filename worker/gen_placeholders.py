#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成太阳花守护官网的截图占位图（PNG）。
仅使用 Python 标准库（zlib + struct），无需第三方依赖。
输出 5 张 1080x2340（9:19.5）的绿色调占位图，标注功能名与"截图待替换"。
"""
import os, struct, zlib

W, H = 1080, 2340
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img', 'screenshots')

# 品牌色
BG_TOP = (0xF0, 0xF7, 0xF0)      # #F0F7F0
BG_BOTTOM = (0xD8, 0xEF, 0xD8)   # 浅绿渐变
GREEN = (0x4A, 0x9E, 0x4D)        # 主绿
GREEN_DARK = (0x2D, 0x5A, 0x2D)   # 深绿文字
WHITE = (0xFF, 0xFF, 0xFF)
HINT = (0x80, 0x80, 0x80)

SHOTS = [
    ("home",       "🏠", "首页 · 今日用药"),
    ("reminder",   "🔔", "用药提醒 · 全屏"),
    ("infusion",   "💉", "挂水记录"),
    ("history",    "📋", "历史记录 · 导出"),
    ("addplan",    "✨", "文字输入建计划"),
]

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i]-a[i]) * t) for i in range(3))

def gradient_bg(pixels):
    for y in range(H):
        c = lerp(BG_TOP, BG_BOTTOM, y / H)
        row = bytes(c) * W
        pixels[y] = row

def fill_rect(pixels, x0, y0, x1, y1, color):
    row = bytes(color) * (x1 - x0)
    for y in range(y0, y1):
        if 0 <= y < H:
            pixels[y] = pixels[y][:x0*3] + row + pixels[y][x1*3:]

def draw_text_dummy(pixels, cx, cy, w, h, color):
    """用简单矩形模拟一条文字（占位，不渲染真实字体）"""
    fill_rect(pixels, cx - w//2, cy - h//2, cx + w//2, cy + h//2, color)

def build_png(pixels, path):
    raw = b''.join(b'\x00' + pixels[y] for y in range(H))  # 每行 filter=0
    comp = zlib.compress(raw, 9)

    def chunk(typ, data):
        c = struct.pack('>I', len(data)) + typ + data
        c += struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)
        return c

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0)  # 8-bit, color type 2 (RGB)
    png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', comp) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)

def make_shot(name, emoji, title):
    # 初始化每行为背景
    buf = []
    for y in range(H):
        c = lerp(BG_TOP, BG_BOTTOM, y / H)
        buf.append(bytearray(bytes(c) * W))
    pixels = buf

    # 顶部状态栏区域（留白）
    # 顶部应用栏（渐变绿条）
    for y in range(110, 210):
        c = lerp(GREEN, (0x7B, 0xC6, 0x7E), (y-110)/100)
        row = bytes(c) * W
        pixels[y] = bytearray(row)

    # 中心卡片（白色圆角感，用矩形近似）
    fill_rect(pixels, 90, 360, W-90, 1500, WHITE)
    # 卡片描边
    fill_rect(pixels, 90, 360, W-90, 366, GREEN)
    fill_rect(pixels, 90, 1494, W-90, 1500, GREEN)

    # 卡片内"药丸"图标占位（绿色圆角矩形）
    fill_rect(pixels, 200, 520, 420, 720, GREEN)
    # 模拟几条文字行
    for i, w in enumerate([600, 460, 700, 380, 540, 500]):
        cy = 820 + i * 100
        draw_text_dummy(pixels, W//2 + 80, cy, w, 28, GREEN_DARK if i % 2 == 0 else HINT)

    # 底部 Tab 栏
    fill_rect(pixels, 0, H-180, W, H, WHITE)
    fill_rect(pixels, 0, H-184, W, H-180, (0xE0, 0xED, 0xE0))
    # 4 个 tab 占位块
    for tx in [W//8, W*3//8, W*5//8, W*7//8]:
        draw_text_dummy(pixels, tx, H-90, 80, 80, GREEN if tx == W//8 else HINT)

    # 中心标题水印（大字块）
    draw_text_dummy(pixels, W//2, 2000, 700, 60, GREEN_DARK)
    draw_text_dummy(pixels, W//2, 2120, 520, 36, HINT)

    out = os.path.join(OUT, name + '.png')
    build_png(pixels, out)
    print('生成:', out)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, emoji, title in SHOTS:
        make_shot(name, emoji, title)
    print('完成，共 %d 张占位图。' % len(SHOTS))
