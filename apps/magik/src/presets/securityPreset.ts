import cors from 'cors';
import helmet from 'helmet';
import type {
  MiddlewareFn,
  MiddlewarePreset,
} from '../types/middleware.js';

/**
 * Security preset provides essential security middleware
 *
 * Includes:
 * - Helmet: Sets various HTTP headers for security
 * - CORS: Cross-Origin Resource Sharing
 *
 * Priority: 90-100 (applied first)
 */
export const securityPreset: MiddlewarePreset = {
  name: 'security',
  middlewares: [
    {
      name: 'helmet',
      category: 'security',
      priority: 100,
      handler: helmet({
        contentSecurityPolicy: false, // Often needs customization
        crossOriginResourcePolicy: false,
        crossOriginEmbedderPolicy: false,
        xPoweredBy: false,
        referrerPolicy: {
          policy: [
            'origin',
            'strict-origin-when-cross-origin',
            'unsafe-url',
            'no-referrer',
          ],
        },
      }),
    },
    {
      name: 'cors',
      category: 'security',
      priority: 90,
      handler: cors() as MiddlewareFn,
    },
  ],
};
