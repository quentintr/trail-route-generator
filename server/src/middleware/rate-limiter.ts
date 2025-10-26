import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

/**
 * Rate limiter configuration
 */
const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too Many Requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString(),
        path: req.path
      })
    }
  })
}

/**
 * Route generation rate limiter
 * 5 requests per minute per IP
 */
export const routeGenerationLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  5, // 5 requests
  'Too many route generation requests. Please try again later.'
)

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests from this IP. Please try again later.'
)

/**
 * Authentication rate limiter
 * 5 login attempts per 15 minutes per IP
 */
export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again later.'
)

/**
 * Route saving rate limiter
 * 20 saves per hour per IP
 */
export const routeSaveLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  20, // 20 saves
  'Too many route save requests. Please try again later.'
)
