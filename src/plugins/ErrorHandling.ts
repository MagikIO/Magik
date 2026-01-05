import consola from 'consola';
import type { ErrorRequestHandler } from 'express';
import type { MagikPlugin } from '../types/plugins';
import type { IMagikServer } from '../types/server';

/**
 * ErrorHandlingPlugin provides global error handling for the server
 *
 * Features:
 * - Catches unhandled errors in routes
 * - Returns appropriate error responses
 * - Logs errors to console
 * - Different behavior in development vs production
 *
 * @example
 * ```typescript
 * import { ErrorHandlingPlugin } from '@anandamide/magik/plugins';
 *
 * await server.use(new ErrorHandlingPlugin());
 * ```
 */
export class ErrorHandlingPlugin implements MagikPlugin {
  config = {
    name: 'error-handling',
    version: '1.0.0',
  };

  onInstall(server: IMagikServer) {
    const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
      // Log the error
      consola.error('[ErrorHandling] Request error:', {
        method: req.method,
        path: req.path,
        error: err.message,
        stack: server.DevMode ? err.stack : undefined,
      });

      // Determine status code
      const statusCode = err.statusCode || err.status || 500;

      // Send error response
      if (req.accepts('json')) {
        res.status(statusCode).json({
          error: server.DevMode ? err.message : 'Internal Server Error',
          ...(server.DevMode && { stack: err.stack }),
        });
      } else {
        res.status(statusCode).send(
          server.DevMode
            ? `<pre>${err.stack}</pre>`
            : 'Internal Server Error',
        );
      }
    };

    // Register as last middleware
    server.app.use(errorHandler);

    server.DEBUG &&
      consola.success('[ErrorHandlingPlugin] Global error handler installed');
  }
}
