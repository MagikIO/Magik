import type { MiddlewareFn, MiddlewarePreset } from '@magik_io/magik-types';
import cookieParser from 'cookie-parser';
import express from 'express';
import methodOverride from 'method-override';

export interface ParserOptions {
  priority?: {
    json?: number;
    urlencoded?: number;
    cookie?: number;
    methodOverride?: number;
  };
  json?: {
    enabled?: boolean;
    limit?: string | number;
    strict?: boolean;
    type?: string | string[] | ((req: any) => boolean);
    verify?: (req: any, res: any, buf: Buffer, encoding: string) => void;
  };
  urlencoded?: {
    enabled?: boolean;
    extended?: boolean;
    limit?: string | number;
    parameterLimit?: number;
    type?: string | string[] | ((req: any) => boolean);
  };
  cookie?: {
    enabled?: boolean;
    secret?: string | string[];
    options?: cookieParser.CookieParseOptions;
  };
  methodOverride?: {
    enabled?: boolean;
    getter?: string | ((req: any, res: any) => string);
    methods?: string[];
  };
}

const DEFAULT_PARSER_OPTIONS = {
  priority: {
    json: 85,
    urlencoded: 84,
    cookie: 83,
    methodOverride: 82,
  },
  json: {
    enabled: true,
    limit: '20mb',
    strict: true,
  },
  urlencoded: {
    enabled: true,
    extended: false,
    parameterLimit: 50000,
    limit: '20mb',
  },
  cookie: {
    enabled: true,
  },
  methodOverride: {
    enabled: true,
    getter: '_method',
  },
};

export function parserPreset(options: ParserOptions = {}): MiddlewarePreset {
  const finalOptions = {
    priority: { ...DEFAULT_PARSER_OPTIONS.priority, ...options.priority },
    json: { ...DEFAULT_PARSER_OPTIONS.json, ...options.json },
    urlencoded: { ...DEFAULT_PARSER_OPTIONS.urlencoded, ...options.urlencoded },
    cookie: { ...DEFAULT_PARSER_OPTIONS.cookie, ...options.cookie },
    methodOverride: { ...DEFAULT_PARSER_OPTIONS.methodOverride, ...options.methodOverride },
  };

  const middlewares: MiddlewarePreset['middlewares'] = [];

  // JSON Parser
  if (finalOptions.json.enabled) {
    middlewares.push({
      name: 'json-parser',
      category: 'parser',
      priority: finalOptions.priority.json!,
      handler: express.json({
        limit: finalOptions.json.limit,
        strict: finalOptions.json.strict,
        type: finalOptions.json.type,
        verify: finalOptions.json.verify,
      }),
    });
  }

  // URL-encoded Parser
  if (finalOptions.urlencoded.enabled) {
    middlewares.push({
      name: 'urlencoded-parser',
      category: 'parser',
      priority: finalOptions.priority.urlencoded!,
      handler: express.urlencoded({
        extended: finalOptions.urlencoded.extended,
        parameterLimit: finalOptions.urlencoded.parameterLimit,
        limit: finalOptions.urlencoded.limit,
        type: finalOptions.urlencoded.type,
      }),
    });
  }

  // Cookie Parser
  if (finalOptions.cookie.enabled) {
    middlewares.push({
      name: 'cookie-parser',
      category: 'parser',
      priority: finalOptions.priority.cookie!,
      handler: cookieParser(finalOptions.cookie.secret, finalOptions.cookie.options) as MiddlewareFn,
    });
  }

  // Method Override
  if (finalOptions.methodOverride.enabled) {
    const getter = finalOptions.methodOverride.getter || '_method';
    const methods = finalOptions.methodOverride.methods;

    middlewares.push({
      name: 'method-override',
      category: 'parser',
      priority: finalOptions.priority.methodOverride!,
      handler: (methods 
        ? methodOverride(getter, { methods })
        : methodOverride(getter)
      ) as MiddlewareFn,
    });
  }

  return {
    name: 'parser',
    middlewares,
  };
}

export const DefaultParserPreset: MiddlewarePreset = {
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
