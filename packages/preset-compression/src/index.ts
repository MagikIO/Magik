import type { MiddlewareFn, MiddlewarePreset } from '@magik_io/magik';
import compression from 'compression';

export const compressionPreset: MiddlewarePreset = {
  name: 'compression',
  middlewares: [
    {
      name: 'compression',
      category: 'compression',
      priority: 95,
      handler: compression({
        threshold: 1024, // Only compress responses larger than 1KB
        level: 6, // Balance between speed and compression ratio
        filter: (req, res) => {
          // Don't compress if client or proxy says no
          // @ts-expect-error
          if (req.headers['x-no-compression']) return false;

          // Use default compression filter
          return compression.filter(req, res);
        },
      }) as MiddlewareFn,
    },
  ],
};
