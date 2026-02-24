# Nebula Downloader v1.2.0 Release Notes

Welcome to Nebula Downloader v1.2.0! This release brings a complete rewrite of our database engine, major resilience improvements to the download pipeline, and a bedrock of automated testing to guarantee stability for all future updates.

## ✨ Highlights & New Features

* **SQLite Database Migration**: We've completely replaced the old file-system database with a robust SQLite engine (`better-sqlite3`). This dramatically improves performance, eliminates data corruption from concurrent file writes, and ensures your history and queued downloads are rock solid.
* **Download Resilience**: Network connections are now fully managed. Downloads auto-pause on network loss and auto-resume when you're back online. 
* **Dependency Robustness**: The internal `yt-dlp` and `FFmpeg` installers are now fault-tolerant, featuring automatic connection retries, longer 45-second timeouts, and fallback GitHub mirrors to seamlessly bypass rate limits.
* **Continuous Integration (CI)**: Our GitHub Actions pipeline now automatically builds, lints, and executes an exhaustive End-to-End browser simulation suite using Playwright on every change, ensuring zero regressions.

## 🚀 Quality of Life Improvements

* **Clean Workspaces**: Resolved issues where `.part` cache files would accidentally leak into the application's root directory.
* **Instant Start & Stop**: Start/Pause controls are now instantaneously synced between the UI and the background Electron workers, with zero lag.
* **Simplified Linux Footprint**: Focusing entirely on the universally-compatible `.AppImage` format for Linux distributions to eliminate confusing package management across diverse distros.

---

**Upgrade Instructions**: 
Download the appropriate installer for your platform from the release assets below.
* Windows: `Nebula-Downloader-Setup-1.2.0.exe`
* Linux: `Nebula-Downloader-1.2.0.AppImage`

Thank you for using Nebula Downloader! 🚀
