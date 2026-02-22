import React, { useState } from 'react'
import { HelpIcon, DownloadIcon } from '../components/icons'
import logo from '../assets/logo.png'

export default function Help(): React.JSX.Element {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const faqs = [
    {
      q: 'What platforms does Nebula support?',
      a: 'Over 1000 websites including YouTube, Vimeo, Dailymotion, and more. Powered by yt-dlp.'
    },
    {
      q: 'How do I change download quality?',
      a: 'Click "Advanced Options" when adding a download, or set a default quality in Settings → Preferred Format.'
    },
    {
      q: 'Where are my files saved?',
      a: 'Default: your system Downloads folder. Change it in Settings → Download Directory.'
    },
    {
      q: 'Why is my download failing?',
      a: 'Common causes: invalid/expired URL, network issues, private/region-locked video, or insufficient disk space. Check download details for specifics.'
    },
    {
      q: 'Can I download playlists?',
      a: "Yes! Paste a playlist URL and Nebula detects it automatically. You'll choose which videos to download."
    },
    {
      q: 'How does the queue work?',
      a: 'Up to 3 downloads run simultaneously (configurable). New downloads queue automatically and start when slots free up.'
    }
  ]

  const shortcuts = [
    { action: 'New Download', key: 'Ctrl+N' },
    { action: 'Open Settings', key: 'Ctrl+,' },
    { action: 'View History', key: 'Ctrl+H' }
  ]

  const credits = [
    {
      icon: '📥',
      name: 'yt-dlp',
      license: 'Unlicense',
      desc: 'Download engine powering all media downloads'
    },
    {
      icon: '🎬',
      name: 'FFmpeg',
      license: 'LGPL/GPL',
      desc: 'Audio/video processing and conversion'
    },
    {
      icon: '⚡',
      name: 'Electron',
      license: 'MIT',
      desc: 'Cross-platform desktop app framework'
    },
    {
      icon: '⚛️',
      name: 'React',
      license: 'MIT',
      desc: 'UI component library'
    },
    {
      icon: '🎨',
      name: 'Tailwind CSS',
      license: 'MIT',
      desc: 'Utility-first CSS framework'
    }
  ]

  return (
    <div className="flex flex-col h-full bg-bg-deep relative">
      <style>{`
        .help-scroll::-webkit-scrollbar { width: 6px; }
        .help-scroll::-webkit-scrollbar-track { background: transparent; }
        .help-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .help-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>

      <div className="flex-1 overflow-y-auto help-scroll">
        {/* Hero */}
        <div className="bg-gradient-to-br from-neon-blue/[0.06] to-purple-500/[0.06] border-b border-white/[0.06] px-8 py-10">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={logo}
                alt="Nebula"
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-main">
                Help &amp; Support
              </h1>
              <p className="text-text-dim text-sm mt-0.5">
                Everything you need to get started
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
          {/* Quick Start */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim flex items-center gap-2">
                <DownloadIcon className="w-3.5 h-3.5 text-neon-blue" />
                Quick Start
              </h3>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {[
                {
                  step: '1',
                  title: 'Add a Download',
                  desc: 'Click Add in the toolbar or press Ctrl+N, then paste a video URL'
                },
                {
                  step: '2',
                  title: 'Choose Quality',
                  desc: 'Select format and quality, or use your default from Settings'
                },
                {
                  step: '3',
                  title: 'Manage Downloads',
                  desc: 'Pause, resume, or cancel. Multi-select with checkboxes for bulk actions'
                }
              ].map((s) => (
                <div
                  key={s.step}
                  className="px-5 py-4 flex items-start gap-4"
                >
                  <div className="w-7 h-7 rounded-lg bg-neon-blue/10 flex items-center justify-center text-xs font-bold text-neon-blue shrink-0 mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-main">
                      {s.title}
                    </div>
                    <div className="text-xs text-text-dim mt-0.5">
                      {s.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim flex items-center gap-2">
                <HelpIcon className="w-3.5 h-3.5 text-neon-blue" />
                FAQ
              </h3>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {faqs.map((faq, i) => (
                <button
                  key={i}
                  className="w-full text-left px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  onClick={() =>
                    setOpenFaq(openFaq === i ? null : i)
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-main">
                      {faq.q}
                    </span>
                    <span
                      className={`text-text-dim text-xs transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                    >
                      ▾
                    </span>
                  </div>
                  {openFaq === i && (
                    <p className="text-xs text-text-dim mt-2 leading-relaxed pr-6">
                      {faq.a}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Manual Install Guide */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim flex items-center gap-2">
                🔧 Manual Dependency Installation
              </h3>
            </div>
            <div className="px-5 py-4 space-y-5">
              <p className="text-xs text-text-dim leading-relaxed">
                If automatic download fails due to network restrictions, you can download and
                install yt-dlp and FFmpeg manually. After placing the files, click{' '}
                <strong className="text-text-main">Refresh</strong> in Settings → Dependencies.
              </p>

              {/* yt-dlp */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">📥</span>
                  <span className="text-sm font-medium text-text-main">yt-dlp</span>
                </div>
                <ol className="text-xs text-text-dim space-y-2 list-decimal list-inside">
                  <li>
                    Download from{' '}
                    <a
                      href="https://github.com/yt-dlp/yt-dlp/releases/latest"
                      target="_blank"
                      rel="noreferrer"
                      className="text-neon-blue hover:underline"
                    >
                      github.com/yt-dlp/yt-dlp/releases
                    </a>
                  </li>
                  <li>
                    Choose <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px]">yt-dlp</code> (Linux) or{' '}
                    <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px]">yt-dlp.exe</code> (Windows)
                  </li>
                  <li>
                    Place it in:{' '}
                    <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px] break-all">
                      ~/.config/nebula-downloader/bin/
                    </code>
                  </li>
                  <li>
                    Linux only: make executable — <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px]">chmod +x yt-dlp</code>
                  </li>
                </ol>
              </div>

              {/* FFmpeg */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🎬</span>
                  <span className="text-sm font-medium text-text-main">FFmpeg</span>
                </div>
                <ol className="text-xs text-text-dim space-y-2 list-decimal list-inside">
                  <li>
                    Download a static build from{' '}
                    <a
                      href="https://github.com/BtbN/FFmpeg-Builds/releases"
                      target="_blank"
                      rel="noreferrer"
                      className="text-neon-blue hover:underline"
                    >
                      BtbN/FFmpeg-Builds
                    </a>{' '}
                    or{' '}
                    <a
                      href="https://johnvansickle.com/ffmpeg/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-neon-blue hover:underline"
                    >
                      johnvansickle.com/ffmpeg
                    </a>
                  </li>
                  <li>Extract the archive and locate the <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px]">ffmpeg</code> binary inside the <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px]">bin/</code> folder</li>
                  <li>
                    Place it in:{' '}
                    <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px] break-all">
                      ~/.config/nebula-downloader/bin/
                    </code>
                  </li>
                  <li>
                    Linux only: make executable — <code className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px]">chmod +x ffmpeg</code>
                  </li>
                </ol>
              </div>

              <div className="rounded-lg bg-neon-blue/[0.04] border border-neon-blue/10 p-3">
                <p className="text-[11px] text-text-dim leading-relaxed">
                  💡 <strong className="text-text-main">Tip:</strong> After placing the files, go to Settings → Dependencies and click{' '}
                  <strong className="text-neon-blue">Refresh</strong> to let the app detect them. You can also try using a VPN or proxy if the automatic download keeps failing.
                </p>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                Keyboard Shortcuts
              </h3>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {shortcuts.map((s) => (
                <div
                  key={s.key}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <span className="text-sm text-text-main">
                    {s.action}
                  </span>
                  <kbd className="px-2.5 py-1 bg-white/[0.06] border border-white/[0.08] rounded-md text-xs text-text-dim font-mono">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                Support
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neon-blue/10 flex items-center justify-center text-sm">
                  🐛
                </div>
                <div>
                  <span className="text-sm text-text-main">
                    Report Issues
                  </span>
                  <a
                    href="https://github.com/dev-Aatif/nebula-downloader/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neon-blue hover:text-neon-purple transition-colors ml-2"
                  >
                    GitHub Issues ↗
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-sm">
                  👨‍💻
                </div>
                <div>
                  <span className="text-sm text-text-main">
                    Developer
                  </span>
                  <a
                    href="https://github.com/dev-Aatif"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-neon-blue hover:text-neon-purple transition-colors ml-2"
                  >
                    @dev-Aatif ↗
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Credits */}
          <section className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.06]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
                Open Source Credits
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {credits.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                >
                  <span className="text-lg">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-main">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-neon-blue bg-neon-blue/10 px-1.5 py-0.5 rounded">
                        {c.license}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-dim">
                      {c.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <div className="text-center py-4">
            <div className="text-xs text-text-dim/40 font-mono">
              Nebula Downloader v1.1.0
            </div>
            <p className="text-[11px] text-text-dim/30 mt-1">
              yt-dlp and FFmpeg are downloaded on first run
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
