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

/**
 * Get a user-friendly validation message for URL input
 * @param text - The text to validate
 * @returns Validation message or null if valid
 */
export function getUrlValidationMessage(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null // Empty is fine, don't show error
  }

  const trimmed = text.trim()

  // Check for http/https prefix
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'URL must start with http:// or https://'
  }

  try {
    new URL(trimmed)
    // Valid URL structure - accept it (yt-dlp supports many sites)
    return null
  } catch {
    return 'Please enter a valid URL. Supported: YouTube, Vimeo, Twitter, TikTok, Instagram, Facebook, and 1000+ more sites.'
  }
}

// Export platform list for UI display
export const SUPPORTED_PLATFORMS = [
  { name: 'YouTube', icon: '📺' },
  { name: 'Vimeo', icon: '🎬' },
  { name: 'Twitter/X', icon: '🐦' },
  { name: 'TikTok', icon: '🎵' },
  { name: 'Instagram', icon: '📷' },
  { name: 'Facebook', icon: '👍' },
  { name: 'Twitch', icon: '🎮' },
  { name: 'Reddit', icon: '🔗' }
]
