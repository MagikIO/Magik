import type { MiddlewareFn, MiddlewarePreset } from '@magik_io/magik-types';
import express from 'express';

export interface StaticOptions {
  priority?: number;
  options?: {
    dotfiles?: 'allow' | 'deny' | 'ignore';
    etag?: boolean;
    extensions?: string[] | false;
    fallthrough?: boolean;
    immutable?: boolean;
    index?: boolean | string | string[];
    lastModified?: boolean;
    maxAge?: number | string;
    redirect?: boolean;
    setHeaders?: (res: any, path: string, stat: any) => void;
  };
}

export interface MultiStaticOptions {
  directories: Array<{
    path: string;
    options?: StaticOptions['options'];
  }>;
  priority?: number;
}

const DEFAULT_STATIC_OPTIONS: Required<Pick<StaticOptions, 'priority'>> & {
  options: StaticOptions['options'];
} = {
  priority: 60,
  options: {
    maxAge: '3 days',
    etag: true,
    lastModified: true,
    dotfiles: 'ignore',
  },
};

export function staticPreset(
  path: string,
  options: StaticOptions = {}
): MiddlewarePreset {
  const finalOptions = {
    priority: options.priority ?? DEFAULT_STATIC_OPTIONS.priority,
    options: { ...DEFAULT_STATIC_OPTIONS.options, ...options.options },
  };

  return {
    name: 'static',
    middlewares: [
      {
        name: 'static-files',
        category: 'static',
        priority: finalOptions.priority,
        handler: express.static(path, finalOptions.options) as MiddlewareFn,
      },
    ],
  };
}

export function multiStaticPreset(
  options: MultiStaticOptions
): MiddlewarePreset {
  const basePriority = options.priority ?? DEFAULT_STATIC_OPTIONS.priority;

  return {
    name: 'static',
    middlewares: options.directories.map((dir, index) => ({
      name: `static-files-${index}`,
      category: 'static',
      priority: basePriority - index,
      handler: express.static(dir.path, {
        ...DEFAULT_STATIC_OPTIONS.options,
        ...dir.options,
      }) as MiddlewareFn,
    })),
  };
}
