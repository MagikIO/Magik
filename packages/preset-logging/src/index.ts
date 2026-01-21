import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MiddlewareFn, MiddlewarePreset } from '@magik_io/magik-types';
import chalk from 'chalk';
import { colorize } from 'consola/utils';
import morgan from 'morgan';

export type ColorScheme = 'default' | 'minimal' | 'monochrome';
export type MorganFormat = 'combined' | 'common' | 'dev' | 'short' | 'tiny' | 'colorized';

export interface LoggingOptions extends morgan.Options<any, ServerResponse<IncomingMessage>> {
  priority?: number;
  format?: MorganFormat | morgan.FormatFn<any, ServerResponse<IncomingMessage>>;
  colorScheme?: ColorScheme;
  enableColors?: boolean;
}

const DEFAULT_LOGGING_OPTIONS: LoggingOptions = {
  priority: 95,
  format: 'colorized',
  colorScheme: 'default',
  enableColors: true,
};

/**
 * Creates a colorized morgan format function
 */
function createColorizedFormat(colorScheme: ColorScheme = 'default'): morgan.FormatFn<any, ServerResponse<IncomingMessage>> {
  return (tokens: morgan.TokenIndexer<any, ServerResponse<IncomingMessage>>, req, res) => {
    if (colorScheme === 'monochrome') {
      return [
        `[${req.method}]`,
        `(${tokens['status']?.(req, res) ?? '-'})->`,
        `${tokens['url']?.(req, res) ?? '-'}`,
        `|`,
        `${(tokens['response-time']?.(req, res) ?? '0')}ms`,
      ].join(' ');
    }

    if (colorScheme === 'minimal') {
      const statusCode = tokens['status']?.(req, res) ?? '-';
      const statusColor = Number(statusCode) >= 400 ? 'red' : Number(statusCode) >= 300 ? 'yellow' : 'green';
      
      return [
        chalk.blue(req.method ?? '-'),
        chalk[statusColor](statusCode),
        chalk.cyan(tokens['url']?.(req, res) ?? '-'),
        chalk.gray(`${(tokens['response-time']?.(req, res) ?? '0')}ms`),
      ].join(' ');
    }

    // Default colorful scheme
    const blueOnPurple = chalk.bgHex('#cdb4db').hex('#252422').bold;
    const pinkOnCyan = chalk.bgHex('#c0fdff').hex('#252422').bold;
    const yellowOnGray = chalk.bgHex('#edede9').hex('#e9ff70').bold;
    const redOnGray = chalk.bgHex('#edede9').hex('#ff0000').bold;
    const orangeOnBlack = chalk.bgHex('#ff7f50').hex('#000000').bold;
    const yellowOnRed = chalk.bgHex('#ff595e').hex('#252422').bold;

    const method = (() => {
      switch (req.method) {
        case 'GET':
          return blueOnPurple(` ${req.method}  `);
        case 'POST':
          return pinkOnCyan(` ${req.method} `);
        case 'PUT':
          return yellowOnGray(` ${req.method}  `);
        case 'DELETE':
          return redOnGray(` ${req.method} `);
        case 'PATCH':
          return orangeOnBlack(` ${req.method} `);
        default:
          return yellowOnRed(` ${req.method} `);
      }
    })();

    return [
      method,
      `(${chalk.hex('#ffcc5c')(tokens['status']?.(req, res) ?? '-')})->`,
      `${chalk.hex('#b5e48c')(tokens['url']?.(req, res) ?? '-')}`,
      colorize('cyan', `|`),
      colorize('yellowBright', (tokens['response-time']?.(req, res) ?? '0') + 'ms'),
    ].join(' ');
  };
}

export function loggingPreset(options: LoggingOptions = {}): MiddlewarePreset {
  const finalOptions: LoggingOptions = { ...DEFAULT_LOGGING_OPTIONS, ...options };

  // Extract morgan-specific options
  const morganOptions: morgan.Options<any, ServerResponse<IncomingMessage>> = {
    immediate: finalOptions.immediate,
    skip: finalOptions.skip,
    stream: finalOptions.stream,
  };

  // Determine morgan handler based on format
  let morganHandler: MiddlewareFn;
  
  if (typeof finalOptions.format === 'function') {
    morganHandler = morgan(finalOptions.format, morganOptions) as MiddlewareFn;
  } else if (finalOptions.format === 'colorized') {
    const colorizedFormat = finalOptions.enableColors 
      ? createColorizedFormat(finalOptions.colorScheme)
      : createColorizedFormat('monochrome');
    morganHandler = morgan(colorizedFormat, morganOptions) as MiddlewareFn;
  } else {
    // Use morgan's built-in format strings
    morganHandler = morgan(finalOptions.format as string, morganOptions) as MiddlewareFn;
  }

  return {
    name: 'logging',
    middlewares: [
      {
        name: 'morgan-logger',
        category: 'logging',
        priority: finalOptions.priority!,
        handler: morganHandler,
      },
    ],
  };
}

export const DefaultLoggingPreset: MiddlewarePreset = {
  name: 'logging',
  middlewares: [
    {
      name: 'morgan-logger',
      category: 'logging',
      priority: 95,
      handler: morgan(createColorizedFormat('default')) as MiddlewareFn,
    },
  ],
};
