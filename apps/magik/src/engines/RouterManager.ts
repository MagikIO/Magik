import consola from 'consola';
import type { HTTPMethod, PathSegment } from '../types/routes.js';
import type { IMagikServer } from '../types/server.js';
import { RouteEngine } from './RouteEngine.js';

/**
 * RouterManager manages route registration across multiple prefixes
 *
 * It maintains a registry of RouteEngine instances, one per prefix.
 * When routes are discovered or registered, RouterManager coordinates
 * which RouteEngine handles each route based on its prefix.
 *
 * @example
 * ```typescript
 * const routerManager = new RouterManager(server);
 *
 * // Get or create engine for /users prefix
 * const userEngine = routerManager.register('/users');
 * userEngine.route({ path: '/', method: 'get', handler: ... });
 *
 * // Get or create engine for /orders prefix
 * const orderEngine = routerManager.register('/orders');
 * orderEngine.route({ path: '/', method: 'get', handler: ... });
 *
 * // Install all routes to Express app
 * routerManager.installRoutes();
 *
 * // Get stats
 * const { total, byPrefix } = routerManager.getRouteCount();
 * console.log(`Total routes: ${total}`);
 * ```
 */
export class RouterManager {
  public routes = new Map<PathSegment, RouteEngine>();

  constructor(private server: IMagikServer) {}

  /**
   * Register a new prefix and get its RouteEngine
   *
   * If a RouteEngine already exists for the prefix, returns the existing one.
   *
   * @param prefix - The route prefix (e.g., '/users')
   * @returns The RouteEngine for this prefix
   */
  public register(prefix: PathSegment): RouteEngine {
    const existing = this.routes.get(prefix);
    if (existing) {
      this.server.DEBUG &&
        consola.info(`[RouterManager] Reusing existing engine for ${prefix}`);
      return existing;
    }

    const engine = new RouteEngine(this.server, prefix, this.server.DEBUG);
    this.routes.set(prefix, engine);

    this.server.DEBUG &&
      consola.info(`[RouterManager] Created new engine for ${prefix}`);

    return engine;
  }

  /**
   * Get an existing RouteEngine by prefix
   *
   * @param prefix - The route prefix
   * @returns The RouteEngine or undefined if not found
   */
  public getRoute(prefix: PathSegment): RouteEngine | undefined {
    return this.routes.get(prefix);
  }

  /**
   * Get the total route count and count by prefix
   *
   * @returns Object with total count and breakdown by prefix
   */
  public getRouteCount(): { total: number; byPrefix: Record<string, number> } {
    const counts = {
      total: 0,
      byPrefix: {} as Record<string, number>,
    };

    for (const [prefix, engine] of this.routes) {
      const count = engine.getRouteCount();
      counts.byPrefix[prefix] = count;
      counts.total += count;
    }

    return counts;
  }

  /**
   * Get route count grouped by HTTP method
   *
   * @returns Object with count per HTTP method
   */
  public getRouteCountByMethod(): Record<HTTPMethod, number> {
    const counts: Record<string, number> = {
      get: 0,
      post: 0,
      put: 0,
      delete: 0,
      patch: 0,
    };

    for (const [, engine] of this.routes) {
      const methodCounts = engine.getRouteCountByMethod();
      for (const [method, count] of Object.entries(methodCounts)) {
        counts[method] = (counts[method] ?? 0) + count;
      }
    }

    return counts as Record<HTTPMethod, number>;
  }

  /**
   * Install all registered routes to the Express app
   *
   * This should be called after all routes are registered.
   */
  public installRoutes() {
    for (const [prefix, engine] of this.routes) {
      const router = engine.getRouter();
      this.server.app.use(prefix, router);

      this.server.DEBUG &&
        consola.info(
          `[RouterManager] Installed ${engine.getRouteCount()} route(s) at ${prefix}`,
        );
    }

    if (this.server.DEBUG) {
      const { total, byPrefix } = this.getRouteCount();
      consola.success(`[RouterManager] Total routes installed: ${total}`);

      Object.entries(byPrefix).forEach(([prefix, count]) => {
        consola.info(`  ${prefix}: ${count} route(s)`);
      });
    }
  }
}
