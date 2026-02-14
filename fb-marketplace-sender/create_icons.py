"""Create placeholder icons. Run: python3 create_icons.py"""
import base64
import struct

# Minimal 1x1 blue PNG (scaled by Chrome)
# Minimal valid 1x1 PNG (Chrome scales it)
PNG_BLUE = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP4z8AAAAMBAQD3A0FDAAAAAElFTkSuQmCC"
)

for size in [16, 48, 128]:
    with open(f"icon{size}.png", "wb") as f:
        f.write(PNG_BLUE)
    print(f"Created icon{size}.png")
