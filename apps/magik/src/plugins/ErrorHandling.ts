import consola from 'consola';
import type {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from 'express-serve-static-core';
import type { MagikPlugin } from '../types/plugins.js';
import type { IMagikServer } from '../types/server.js';

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
    const errorHandler: ErrorRequestHandler = (
      err: unknown,
      req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      // Log the error
      const error = err as Error & { statusCode?: number; status?: number };
      consola.error('[ErrorHandling] Request error:', {
        method: req.method,
        path: req.path,
        error: error.message,
        stack: server.DevMode ? error.stack : undefined,
      });

      // Determine status code
      const statusCode = error.statusCode || error.status || 500;

      // Send error response
      if (req.accepts('json')) {
        res.status(statusCode).json({
          error: server.DevMode ? error.message : 'Internal Server Error',
          ...(server.DevMode && { stack: error.stack }),
        });
      } else {
        res
          .status(statusCode)
          .send(
            server.DevMode
              ? `<pre>${error.stack}</pre>`
              : 'Internal Server Error',
          );
      }
    };

    // Register as last middleware (cast needed for Express's overload resolution)
    server.app.use(errorHandler as any);

    server.DEBUG &&
      consola.success('[ErrorHandlingPlugin] Global error handler installed');
  }
}
