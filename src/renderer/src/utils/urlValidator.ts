/**
 * Validates if a URL is from a supported video platform
 */

// List of known video platform domains
const VIDEO_PLATFORMS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'dailymotion.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'instagram.com',
  'facebook.com',
  'fb.watch',
  'twitch.tv',
  'reddit.com',
  'bilibili.com',
  'nicovideo.jp',
  'soundcloud.com',
  'bandcamp.com',
  'mixcloud.com'
]

/**
 * Check if a string is a valid video URL
 * @param text - The text to validate
 * @returns true if the text is a valid video URL
 */
export function isValidVideoUrl(text: string): boolean {
  if (!text || typeof text !== 'string') return false

  const trimmed = text.trim()

  // Must start with http:// or https://
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false
  }

  try {
    const url = new URL(trimmed)
    const hostname = url.hostname.toLowerCase()

    // Check if it's a known video platform
    for (const platform of VIDEO_PLATFORMS) {
      if (hostname === platform || hostname.endsWith('.' + platform)) {
        return true
      }
    }

    // For unknown domains, still accept if it's a valid HTTP(S) URL
    // yt-dlp supports many more sites than we can list
    return true
  } catch {
    return false
  }
}

/**
 * Truncate a URL for display purposes
 * @param url - The URL to truncate
 * @param maxLength - Maximum length (default 50)
 * @returns Truncated URL with ellipsis if needed
 */
export function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength - 3) + '...'
}
