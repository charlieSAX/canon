# Authoring-time tool: generate the PWA icon set without external imaging
# libraries. A gallery-frame motif on #0d0d0d, drawn pixel by pixel.
import struct
import zlib

BG = (0x0D, 0x0D, 0x0D)
INK = (0xEC, 0xE8, 0xE1)


def png_bytes(size, pixels):
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))

    raw = b''
    for y in range(size):
        raw += b'\x00'
        for x in range(size):
            raw += bytes(pixels(x, y))
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def frame_icon(size, inset_ratio, inner_ratio, stroke_ratio):
    o = round(size * inset_ratio)
    i = round(size * inner_ratio)
    w = max(1, round(size * stroke_ratio))

    def on_frame(x, y, lo, hi):
        inside = lo <= x <= hi and lo <= y <= hi
        core = lo + w <= x <= hi - w and lo + w <= y <= hi - w
        return inside and not core

    def px(x, y):
        if on_frame(x, y, o, size - 1 - o) or on_frame(x, y, i, size - 1 - i):
            return INK
        return BG

    return png_bytes(size, px)


def write(path, data):
    with open(path, 'wb') as f:
        f.write(data)
    print(path)


# Standard icons: frame sits wide.
write('public/icons/icon-512.png', frame_icon(512, 0.18, 0.34, 0.012))
write('public/icons/icon-192.png', frame_icon(192, 0.18, 0.34, 0.014))
write('public/icons/apple-touch-icon.png', frame_icon(180, 0.2, 0.36, 0.014))
# Maskable: everything important inside the central safe zone.
write('public/icons/icon-512-maskable.png', frame_icon(512, 0.3, 0.42, 0.012))
write('public/icons/icon-192-maskable.png', frame_icon(192, 0.3, 0.42, 0.014))
