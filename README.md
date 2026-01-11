# Nebula Downloader

Nebula Downloader is a high-performance, aesthetically pleasing media downloader built with Electron, React, and TypeScript. It leverages the power of `yt-dlp` to provide a robust downloading experience for various platforms.

## ✨ Features

- **High-Performance Downloading**: Powered by `yt-dlp` for maximum speed and compatibility.
- **Modern Aesthetics**: A stunning "Nebula" dark-mode UI with vibrant neon accents and glassmorphism.
- **Smart Clipboard Detection**: Automatically detects video URLs from your clipboard for a seamless workflow.
- **Queue Management**: Pause, resume, and retry failed downloads with ease.
- **Detailed Progress Tracking**: Real-time stats including speed, ETA, and progress percentages.
- **Automatic Metadata**: Fetches thumbnails and titles automatically for your downloads.
- **Network Resilience**: Auto-pauses downloads on network loss and resumes when back online.
- **History Tracking**: Keeps a log of all your completed downloads.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) (Managed automatically or can be specified in settings)
- [FFmpeg](https://ffmpeg.org/) (Required for post-processing and merging streams)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/nebula-downloader.git
   cd nebula-downloader
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run dev
   ```

### Building for Production

To create a production build for your OS:

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## ⌨️ Keyboard Shortcuts

| Shortcut   | Action                      |
| ---------- | --------------------------- |
| `Ctrl + N` | Add New Download            |
| `Ctrl + ,` | Open Settings               |
| `Ctrl + H` | View History                |
| `Esc`      | Close Modal / Cancel Dialog |
| `Enter`    | Confirm Dialog              |

## 🛠️ Technology Stack

- **Framework**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Custom CSS
- **Database**: [LowDB](https://github.com/typicode/lowdb) for state persistence
- **Build Tool**: [Vite](https://vitejs.dev/) with [electron-vite](https://electron-vite.org/)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for the incredible backend tool.
- [electron-vite](https://electron-vite.org/) for the excellent boilerplate and build tools.
