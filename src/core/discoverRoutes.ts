import { resolve } from 'node:path';
import consola from 'consola';
import fg from 'fast-glob';
import { getBasePath } from '../decorators/route';
import type { PathSegment, RouteDefinition } from '../types/routes';

/**
 * Discover routes from the routes directory
 *
 * This function scans for route files using the @Router decorator
 * and extracts all route definitions.
 *
 * @param debug - Enable debug logging
 * @returns Array of [prefix, routes[]] tuples
 *
 * @example
 * ```typescript
 * const routes = await discoverRoutes(true);
 * // [
 * //   ['/users', [{ path: '/', method: 'get', handler: ... }]],
 * //   ['/orders', [{ path: '/', method: 'get', handler: ... }]],
 * // ]
 * ```
 */
export async function discoverRoutes(
  debug = false,
): Promise<Array<[PathSegment, RouteDefinition[]]>> {
  const startTime = Date.now();

  debug && consola.start('[DiscoverRoutes] Starting route discovery...');

  // Look for routes in common locations
  const possiblePaths = [
    resolve(process.cwd(), 'src/routes'),
    resolve(process.cwd(), 'routes'),
    resolve(process.cwd(), 'dist/routes'),
  ];

  let routesDir: string | null = null;
  for (const path of possiblePaths) {
    try {
      const files = await fg('**/*.{js,ts}', { cwd: path, absolute: true });
      if (files.length > 0) {
        routesDir = path;
        break;
      }
    } catch {
      // Directory doesn't exist, try next
    }
  }

  if (!routesDir) {
    debug && consola.warn('[DiscoverRoutes] No routes directory found');
    return [];
  }

  debug && consola.info(`[DiscoverRoutes] Routes directory: ${routesDir}`);

  const routeFiles = await fg('**/*.{js,ts}', {
    cwd: routesDir,
    absolute: true,
    ignore: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', '**/*.d.ts'],
  });

  debug && consola.info(`[DiscoverRoutes] Found ${routeFiles.length} route file(s)`);

  const routes: Array<[PathSegment, RouteDefinition[]]> = [];

  for (const file of routeFiles) {
    try {
      const module = await import(file);

      // Get the router class
      const RouterClass = module.default;
      if (!RouterClass) {
        debug && consola.warn(`[DiscoverRoutes] No default export in ${file}`);
        continue;
      }

      // Check if it's a decorated router class
      const basePath = getBasePath(RouterClass);
      if (!basePath) {
        debug && consola.warn(`[DiscoverRoutes] No @Router decorator found in ${file}`);
        continue;
      }

      // Get decorated methods that return route configs
      const instance = new RouterClass();
      const decoratedMethods = Object.getOwnPropertyNames(RouterClass.prototype)
        .filter((name) => name !== 'constructor' && name !== 'getRoutes')
        .map((name) => {
          try {
            const method = instance[name]();
            return {
              ...method,
              path: method.path ?? '/',
              method: method.method ?? 'get',
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Convert to route definitions
      const routeDefinitions = decoratedMethods
        .filter((result): result is NonNullable<typeof result> => {
          if (!result || typeof result !== 'object') return false;
          if (result.handler && typeof result.handler !== 'function') {
            debug && consola.warn(`[DiscoverRoutes] Invalid handler in ${file}`);
            return false;
          }
          return true;
        })
        .map((result) => ({
          path: result.path ?? '/',
          method: result.method ?? 'get',
          auth: result.auth,
          handler: result.handler,
          schema: result.schema,
          validationSchema: result.schema,
          upload: result.upload,
          middlewares: result.middlewares,
          useNext: result.useNext,
        }));

      if (routeDefinitions.length > 0) {
        routes.push([basePath, routeDefinitions]);
        debug &&
          consola.info(
            `[DiscoverRoutes] ${basePath}: ${routeDefinitions.length} route(s)`,
          );
      }
    } catch (error) {
      consola.error(`[DiscoverRoutes] Error loading ${file}:`, error);
    }
  }

  const elapsed = Date.now() - startTime;
  debug && consola.success(`[DiscoverRoutes] Completed in ${elapsed}ms`);

  return routes;
}
