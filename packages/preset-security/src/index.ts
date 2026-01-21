import type { MiddlewarePreset } from '@magik_io/magik-types';
import cors from 'cors';
import helmet from 'helmet';

export interface SecurityOptions {
  priority?: {
    helmet?: number;
    cors?: number;
  };
  helmet?: {
    enabled?: boolean;
    options?: Parameters<typeof helmet>[0];
  };
  cors?: {
    enabled?: boolean;
    options?: cors.CorsOptions;
  };
}

const DEFAULT_SECURITY_OPTIONS = {
  priority: {
    helmet: 100,
    cors: 90,
  },
  helmet: {
    enabled: true,
    options: {
      contentSecurityPolicy: false,
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
    } as Parameters<typeof helmet>[0],
  },
  cors: {
    enabled: true,
    options: {} as cors.CorsOptions,
  },
};

export function securityPreset(options: SecurityOptions = {}): MiddlewarePreset {
  const finalOptions = {
    priority: { ...DEFAULT_SECURITY_OPTIONS.priority, ...options.priority },
    helmet: { ...DEFAULT_SECURITY_OPTIONS.helmet, ...options.helmet },
    cors: { ...DEFAULT_SECURITY_OPTIONS.cors, ...options.cors },
  };

  const middlewares: MiddlewarePreset['middlewares'] = [];

  // Helmet
  if (finalOptions.helmet.enabled) {
    const helmetOptions = options.helmet?.options !== undefined
      ? options.helmet.options
      : finalOptions.helmet.options;

    middlewares.push({
      name: 'helmet',
      category: 'security',
      priority: finalOptions.priority.helmet!,
      handler: helmet(helmetOptions),
    });
  }

  // CORS
  if (finalOptions.cors.enabled) {
    const corsOptions = options.cors?.options !== undefined
      ? options.cors.options
      : finalOptions.cors.options;

    middlewares.push({
      name: 'cors',
      category: 'security',
      priority: finalOptions.priority.cors!,
      handler: cors(corsOptions),
    });
  }

  return {
    name: 'security',
    middlewares,
  };
}

export const DefaultSecurityPreset: MiddlewarePreset = {
  name: 'security',
  middlewares: [
    {
      name: 'helmet',
      category: 'security',
      priority: 100,
      handler: helmet({
        contentSecurityPolicy: false,
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
      handler: cors(),
    },
  ],
};
