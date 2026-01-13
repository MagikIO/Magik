import consola from 'consola';
import type { MagikPlugin } from '../types/plugins.js';
import type { IMagikServer } from '../types/server.js';

export class GracefulShutdownPlugin implements MagikPlugin {
  config = {
    name: 'graceful-shutdown',
    version: '1.0.0',
  };

  private shuttingDown = false;
  private shutdownTimeout = 10000; // configurable!

  onInstall(server: IMagikServer) {
    // Signal handlers
    process.on('SIGTERM', () => this.initiateShutdown('SIGTERM', server));
    process.on('SIGINT', () => this.initiateShutdown('SIGINT', server));

    // Global error handlers (separate concern but valuable)
    process.on('uncaughtException', (error) => {
      consola.error('[UncaughtException]', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      consola.error('[UnhandledRejection]', { reason, promise });
    });

    server.DEBUG && consola.success('[GracefulShutdownPlugin] Installed');
  }

  private async initiateShutdown(signal: string, server: IMagikServer) {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    consola.info(`\n[GracefulShutdown] Received ${signal}`);

    // Set timeout for forced shutdown
    const forceShutdownTimer = setTimeout(() => {
      consola.warn('[GracefulShutdown] Forcing shutdown after timeout');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Delegate to server's shutdown method (centralized)
      if (server.status === 'ONLINE') {
        await server.shutdownServer();
      }

      clearTimeout(forceShutdownTimer);
      consola.success('[GracefulShutdown] Clean shutdown complete');
    } catch (error) {
      clearTimeout(forceShutdownTimer);
      consola.error('[GracefulShutdown] Shutdown error:', error);
      process.exit(1);
    }
  }
}
