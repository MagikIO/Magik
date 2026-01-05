import { resolve, relative } from 'node:path';
import { existsSync } from 'node:fs';
import consola from 'consola';
import fg from 'fast-glob';
import { getBasePath } from '../decorators/route';
import type { PathSegment, RouteDefinition,RouteDiscoveryConfig } from '../types/routes';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of route discovery with metadata.
 */
export interface RouteDiscoveryResult {
  /** Array of [prefix, routes[]] tuples */
  routes: Array<[PathSegment, RouteDefinition[]]>;
  /** Total number of routes discovered */
  totalRoutes: number;
  /** Number of route files processed */
  filesProcessed: number;
  /** Files that failed to load */
  failedFiles: Array<{ file: string; error: string }>;
  /** Time taken in milliseconds */
  duration: number;
  /** The routes directory that was used */
  routesDir: string | null;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<Omit<RouteDiscoveryConfig, 'routesDir' | 'pattern'>> = {
  debug: false,
  extensions: ['js', 'ts', 'mjs', 'cjs'],
  ignore: [
    '**/*.test.ts',
    '**/*.test.js',
    '**/*.spec.ts',
    '**/*.spec.js',
    '**/*.d.ts',
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/node_modules/**',
  ],
  basePath: process.cwd(),
  throwOnError: false,
};

/**
 * Common locations to search for routes when no explicit path is given.
 */
const COMMON_ROUTE_PATHS = [
  'src/routes',
  'routes',
  'dist/routes',
  'build/routes',
  'lib/routes',
];

// ============================================================================
// Main Function
// ============================================================================

/**
 * Discover routes from the routes directory.
 *
 * Scans for route files using the @Router decorator and extracts all route definitions.
 * Supports both TypeScript and JavaScript files, with configurable patterns.
 *
 * @param config - Discovery configuration (or just debug boolean for backwards compatibility)
 * @returns Promise resolving to discovered routes
 *
 * @example
 * ```typescript
 * // Simple usage
 * const routes = await discoverRoutes({ debug: true });
 *
 * // With custom routes directory
 * const routes = await discoverRoutes({
 *   routesDir: './src/api/routes',
 *   debug: true,
 * });
 *
 * // With full result metadata
 * const result = await discoverRoutesWithMetadata({
 *   routesDir: './src/routes',
 *   extensions: ['ts'],
 * });
 * console.log(`Found ${result.totalRoutes} routes in ${result.duration}ms`);
 * ```
 */
export async function discoverRoutes(
  config: RouteDiscoveryConfig | boolean = {},
): Promise<Array<[PathSegment, RouteDefinition[]]>> {
  // Handle backwards compatibility (debug boolean)
  const normalizedConfig: RouteDiscoveryConfig =
    typeof config === 'boolean' ? { debug: config } : config;

  const result = await discoverRoutesWithMetadata(normalizedConfig);
  return result.routes;
}

/**
 * Discover routes with full metadata about the discovery process.
 *
 * @param config - Discovery configuration
 * @returns Promise resolving to discovery result with metadata
 */
export async function discoverRoutesWithMetadata(
  config: RouteDiscoveryConfig = {},
): Promise<RouteDiscoveryResult> {
  const startTime = Date.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { debug } = cfg;

  const result: RouteDiscoveryResult = {
    routes: [],
    totalRoutes: 0,
    filesProcessed: 0,
    failedFiles: [],
    duration: 0,
    routesDir: null,
  };

  debug && consola.start('[DiscoverRoutes] Starting route discovery...');

  // Find routes directory
  const routesDir = await findRoutesDirectory(cfg);

  if (!routesDir) {
    debug && consola.warn('[DiscoverRoutes] No routes directory found');
    result.duration = Date.now() - startTime;
    return result;
  }

  result.routesDir = routesDir;
  debug && consola.info(`[DiscoverRoutes] Routes directory: ${routesDir}`);

  // Build glob pattern
  const pattern = cfg.pattern ?? `**/*.{${cfg.extensions.join(',')}}`;

  // Find route files
  const routeFiles = await fg(pattern, {
    cwd: routesDir,
    absolute: true,
    ignore: cfg.ignore,
    onlyFiles: true,
  });

  debug && consola.info(`[DiscoverRoutes] Found ${routeFiles.length} route file(s)`);

  // Process each file
  for (const file of routeFiles) {
    try {
      const routes = await processRouteFile(file, debug);

      if (routes) {
        result.routes.push(routes);
        result.totalRoutes += routes[1].length;
      }

      result.filesProcessed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.failedFiles.push({ file, error: errorMessage });

      if (cfg.throwOnError) {
        throw error;
      }

      logRouteError(file, error, debug);
    }
  }

  result.duration = Date.now() - startTime;

  // Log summary
  if (debug) {
    consola.success(
      `[DiscoverRoutes] Completed in ${result.duration}ms: ` +
        `${result.totalRoutes} routes from ${result.filesProcessed} files`,
    );

    if (result.failedFiles.length > 0) {
      consola.warn(
        `[DiscoverRoutes] ${result.failedFiles.length} file(s) failed to load`,
      );
    }
  }

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find the routes directory based on config or common locations.
 */
async function findRoutesDirectory(
  config: RouteDiscoveryConfig & typeof DEFAULT_CONFIG,
): Promise<string | null> {
  const { routesDir, basePath, extensions, debug } = config;

  // If explicit path provided, use it
  if (routesDir) {
    const resolvedPath = resolve(basePath, routesDir);

    if (existsSync(resolvedPath)) {
      return resolvedPath;
    }

    debug &&
      consola.warn(
        `[DiscoverRoutes] Configured routesDir not found: ${resolvedPath}`,
      );
    return null;
  }

  // Search common locations
  for (const commonPath of COMMON_ROUTE_PATHS) {
    const fullPath = resolve(basePath, commonPath);

    if (!existsSync(fullPath)) {
      continue;
    }

    // Check if directory has route files
    const pattern = `**/*.{${extensions.join(',')}}`;
    const files = await fg(pattern, {
      cwd: fullPath,
      absolute: true,
      ignore: config.ignore,
      onlyFiles: true,
    });

    if (files.length > 0) {
      debug &&
        consola.info(`[DiscoverRoutes] Found routes in: ${commonPath}`);
      return fullPath;
    }
  }

  return null;
}

/**
 * Process a single route file and extract its routes.
 */
async function processRouteFile(
  file: string,
  debug: boolean,
): Promise<[PathSegment, RouteDefinition[]] | null> {
  // Dynamic import the module
  const module = await import(file);

  // Get the router class (default export)
  const RouterClass = module.default;

  if (!RouterClass) {
    debug && consola.warn(`[DiscoverRoutes] No default export in ${relative(process.cwd(), file)}`);
    return null;
  }

  // Check if it's a decorated router class
  const basePath = getBasePath(RouterClass);

  if (!basePath) {
    debug &&
      consola.warn(
        `[DiscoverRoutes] No @Router decorator in ${relative(process.cwd(), file)}`,
      );
    return null;
  }

  // Instantiate the router class
  const instance = new RouterClass();

  // Get all method names (excluding constructor and getRoutes)
  const methodNames = Object.getOwnPropertyNames(RouterClass.prototype).filter(
    (name) => name !== 'constructor' && name !== 'getRoutes',
  );

  // Extract route definitions from each method
  const routeDefinitions: RouteDefinition[] = [];

  for (const methodName of methodNames) {
    try {
      // Call the method to get the route config
      const method = instance[methodName];

      if (typeof method !== 'function') {
        continue;
      }

      const routeConfig = method.call(instance);

      // Skip if not a valid route config
      if (!routeConfig || typeof routeConfig !== 'object') {
        continue;
      }

      // Validate handler
      if (routeConfig.handler && typeof routeConfig.handler !== 'function') {
        debug &&
          consola.warn(
            `[DiscoverRoutes] Invalid handler for ${methodName} in ${relative(process.cwd(), file)}`,
          );
        continue;
      }

      // Build route definition
      const routeDef: RouteDefinition = {
        path: routeConfig.path ?? '/',
        method: routeConfig.method ?? 'get',
        handler: routeConfig.handler,
        auth: routeConfig.auth,
        validationSchema: routeConfig.schema ?? routeConfig.validationSchema,
        upload: routeConfig.upload,
        middlewares: routeConfig.middlewares ?? [],
        useNext: routeConfig.useNext,
      };

      routeDefinitions.push(routeDef);
    } catch (error) {
      // Individual method errors shouldn't fail the whole file
      debug &&
        consola.warn(
          `[DiscoverRoutes] Error processing ${methodName} in ${relative(process.cwd(), file)}: ${error}`,
        );
    }
  }

  if (routeDefinitions.length === 0) {
    debug &&
      consola.warn(
        `[DiscoverRoutes] No routes found in ${relative(process.cwd(), file)}`,
      );
    return null;
  }

  debug &&
    consola.info(
      `[DiscoverRoutes] ${basePath}: ${routeDefinitions.length} route(s)`,
    );

  return [basePath, routeDefinitions];
}

/**
 * Log detailed error information for a failed route file.
 */
function logRouteError(file: string, error: unknown, debug: boolean): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const relativePath = relative(process.cwd(), file);

  const errorInfo = {
    file: relativePath,
    message: err.message,
    code: (err as NodeJS.ErrnoException).code,
  };

  consola.error(`[DiscoverRoutes] Failed to load: ${relativePath}`);

  if (debug) {
    consola.error(`  Message: ${errorInfo.message}`);

    if (errorInfo.code) {
      consola.error(`  Code: ${errorInfo.code}`);
    }

    // Provide helpful hints based on error type
    if (errorInfo.code === 'MODULE_NOT_FOUND') {
      consola.info(
        '  Hint: Check for missing dependencies or incorrect import paths',
      );
    } else if (err.message?.includes('Unexpected token')) {
      consola.info('  Hint: This might be a syntax error in the file');
    } else if (err.message?.includes('Cannot find module')) {
      consola.info(
        '  Hint: Ensure all imports in the route file are installed',
      );
    }

    // Show truncated stack trace
    if (err.stack) {
      const stackLines = err.stack.split('\n').slice(1, 4);
      consola.error(`  Stack:\n    ${stackLines.join('\n    ')}`);
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a route discovery config from server config.
 *
 * @param serverConfig - The server configuration
 * @returns Route discovery configuration
 */
export function createDiscoveryConfig(serverConfig: {
  debug?: boolean;
  routesDir?: string;
  disableRouteDiscovery?: boolean;
}): RouteDiscoveryConfig | null {
  if (serverConfig.disableRouteDiscovery) {
    return null;
  }

  return {
    debug: serverConfig.debug,
    routesDir: serverConfig.routesDir,
  };
}

/**
 * Validate that a routes directory exists and contains route files.
 *
 * @param routesDir - Path to routes directory
 * @returns True if valid routes directory
 */
export async function validateRoutesDirectory(
  routesDir: string,
): Promise<boolean> {
  if (!existsSync(routesDir)) {
    return false;
  }

  const files = await fg('**/*.{js,ts}', {
    cwd: routesDir,
    ignore: DEFAULT_CONFIG.ignore,
    onlyFiles: true,
  });

  return files.length > 0;
}
