#!/bin/bash
set -e

# Directory setup
mkdir -p resources/bin

echo "Downloading ffmpeg for Windows..."
curl -L -o ffmpeg-win.zip https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
unzip -o -j ffmpeg-win.zip "*/bin/ffmpeg.exe" -d resources/bin/
rm ffmpeg-win.zip

echo "Downloading ffmpeg for Linux..."
curl -L -o ffmpeg-linux.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-linux.tar.xz
# Find the extracted directory name (usually something like ffmpeg-6.0-amd64-static)
FFMPEG_DIR=$(find . -maxdepth 1 -type d -name "ffmpeg-*-static" | head -n 1)
cp "$FFMPEG_DIR/ffmpeg" resources/bin/
rm -rf "$FFMPEG_DIR" ffmpeg-linux.tar.xz

echo "Done! Binaries are in resources/bin/"
ls -l resources/bin/
