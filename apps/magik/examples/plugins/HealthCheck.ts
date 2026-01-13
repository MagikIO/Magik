/**
 * Example Custom Plugin
 *
 * Demonstrates how to create a custom Magik plugin
 * with middleware, routes, and lifecycle hooks.
 */

import consola from 'consola';
import type { MagikPlugin, IMagikServer, MiddlewareConfig, PluginRouteMap } from '../src/types';

export interface HealthCheckOptions {
  /** Path for health check endpoint (default: /health) */
  path?: string;
  /** Include detailed info (default: false) */
  detailed?: boolean;
}

/**
 * HealthCheckPlugin adds health check endpoints and request tracking
 *
 * Features:
 * - /health endpoint for load balancer checks
 * - /health/details for detailed system info
 * - Request counting middleware
 *
 * @example
 * ```typescript
 * await server.use(new HealthCheckPlugin({
 *   path: '/health',
 *   detailed: true,
 * }));
 * ```
 */
export class HealthCheckPlugin implements MagikPlugin {
  config = {
    name: 'health-check',
    version: '1.0.0',
  };

  private options: Required<HealthCheckOptions>;
  private requestCount = 0;
  private startTime: Date | null = null;

  constructor(options: HealthCheckOptions = {}) {
    this.options = {
      path: '/health',
      detailed: false,
      ...options,
    };
  }

  /**
   * Called when plugin is installed
   */
  onInstall(server: IMagikServer) {
    server.DEBUG &&
      consola.info(`[HealthCheckPlugin] Installing at ${this.options.path}`);
  }

  /**
   * Called after server starts
   */
  afterStart(server: IMagikServer) {
    this.startTime = new Date();
    server.DEBUG &&
      consola.success(`[HealthCheckPlugin] Server started, tracking uptime`);
  }

  /**
   * Register request counting middleware
   */
  registerMiddleware(): MiddlewareConfig[] {
    return [
      {
        name: 'request-counter',
        category: 'custom',
        priority: 30,
        handler: (_req, _res, next) => {
          this.requestCount++;
          next();
        },
      },
    ];
  }

  /**
   * Register health check routes
   */
  registerRoutes(): PluginRouteMap {
    const routes: PluginRouteMap = {
      [this.options.path as `/${string}`]: [
        {
          path: '/',
          method: 'get',
          handler: (_req, res) => {
            res.json({
              status: 'ok',
              timestamp: new Date().toISOString(),
            });
          },
        },
      ],
    };

    // Add detailed endpoint if enabled
    if (this.options.detailed) {
      routes[this.options.path as `/${string}`]!.push({
        path: '/details',
        method: 'get',
        handler: (_req, res) => {
          const uptime = this.startTime
            ? Date.now() - this.startTime.getTime()
            : 0;

          res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: {
              ms: uptime,
              formatted: this.formatUptime(uptime),
            },
            requests: {
              total: this.requestCount,
            },
            memory: {
              heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
              heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
              unit: 'MB',
            },
            node: {
              version: process.version,
              platform: process.platform,
            },
          });
        },
      });
    }

    return routes;
  }

  /**
   * Register custom events
   */
  registerEvents(): Record<string, (...args: unknown[]) => void> {
    return {
      routesLoaded: () => {
        consola.info(`[HealthCheckPlugin] Health routes registered at ${this.options.path}`);
      },
    };
  }

  /**
   * Format uptime in human readable format
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}
