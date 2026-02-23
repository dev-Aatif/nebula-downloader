<div align="center">
  <img src="build/icon.png" alt="Nebula Downloader Logo" width="160">
  
  # Nebula Downloader
  
  **A sleek, powerful video downloader with a stunning dark-mode UI**
  
  [![Release](https://img.shields.io/github/v/release/dev-Aatif/nebula-downloader?style=for-the-badge&color=7c3aed)](https://github.com/dev-Aatif/nebula-downloader/releases/latest)
  [![Platform Windows](https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/dev-Aatif/nebula-downloader/releases/latest)
  [![Platform Linux](https://img.shields.io/badge/Linux_AppImage-FCC624?style=for-the-badge&logo=linux&logoColor=black)](https://github.com/dev-Aatif/nebula-downloader/releases/latest)
  [![License](https://img.shields.io/github/license/dev-Aatif/nebula-downloader?style=for-the-badge&color=22c55e)](LICENSE)

</div>

<br />

Nebula Downloader reimagines media extraction. Built around the powerful `yt-dlp` engine, it offers a seamless, beautiful, and highly intuitive experience for downloading videos and audio from over 1,000 supported websites.

---

## ⚡ Key Features

*   **Universal Compatibility** — Download media seamlessly from YouTube, Twitter/X, Vimeo, Instagram, and 1,000+ other platforms.
*   **Stunning Interface** — A premium "Nebula" theme utilizing glassmorphism, neon highlights, and buttery-smooth micro-animations.
*   **Intelligent Clipboard** — Say goodbye to copy-pasting. Nebula automatically detects and queues supported media links directly from your clipboard.
*   **Granular Format Control** — Up to 8K resolution video support, direct audio extraction (MP3, WAV, M4A), and format merging (MP4, MKV, WebM).
*   **Resilient Connectivity** — Network dropped? Downloads pause automatically and gracefully resume when you're back online.
*   **Reliable Internals** — Features robust concurrent queue management, automatic metadata extraction (titles and thumbnails), and an isolated SQLite indexing engine for high performance.

---

## 📥 Downloads & Supported Platforms

Nebula Downloader is officially compiled and tested **exclusively** for the following environments:

| OS | Format | Architecture | Download |
| :--- | :--- | :--- | :--- |
| **Windows 10 / 11** | Installer `.exe` | x64 | [Download Latest](https://github.com/dev-Aatif/nebula-downloader/releases/latest) |
| **Linux** | Universal `.AppImage` | x64 | [Download Latest](https://github.com/dev-Aatif/nebula-downloader/releases/latest) |

> *Note: macOS and other Linux package formats (like Snap or Flatpak) are not officially supported at this time.*

---

## 💻 Under the Hood

Nebula is built with a modern, high-performance web stack:

*   **Core Desktop Engine**: [Electron](https://www.electronjs.org/)
*   **Storage & State**: [SQLite](https://github.com/WiseLibs/better-sqlite3) (replacing LowDB for ACID compliance)
*   **UI Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Styling System**: [Tailwind CSS](https://tailwindcss.com/)
*   **Testing Infrastructure**: [Vitest](https://vitest.dev/) (Unit) and [Playwright](https://playwright.dev/) (E2E)
*   **Tooling & Build Pipeline**: [Vite](https://vitejs.dev/) + [Electron-Vite](https://electron-vite.org/)

---

## 🛠️ Development Setup

If you wish to build Nebula Downloader from source or contribute to the project:

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [npm](https://www.npmjs.com/)

### Running Locally

```bash
# Clone the repository
git clone https://github.com/dev-Aatif/nebula-downloader.git
cd nebula-downloader

# Install dependencies (automatically installs native bindings)
npm install

# Run the development server
npm run dev
```

### Building for Production

```bash
# Build the universal AppImage for Linux
npm run build:linux

# Build the Windows installer
npm run build:win
```

### Running Tests

```bash
# Run unit tests and generate coverage reports
npm run test:coverage

# Run headless end-to-end browser component tests
npm run test:e2e
```

---

## ⚖️ License & Acknowledgements

This project is licensed under the **GPL-3.0 License** — see the [LICENSE](LICENSE) file for complete details.

Nebula Downloader stands on the shoulders of giants. A tremendous thank you to:
*   [yt-dlp](https://github.com/yt-dlp/yt-dlp) — The uncompromising download engine driving the core functionality.
*   [FFmpeg](https://ffmpeg.org/) — The industry standard for media merging and processing.
