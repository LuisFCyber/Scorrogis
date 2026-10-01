#!/usr/bin/env python3
"""Gera ícones PWA (192x192 e 512x512) para a plataforma Rotas Seguras."""
import struct
import zlib
import os
import math

OUT_DIR = "/home/z/my-project/public"

def make_png(width: int, height: int) -> bytes:
    """Cria um PNG simples com gradiente e símbolo de gota/shield."""
    # Buffer de pixels RGBA
    pixels = bytearray()
    for y in range(height):
        pixels.append(0)  # filter byte
        for x in range(width):
            # Gradiente diagonal: azul escuro -> vermelho
            t = (x + y) / (width + height)
            r = int(30 + t * 200)
            g = int(64 + t * 30)
            b = int(175 - t * 100)
            a = 255

            # Desenhar "gota" no centro (círculo branco)
            cx, cy = width / 2, height / 2
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            radius = min(width, height) * 0.28
            if dist < radius:
                # Interior branco
                r, g, b = 255, 255, 255
                # Símbolo de "!" azul no centro
                if abs(dx) < width * 0.04 and dy < height * 0.08 and dy > -height * 0.10:
                    r, g, b = 30, 64, 175
                if abs(dx) < width * 0.04 and dy > height * 0.12 and dy < height * 0.18:
                    r, g, b = 30, 64, 175
            elif dist < radius + 4:
                # Borda
                r, g, b = 30, 64, 175

            pixels.extend([r, g, b, a])

    # Monta PNG
    def chunk(typ: bytes, data: bytes) -> bytes:
        c = typ + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(pixels), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for size in (192, 512):
        data = make_png(size, size)
        path = os.path.join(OUT_DIR, f"icon-{size}.png")
        with open(path, "wb") as f:
            f.write(data)
        print(f"Gerado: {path} ({len(data)} bytes)")

if __name__ == "__main__":
    main()
