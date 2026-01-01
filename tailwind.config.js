/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-deep': 'var(--bg-deep)',
        'bg-panel': 'var(--bg-panel)',
        'border-glass': 'var(--border-glass)',
        'neon-blue': 'var(--neon-blue)',
        'neon-green': 'var(--neon-green)',
        'neon-purple': 'var(--neon-purple)',
        'text-main': 'var(--text-main)',
        'text-dim': 'var(--text-dim)'
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
