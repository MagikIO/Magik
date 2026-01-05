import consola from 'consola';
import type { MagikPlugin } from '../types/plugins';
import type { IMagikServer } from '../types/server';

/**
 * DebugPlugin enables debug logging and request inspection
 *
 * Features:
 * - Logs all incoming requests in debug mode
 * - Shows response times
 * - Displays route matching information
 *
 * @example
 * ```typescript
 * import { DebugPlugin } from '@magikio/magik/plugins';
 *
 * await server.use(new DebugPlugin());
 * ```
 */
export class DebugPlugin implements MagikPlugin {
  config = {
    name: 'debug',
    version: '1.0.0',
  };

  onInstall(server: IMagikServer) {
    if (!server.DEBUG) {
      return; // Only active in debug mode
    }

    // Add request logging middleware
    server.app.use((req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusColor = status >= 400 ? 'red' : status >= 300 ? 'yellow' : 'green';

        consola.info(
          `[Debug] ${req.method} ${req.path} -> ${status} (${duration}ms)`,
        );
      });

      next();
    });

    consola.success('[DebugPlugin] Request logging enabled');
  }

  afterStart(server: IMagikServer) {
    if (!server.DEBUG) return;

    const { total, byPrefix } = server.routerManager.getRouteCount();
    const methods = server.routerManager.getRouteCountByMethod();

    consola.box({
      title: '🪄 Magik Server Debug Info',
      message: [
        `Server: ${server.name}`,
        `Port: ${server.port}`,
        `Mode: ${server.DevMode ? 'development' : 'production'}`,
        `Total Routes: ${total}`,
        '',
        'Routes by Prefix:',
        ...Object.entries(byPrefix).map(([prefix, count]) => `  ${prefix}: ${count}`),
        '',
        'Routes by Method:',
        ...Object.entries(methods).map(([method, count]) => `  ${method.toUpperCase()}: ${count}`),
      ].join('\n'),
    });
  }

    registerEvents() {
    return {
      beforeStart: () => consola.info('[DebugPlugin] Server is about to start'),
      afterStart: () => consola.info('[DebugPlugin] Server has started'),
      beforeStop: () => consola.info('[DebugPlugin] Server is about to stop'),
      // serverListening: (address) =>
      //   consola.info(
      //     `[DebugPlugin] Server is listening on ${JSON.stringify(address)}`,
      //   ),
      serverPortError: (port) =>
        consola.error(`[DebugPlugin] Port ${port} error`),
      serverPortInUse: (port) =>
        consola.error(`[DebugPlugin] Port ${port} in use`),
    };
  }
}
