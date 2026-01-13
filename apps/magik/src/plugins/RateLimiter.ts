import rateLimit from 'express-rate-limit';
import type { MiddlewareConfig } from '../types/middleware.js';
import type { MagikPlugin } from '../types/plugins.js';

export interface RateLimiterOptions {
  /** Time window in milliseconds (default: 15 minutes) */
  windowMs?: number;
  /** Max requests per window (default: 100) */
  max?: number;
  /** Message to send when rate limited */
  message?: string;
  /** Skip rate limiting for certain requests */
  skip?: (req: Express.Request) => boolean;
}

/**
 * RateLimiterPlugin adds rate limiting to protect against abuse
 *
 * Features:
 * - Limits requests per IP address
 * - Configurable time window and max requests
 * - Returns 429 Too Many Requests when exceeded
 *
 * @example
 * ```typescript
 * import { RateLimiterPlugin } from '@anandamide/magik/plugins';
 *
 * await server.use(new RateLimiterPlugin({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   max: 100, // 100 requests per window
 * }));
 * ```
 */
export class RateLimiterPlugin implements MagikPlugin {
  config = {
    name: 'rate-limiter',
    version: '1.0.0',
  };

  private options: RateLimiterOptions;

  constructor(options: RateLimiterOptions = {}) {
    this.options = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: 'Too many requests, please try again later.',
      ...options,
    };
  }

  registerMiddleware(): MiddlewareConfig[] {
    return [
      {
        name: 'rate-limiter',
        category: 'security',
        priority: 95,
        handler: rateLimit({
          windowMs: this.options.windowMs,
          max: this.options.max,
          message: this.options.message,
          skip: this.options.skip ? ((req) => this.options.skip!(req as any)) : undefined,
          standardHeaders: true,
          legacyHeaders: false,
        }) as any,
      },
    ];
  }
}
