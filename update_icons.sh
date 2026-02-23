#!/bin/bash

# Ensure a file path was provided
if [ -z "$1" ]; then
  echo "Usage: ./update_icons.sh /path/to/downloaded/new_logo.png"
  echo "Please provide the path to the logo image you downloaded from the chat."
  exit 1
fi

INPUT_IMG="$1"

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null; then
    echo "ImageMagick is not installed or 'magick' command is not found."
    echo "Please install it using your package manager, e.g., 'sudo pacman -S imagemagick' or 'sudo apt install imagemagick'."
    exit 1
fi

echo "🖼️ Processing icons for Nebula Downloader..."

echo "1️⃣ Generating 1024x1024 master icon (/build/icon.png)..."
magick "$INPUT_IMG" -resize 1024x1024 build/icon.png

echo "2️⃣ Generating Windows .ico from master (/build/icon.ico)..."
magick build/icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico

echo "3️⃣ Generating inside app UI icon (/resources/icon.png)..."
# Using 256x256 for the inside app UI, which is commonly used
magick build/icon.png -resize 256x256 resources/icon.png

echo "✨ All icons have been successfully generated and placed in their respective folders!"
