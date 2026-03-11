// Simple in-memory rate limiter for serverless functions
// Resets when the function cold-starts, but still prevents burst abuse

const windows = new Map()

// Default: 20 requests per 60 seconds per user
export function rateLimit(userId, { maxRequests = 20, windowMs = 60000 } = {}) {
  const now = Date.now()
  const key = userId

  if (!windows.has(key)) {
    windows.set(key, { count: 1, start: now })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  const window = windows.get(key)

  if (now - window.start > windowMs) {
    // Window expired, reset
    windows.set(key, { count: 1, start: now })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  window.count++
  if (window.count > maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((window.start + windowMs - now) / 1000) }
  }

  return { allowed: true, remaining: maxRequests - window.count }
}

// Cleanup old entries periodically (prevent memory leak over time)
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of windows) {
    if (now - val.start > 120000) windows.delete(key)
  }
}, 60000)
