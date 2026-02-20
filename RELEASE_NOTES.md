# Nebula Downloader v1.1.0 Release Notes

Welcome to Nebula Downloader v1.1.0! This release brings a massive overhaul to the user interface, critical security hardening, and numerous quality-of-life improvements to make downloading videos smoother and safer than ever.

## ✨ Highlights & New Features

* **Drag-and-Drop Support**: You can now drag URLs directly onto the application window from your browser to instantly start a download.
* **Format Selection Overhaul**: The "Add Download" modal has been completely redesigned with dedicated Video and Audio tabs. You now have granular control over resolutions (up to 8K), container formats (mp4, mkv, webm), and audio bitrates.
* **Fluid Sidebar**: The new collapsible sidebar features smooth CSS animations, active state indicators, and tooltips, saving screen space while maintaining a premium feel.
* **Smart Quality Filtering**: The quality dropdown now dynamically fetches metadata and only shows resolutions that are actually available for that specific video.

## 🛡️ Security & Stability (Hardening)

* **API Security**: The internal server is now strictly locked to `localhost` (127.0.0.1) with strict CORS policies, completely preventing unauthorized access from external applications or websites.
* **Electron Hardening**: Improved sandbox implementation and tightened the preload script to follow strict context isolation best practices.
* **Database Integrity**: Fixed a race condition (using Mutex locks) where concurrent download updates could lead to data corruption or missing status changes.
* **Input Sanitization**: Fixed path traversal vulnerabilities, ensuring filenames and paths are safely handled during the download process.

## 🚀 Major Bug Fixes & Improvements

* **"Null Exit Code" Crash Fixed**: Interrupted downloads no longer enter an infinite retry loop and correctly report as "Interrupted".
* **Real-time Progress Tracking**: Fixed a bug where progress and speed would commonly stay stuck at 0%. Parsing is now real-time and highly accurate.
* **Metadata Integration**: Switched to embedding thumbnails and metadata directly into the files rather than cluttering your folders with separate `.jpg` or `.info.json` files.
* **Temporary File Management**: All `yt-dlp` temporary `.part` files are now strictly directed to the designated downloads directory instead of leaking into the application root.
* **Audio Format Support**: Added a dedicated flow for audio-only downloads, including selectable formats (.mp3, .m4a) and automatic thumbnail embedding.
* **Open File Fallback**: Implemented an automated extension-fallback system! If the app expects a `.webm` file but the video was merged to `.mp4`, it automatically finds the correct file and updates the database.

---

**Upgrade Instructions**: 
Download the appropriate installer for your platform from the release assets below.
* Windows: `Nebula-Downloader-Setup-1.1.0.exe`
* Linux: `.AppImage` or `.snap` 

Thank you for using Nebula Downloader! 🚀
