#!/usr/bin/env python3
"""Redimensiona e grava a marca d'água nas fotos iniciais do catálogo.

Uso: python3 -I scripts/watermark_seed.py <pasta_origem> <pasta_destino> "@marca"
Os arquivos de origem devem se chamar <slug>.jpg; o destino recebe <slug>.jpg.
A mesma marca é aplicada no navegador a cada upload feito pelo painel.
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
MAX_SIDE = 1200


def watermark(img: Image.Image, text: str) -> Image.Image:
    img = img.convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    w, h = img.size

    # Marca diagonal repetida, translúcida, cobrindo a foto toda.
    size = max(16, w // 22)
    font = ImageFont.truetype(FONT, size)
    tile = Image.new("RGBA", (int(w * 1.6), int(h * 1.6)), (0, 0, 0, 0))
    td = ImageDraw.Draw(tile)
    step_x, step_y = int(size * len(text) * 0.75), int(size * 4.2)
    for row, y in enumerate(range(0, tile.height, step_y)):
        for x in range(-step_x, tile.width, step_x):
            td.text((x + (step_x // 2 if row % 2 else 0), y), text, font=font, fill=(255, 255, 255, 58))
    tile = tile.rotate(28, resample=Image.BICUBIC)
    left, top = (tile.width - w) // 2, (tile.height - h) // 2
    base = img.convert("RGBA")
    base.alpha_composite(tile.crop((left, top, left + w, top + h)))

    # Marca nítida no canto inferior esquerdo.
    cfont = ImageFont.truetype(FONT, max(14, w // 30))
    d = ImageDraw.Draw(base)
    pad = max(10, w // 50)
    pos = (pad, h - pad - cfont.size - 4)
    d.text((pos[0] + 2, pos[1] + 2), text, font=cfont, fill=(0, 0, 0, 150))
    d.text(pos, text, font=cfont, fill=(255, 255, 255, 235))
    return base.convert("RGB")


def main() -> None:
    src, dst, text = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    dst.mkdir(parents=True, exist_ok=True)
    for f in sorted(src.glob("*.jpg")):
        out = watermark(Image.open(f), text)
        out.save(dst / f.name, "JPEG", quality=80, optimize=True, progressive=True)
        print(f"{f.name} -> {dst / f.name}")


if __name__ == "__main__":
    main()
