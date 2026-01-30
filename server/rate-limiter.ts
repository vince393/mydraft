import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';

// Helper to normalize IP addresses (handles IPv6-mapped IPv4)
function normalizeIp(ip: string | undefined): string {
  if (!ip) return 'unknown';
  // Convert IPv6-mapped IPv4 addresses to regular IPv4
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
}

// Rate limiter for authentication endpoints (login, register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    console.warn(`Rate limit exceeded for auth: ${normalizeIp(req.ip)}`);
    res.status(429).json({ error: 'Too many authentication attempts. Please try again in 15 minutes.' });
  }
});

// Rate limiter for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 reset attempts per hour
  message: { error: 'Too many password reset attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for 2FA verification
export const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for API endpoints (general)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiter for AI generation endpoints (expensive operations)
// Uses session-based limiting when available for authenticated users
export const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 AI generations per minute
  message: { error: 'Too many AI requests. Please wait before generating more.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Prefer session userId for authenticated requests, otherwise use normalized IP
    return req.session?.userId?.toString() || normalizeIp(req.ip);
  }
});

// Rate limiter for email sending
export const emailSendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 emails per minute
  message: { error: 'Too many emails sent. Please wait before sending more.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.session?.userId?.toString() || normalizeIp(req.ip);
  }
});

// Rate limiter for file uploads/downloads
export const fileLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 file operations per minute
  message: { error: 'Too many file operations. Please wait.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.session?.userId?.toString() || normalizeIp(req.ip);
  }
});
