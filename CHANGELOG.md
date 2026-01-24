# Changelog

All notable changes to the Nebula Downloader project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.2.0] - 2026-01-22

### Added

#### Cross-Platform Support

- **Linux Support**: Full Linux compatibility with AppImage and Snap packages
- **Platform Detection**: Automatic detection and download of correct yt-dlp binary for each OS
- **Executable Permissions**: Automatic `chmod +x` for binaries on Linux/macOS

#### Build System

- **Platform-Specific Resources**: ffmpeg binaries are now bundled per-platform to reduce app size
- **Optimized Packaging**: Windows builds only include Windows binaries, Linux builds only include Linux binaries

### Changed

- Updated dependency manager to handle cross-platform binary paths
- Improved development workflow with updated resource paths

### Fixed

- Fixed yt-dlp download failing on Linux due to hardcoded `.exe` extension
- Fixed ffmpeg path resolution for Linux systems

---

## [1.1.0] - 2026-01-11

### Added

#### User Experience

- **Bulk Actions**: Select multiple downloads to pause, resume, retry, or delete at once
- **Context Menu**: Right-click any download for quick access to actions
- **Auto-save Settings**: Settings now save automatically after 1 second of inactivity
- **Search Results Indicator**: Shows "X results" in search bar when filtering
- **Expanded Footer**: Click chevron to view all active downloads with mini progress bars
- **Status Icons**: Download status pills now display icons (Play, Check, Pause, Alert, Clock)

#### Accessibility

- **ARIA Labels**: Added to all toolbar and menu buttons for screen readers
- **Focus-visible States**: Keyboard navigation now shows visible focus rings
- **Reduced Motion**: Added `prefers-reduced-motion` media query support
- **Lazy Loading**: Thumbnails now use native lazy loading for performance

#### UI Polish

- **Toggle Switch**: Replaced inline JS toggle with pure CSS component
- **Instant Loading**: Removed artificial 800ms loading delay
- **Improved Text**: "Location pending..." changed to "Preparing download..."

### Fixed

#### Critical Bugs

- **Missing Files Bug**: Fixed downloads completing but files not being saved
  - Added `--no-simulate` flag to prevent yt-dlp simulation mode
  - Fixed JSON parsing errors from unquoted `NA` values
  - Resolved database race conditions during concurrent updates
- **Playlist Loop**: Fixed app hanging when checking single video URLs for playlists
- **Retry Mechanism**: Failed downloads can now be retried with a single click
- **Fake Timestamps**: Log entries now show accurate real-time timestamps
- **Upload Speed**: Removed hardcoded/fake upload speed display
- **Error Messages**: Download errors are now displayed inline in the download row
- **Native Dialogs**: Replaced `window.confirm()` with custom ConfirmDialog component

### Changed

- Settings footer now shows dynamic save status (Saving.../Saved/Unsaved changes)
- Download row hover contrast improved for better visibility

---

## [1.0.0] - Initial Release

### Features

- Download videos from 1000+ supported sites via yt-dlp
- Queue management with pause/resume capabilities
- Configurable download directory and format preferences
- Real-time progress tracking with speed and ETA
- Thumbnail preview and metadata display
- Dark mode interface with neon blue accent colors
