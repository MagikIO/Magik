import type { MiddlewareFn, MiddlewarePreset } from '@magik_io/magik-types';
import cookieParser from 'cookie-parser';
import express from 'express';
import methodOverride from 'method-override';

export const parserPreset: MiddlewarePreset = {
  name: 'parser',
  middlewares: [
    {
      name: 'json-parser',
      category: 'parser',
      priority: 85,
      handler: express.json({ limit: '20mb' }),
    },
    {
      name: 'urlencoded-parser',
      category: 'parser',
      priority: 84,
      handler: express.urlencoded({
        extended: false,
        parameterLimit: 50000,
        limit: '20mb',
      }),
    },
    {
      name: 'cookie-parser',
      category: 'parser',
      priority: 83,
      handler: cookieParser() as MiddlewareFn,
    },
    {
      name: 'method-override',
      category: 'parser',
      priority: 82,
      handler: methodOverride('_method') as MiddlewareFn,
    },
  ],
};
