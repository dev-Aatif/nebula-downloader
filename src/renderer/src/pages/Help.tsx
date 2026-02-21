import React from 'react'
import { HelpIcon, DownloadIcon } from '../components/icons'
import logo from '../assets/logo.png'

export default function Help(): React.JSX.Element {
  const faqs = [
    {
      question: 'What platforms does Nebula support?',
      answer:
        'Nebula Downloader supports downloads from over 1000 websites including YouTube, Vimeo, Dailymotion, and many more. The app uses yt-dlp under the hood, which provides extensive platform support.'
    },
    {
      question: 'How do I change download quality?',
      answer:
        'When adding a new download, you can click "Advanced Options" to select specific quality and format preferences. You can also set a default quality in Settings.'
    },
    {
      question: 'Where are my files saved?',
      answer:
        'By default, files are saved to your system\'s Downloads folder. You can change this location in Settings → Download Directory. Use the "Show in Folder" button to quickly open the file location.'
    },
    {
      question: 'Why is my download failing?',
      answer: (
        <>
          Common causes of download failures:
          <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
            <li>Invalid or expired URL</li>
            <li>Network connectivity issues</li>
            <li>Video is private or region-locked</li>
            <li>Insufficient disk space</li>
          </ul>
          Check the download details for specific error messages.
        </>
      )
    },
    {
      question: 'Can I download entire playlists?',
      answer:
        "Yes! Simply paste a playlist URL, and Nebula will detect it automatically. You'll be prompted to select which videos from the playlist you want to download."
    },
    {
      question: 'How does the download queue work?',
      answer: (
        <div className="space-y-3">
          <p>The download queue manages multiple downloads efficiently:</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>
              <strong>Concurrent Downloads:</strong> By default, up to 3 downloads run
              simultaneously (configurable in Settings)
            </li>
            <li>
              <strong>Queued Status:</strong> New downloads are queued if the limit is reached
            </li>
            <li>
              <strong>Auto-Start:</strong> Queued downloads start automatically when active
              downloads complete
            </li>
            <li>
              <strong>Pause All:</strong> Pausing suspends all active downloads; queued items remain
              waiting
            </li>
          </ul>
        </div>
      )
    }
  ]

  return (
    <div className="flex flex-col h-full bg-bg-deep overflow-y-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-neon-blue/10 to-neon-purple/10 border-b border-white/10 p-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
              <img src={logo} alt="Nebula" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-text-main">Help & Support</h1>
              <p className="text-text-dim mt-2">
                Everything you need to get started with Nebula Downloader
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-12 space-y-12">
        {/* How to Use Section */}
        <section>
          <h2 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-3">
            <DownloadIcon className="w-6 h-6 text-neon-blue" />
            How to Use
          </h2>
          <div className="space-y-6">
            <div className="bg-card/30 border border-border-glass rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-main mb-3">1. Adding a Download</h3>
              <ul className="list-disc list-inside space-y-2 text-text-dim ml-4">
                <li>
                  Click the <span className="text-neon-blue">"New File"</span> button in the toolbar
                </li>
                <li>Paste the URL of the video you want to download</li>
                <li>Select quality options (optional)</li>
                <li>Click "Download" to start</li>
                <li>
                  <strong>Keyboard shortcut:</strong>{' '}
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+N</kbd>
                </li>
              </ul>
            </div>

            <div className="bg-card/30 border border-border-glass rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-main mb-3">2. Managing Downloads</h3>
              <ul className="list-disc list-inside space-y-2 text-text-dim ml-4">
                <li>
                  <strong>Pause:</strong> Click the pause button to temporarily stop a download
                </li>
                <li>
                  <strong>Resume:</strong> Click the play button to continue a paused download
                </li>
                <li>
                  <strong>Delete:</strong> Click the trash icon to remove a download
                </li>
                <li>
                  <strong>Multi-Select:</strong> Click checkboxes to select multiple downloads for
                  bulk operations
                </li>
                <li>
                  <strong>Show in Folder:</strong> Click the folder icon to open the download
                  location
                </li>
              </ul>
            </div>

            <div className="bg-card/30 border border-border-glass rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-main mb-3">3. Viewing History</h3>
              <ul className="list-disc list-inside space-y-2 text-text-dim ml-4">
                <li>
                  Navigate to the <span className="text-neon-blue">"History"</span> page from the
                  sidebar
                </li>
                <li>View all completed downloads with statistics</li>
                <li>Search and filter your download history</li>
                <li>Export your history as JSON or CSV</li>
                <li>
                  <strong>Keyboard shortcut:</strong>{' '}
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">Ctrl+H</kbd>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section>
          <h2 className="text-2xl font-bold text-text-main mb-6 flex items-center gap-3">
            <HelpIcon className="w-6 h-6 text-neon-blue" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-card/30 border border-border-glass rounded-lg p-6">
                <h3 className="font-semibold text-text-main mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-blue"></span>
                  {faq.question}
                </h3>
                <div className="text-text-dim text-sm leading-relaxed pl-3.5 border-l border-border-glass/30">
                  {faq.answer}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section>
          <h2 className="text-2xl font-bold text-text-main mb-6">Keyboard Shortcuts</h2>
          <div className="bg-card/30 border border-border-glass rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-text-dim uppercase">
                    Action
                  </th>
                  <th className="text-left p-4 text-sm font-semibold text-text-dim uppercase">
                    Shortcut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-text-main">New Download</td>
                  <td className="p-4">
                    <kbd className="px-3 py-1 bg-white/10 rounded text-sm">Ctrl+N</kbd>
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-text-main">Open Settings</td>
                  <td className="p-4">
                    <kbd className="px-3 py-1 bg-white/10 rounded text-sm">Ctrl+,</kbd>
                  </td>
                </tr>
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-text-main">View History</td>
                  <td className="p-4">
                    <kbd className="px-3 py-1 bg-white/10 rounded text-sm">Ctrl+H</kbd>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Contact & Support */}
        <section>
          <h2 className="text-2xl font-bold text-text-main mb-6">Contact & Support</h2>
          <div className="space-y-4">
            <div className="bg-card/30 border border-border-glass rounded-lg p-6">
              <h3 className="font-semibold text-text-main mb-3">Need More Help?</h3>
              <p className="text-text-dim mb-4">
                If you're experiencing issues or have questions not covered here, we're here to
                help:
              </p>
              <div className="space-y-3 text-text-dim">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neon-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-neon-blue text-xs">📧</span>
                  </span>
                  <div>
                    <strong className="text-text-main">Email Support:</strong>{' '}
                    support@nebuladownloader.app
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neon-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-neon-blue text-xs">🌐</span>
                  </span>
                  <div>
                    <strong className="text-text-main">Documentation:</strong>{' '}
                    docs.nebuladownloader.app
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-neon-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-neon-blue text-xs">👨‍💻</span>
                  </span>
                  <div>
                    <strong className="text-text-main">Developer:</strong>{' '}
                    <a
                      href="https://github.com/dev-Aatif"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neon-blue hover:text-neon-purple transition-colors"
                    >
                      @dev-Aatif
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-neon-blue/10 to-neon-purple/10 border border-neon-blue/30 rounded-lg p-6">
              <h3 className="font-semibold text-text-main mb-2">Report a Bug</h3>
              <p className="text-text-dim text-sm">
                Found a bug? Please report it on our GitHub repository with detailed steps to
                reproduce the issue.
              </p>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="border-t border-white/10 pt-8">
          <div className="text-center space-y-2 mb-8">
            <h3 className="text-xl font-semibold text-text-main">Nebula Downloader</h3>
            <p className="text-text-dim text-sm">Version 1.0.0</p>
          </div>

          {/* Open Source Credits */}
          <div className="bg-card/30 border border-border-glass rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-main mb-4 flex items-center gap-2">
              ❤️ Open Source Credits
            </h3>
            <p className="text-text-dim text-sm mb-4">
              Nebula Downloader is built on the shoulders of these amazing open source projects:
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-xl">📥</span>
                <div>
                  <strong className="text-text-main">yt-dlp</strong>
                  <span className="text-xs text-neon-blue ml-2">Unlicense</span>
                  <p className="text-text-dim text-xs mt-1">
                    A youtube-dl fork with additional features. The core engine powering all
                    downloads.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-xl">🎬</span>
                <div>
                  <strong className="text-text-main">FFmpeg</strong>
                  <span className="text-xs text-neon-blue ml-2">LGPL/GPL</span>
                  <p className="text-text-dim text-xs mt-1">
                    Complete solution for audio/video processing, merging, and conversion.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-xl">⚡</span>
                <div>
                  <strong className="text-text-main">Electron</strong>
                  <span className="text-xs text-neon-blue ml-2">MIT</span>
                  <p className="text-text-dim text-xs mt-1">
                    Framework for building cross-platform desktop applications.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-xl">⚛️</span>
                <div>
                  <strong className="text-text-main">React</strong>
                  <span className="text-xs text-neon-blue ml-2">MIT</span>
                  <p className="text-text-dim text-xs mt-1">
                    JavaScript library for building user interfaces.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                <span className="text-xl">🎨</span>
                <div>
                  <strong className="text-text-main">Tailwind CSS</strong>
                  <span className="text-xs text-neon-blue ml-2">MIT</span>
                  <p className="text-text-dim text-xs mt-1">
                    Utility-first CSS framework for modern styling.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-text-dim text-xs mt-4 text-center">
              See our GitHub repository for complete license information.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
