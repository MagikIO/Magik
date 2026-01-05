import cookieParser from 'cookie-parser';
import express from 'express';
import type { RequestHandler } from 'express';
import methodOverride from 'method-override';
import type { MiddlewarePreset } from '../types/middleware';

/**
 * Parser preset provides request body and cookie parsing
 *
 * Includes:
 * - JSON parser: Parses JSON request bodies (20mb limit)
 * - URL-encoded parser: Parses URL-encoded bodies
 * - Cookie parser: Parses cookies
 * - Method override: Allows HTTP method override via _method
 *
 * Priority: 80-85
 */
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
      handler: cookieParser() as RequestHandler,
    },
    {
      name: 'method-override',
      category: 'parser',
      priority: 82,
      handler: methodOverride('_method') as unknown as RequestHandler,
    },
  ],
};
