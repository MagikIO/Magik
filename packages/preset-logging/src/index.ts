import type { IncomingMessage, ServerResponse } from 'node:http';
import type { MiddlewarePreset } from '@magik_io/magik';
import chalk from 'chalk';
import { colorize } from 'consola/utils';
import morgan from 'morgan';

export const loggingPreset: MiddlewarePreset = {
  name: 'logging',
  middlewares: [
    {
      name: 'morgan-logger',
      category: 'logging',
      priority: 95,
      handler: morgan((tokens: morgan.TokenIndexer<any, ServerResponse<IncomingMessage>>, req, res) => {
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
      }),
    },
  ],
};
