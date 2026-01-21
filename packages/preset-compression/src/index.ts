import type { MiddlewareFn, MiddlewarePreset } from '@magik_io/magik-types';
import compression from 'compression';

export type CompressionOptions = Parameters<typeof compression>[0] & { priority?: number };

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  priority: 95,
  threshold: 1024, // Only compress responses larger than 1KB
  level: 6, // Balance between speed and compression ratio
  filter: (req, res) => {
            // Don't compress if client or proxy says no
            // @ts-expect-error
            if (req.headers['x-no-compression']) return false;

            // Use default compression filter
            return compression.filter(req, res);
          },
};

export function compressionPreset(options: CompressionOptions = {}): MiddlewarePreset {
  const finalOptions: CompressionOptions = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };

  return {
    name: 'compression',
    middlewares: [
      {
        name: 'compression',
        category: 'compression',
        priority: finalOptions.priority!,
        handler: compression({
          threshold: finalOptions.threshold,
          level: finalOptions.level,
          filter: finalOptions.filter,
        }) as MiddlewareFn,
      },
    ],
  };
}

export const DefaultCompressionPreset: MiddlewarePreset = {
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
