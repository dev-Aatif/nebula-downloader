const { spawn } = require('child_process')
const ytDlp = spawn('npx', [
  'yt-dlp',
  '--extract-audio',
  '--audio-format',
  'mp3',
  '--embed-thumbnail',
  '--convert-thumbnails',
  'jpg',
  'https://www.youtube.com/watch?v=BaW_jenozKc'
])
ytDlp.stdout.on('data', (d) => process.stdout.write(d))
ytDlp.stderr.on('data', (d) => process.stderr.write(d))
