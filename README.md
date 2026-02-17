# Nebula Downloader

<p align="center">
  <img src="build/icon.png" alt="Nebula Downloader Logo" width="128">
</p>

<p align="center">
  <strong>A sleek, powerful video downloader with a stunning dark-mode UI</strong>
</p>

<p align="center">
  <a href="https://github.com/dev-Aatif/nebula-downloader/releases/latest">
    <img src="https://img.shields.io/github/v/release/dev-Aatif/nebula-downloader?style=for-the-badge&color=7c3aed" alt="Latest Release">
  </a>
  <a href="https://github.com/dev-Aatif/nebula-downloader/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/dev-Aatif/nebula-downloader?style=for-the-badge&color=22c55e" alt="License">
  </a>
</p>

---

## 📥 Download

| Platform    | Download                                                                       | Type          |
| ----------- | ------------------------------------------------------------------------------ | ------------- |
| **Windows** | [Portable ZIP](https://github.com/dev-Aatif/nebula-downloader/releases/latest) | Extract & Run |
| **Linux**   | [AppImage](https://github.com/dev-Aatif/nebula-downloader/releases/latest)     | Universal     |
| **Linux**   | [Snap](https://github.com/dev-Aatif/nebula-downloader/releases/latest)         | Ubuntu/Snap   |

---

## ✨ Features

- **1000+ Supported Sites** — Download from YouTube, Vimeo, Twitter, and many more
- **Modern Dark UI** — Stunning "Nebula" theme with neon accents and glassmorphism
- **Smart Clipboard** — Automatically detects video URLs from your clipboard
- **Queue Management** — Pause, resume, retry, and manage multiple downloads
- **Real-time Progress** — Speed, ETA, and progress tracking for all downloads
- **Auto Metadata** — Fetches thumbnails and titles automatically
- **Network Resilience** — Auto-pauses on network loss, resumes when back online
- **Download History** — Complete log of all your past downloads

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/dev-Aatif/nebula-downloader.git
cd nebula-downloader

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Building

```bash
# Build for Linux
npm run build:linux

# Build for Windows
npm run build:win
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut   | Action           |
| ---------- | ---------------- |
| `Ctrl + N` | Add New Download |
| `Ctrl + ,` | Open Settings    |
| `Ctrl + H` | View History     |
| `Esc`      | Close Modal      |
| `Enter`    | Confirm Dialog   |

---

## 🛠️ Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [LowDB](https://github.com/typicode/lowdb)
- **Build**: [Vite](https://vitejs.dev/) + [electron-vite](https://electron-vite.org/)

---

## 📜 License

This project is licensed under the GPL-3.0 License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — The powerful download engine
- [FFmpeg](https://ffmpeg.org/) — For media processing
- [electron-vite](https://electron-vite.org/) — Excellent build tooling
