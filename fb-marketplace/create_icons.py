"""
Simple script to create placeholder icon files for the Chrome extension.
Run this script to generate the required icon files.
"""

from PIL import Image, ImageDraw
import os

def create_icon(size, filename):
    """Create a simple colored square icon"""
    # Create a blue square with white border
    img = Image.new('RGB', (size, size), color='#1877f2')
    draw = ImageDraw.Draw(img)
    
    # Draw a simple bike emoji or text
    # For simplicity, just create a colored square
    # You can customize this to add text or shapes
    
    img.save(filename)
    print(f"Created {filename} ({size}x{size})")

def main():
    """Create all required icon sizes"""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("Pillow is required. Install it with: pip install Pillow")
        return
    
    sizes = [16, 48, 128]
    for size in sizes:
        create_icon(size, f"icon{size}.png")
    
    print("\nAll icon files created successfully!")

if __name__ == "__main__":
    main()

