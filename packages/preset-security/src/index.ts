import type { MiddlewarePreset } from '@magik_io/magik';
import cors from 'cors';
import helmet from 'helmet';

export const securityPreset: MiddlewarePreset = {
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
