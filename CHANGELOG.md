# Changelog

All notable changes to the Nebula Downloader project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.3.0] - 2026-02-27

### Added

- **Integration Test Suite**: Complete integration coverage for audio extraction variations and video container combinations, ensuring robust local operation.

### Fixed

- **MKV & WebM Support**: Perfected backend muxing for MP4, MKV, and WebM format payloads to cleanly bypass incompatible `yt-dlp` track flags.
- **Dynamic Quality Filtering**: UI strictly blocks selection of unavailable video qualities/containers before queuing.
- **Audio Extract Integrity**: Prevented audio extracts and MKV files from crashing ffmpeg due to embedded thumbnail limitations.
- **Download Path Verification**: Fixed metadata sync issues where yt-dlp's extension updates caused integrity failures in the local database.

## [1.2.0] - 2026-02-24

### Added

- **Complete Test Suite**: Full coverage with Vitest for unit testing and Playwright for E2E testing.
- **Resilient Downloads**: Connection timeouts increased, with download state resuming reliably after restarts or network interruptions.

### Changed

- **Database Engine**: Migrated from lowdb to SQLite (`better-sqlite3`) for improved performance, robustness, and concurrent access handling.
- **Documentation**: Revamped README to be more professional and clearly define supported platforms (Windows & AppImage).

---

## [1.1.0] - 2026-02-17

### Added

- **Format Selection Overhaul**:
  - New "Add Download" modal with tabs for Video and Audio.
  - Granular control over resolution (up to 8K), container (mp4, mkv, webm), and audio bitrate.
  - Dedicated "Extract Audio" mode with format selection (mp3, m4a, wav).
- **Drag-and-Drop Support**: Drag URLs directly onto the application window to start downloads.
- **Responsive Sidebar**: Collapsible sidebar with icon-only mode for better space utilization.
- **Sidebar Toggle**: Toggle button to collapse/expand the sidebar.

### Fixed

- **Progress Parsing**: Fixed issues where progress would get stuck at 0% or show incorrect speeds.
- **Thumbnail Embedding**: Improved metadata and thumbnail embedding reliability.
- **Binary Updates**: Enhanced the update mechanism for yt-dlp and ffmpeg binaries.

### Changed

- **UI Refinement**: Polished standard view with better spacing and typography.
- **App.tsx**: Refactored internal state management for better performance and maintainability.

---

## [1.0.0] - Initial Release

### Features

- Download videos from 1000+ supported sites via yt-dlp
- Queue management with pause/resume capabilities
- Configurable download directory and format preferences
- Real-time progress tracking with speed and ETA
- Thumbnail preview and metadata display
- Dark mode interface with neon blue accent colors
