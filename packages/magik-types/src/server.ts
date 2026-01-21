import type { AuthConfig } from './auth.js';
import type { MagikDatabaseConfig } from './database.js';
import type { MiddlewarePreset } from './middleware.js';
import type { MagikPlugin } from './plugins.js';
import type { RouteDiscoveryConfig } from './routes.js';

// Re-export IMagikServer from core for backward compatibility
export type { IMagikServer } from './core.js';

/**
 * Server status states.
 */
export type ServerStatus =
  | 'STARTING'
  | 'ONLINE'
  | 'OFFLINE'
  | 'SHUTTING_DOWN'
  | 'ERROR';

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * Configuration options for creating a MagikServer.
 *
 * @typeParam TServerName - String literal type for the server name
 * @typeParam TAuthTypes - String literal union of auth type names
 * @typeParam TConnection - Database connection type (optional)
 * @typeParam TServices - Database service names (optional)
 *
 * @example
 * ```typescript
 * // Minimal config (no database, no auth)
 * const server = await MagikServer.init({
 *   name: 'my-api',
 *   port: 3000,
 * });
 *
 * // Full config with database and auth
 * const server = await MagikServer.init({
 *   name: 'my-api',
 *   port: 3000,
 *   debug: true,
 *   database: {
 *     adapter: new MongooseAdapter(),
 *     primaryService: 'main',
 *     connectionOptions: { uri: process.env.MONGO_URI! },
 *   },
 *   auth: {
 *     handlers: {
 *       ensureAuthenticated: myAuthMiddleware,
 *       ensureAdmin: myAdminMiddleware,
 *     },
 *     roleHandler: (roles) => myRoleMiddleware(roles),
 *   },
 * });
 * ```
 */
export interface MagikServerConfig<
  TServerName extends string = string,
  TAuthTypes extends string = string,
  TConnection = unknown,
  TServices extends string = string,
> {
  /**
   * Unique name for this server instance.
   * Used for logging and identification.
   */
  name: TServerName;

  /**
   * Port to listen on.
   * Falls back to PORT environment variable, then 5000.
   */
  port?: number;

  /**
   * Host to bind to.
   * @default '0.0.0.0'
   */
  host?: string;

  /**
   * Enable debug mode for verbose logging.
   * @default false (or DEBUG env var)
   */
  debug?: boolean;

  /**
   * Server environment mode.
   * @default process.env.NODE_ENV or 'development'
   */
  mode?: 'development' | 'production';

  /**
   * Database configuration.
   *
   * Omit entirely if this server doesn't need a database.
   * The adapter pattern allows any database to be used.
   *
   * @example
   * ```typescript
   * database: {
   *   adapter: new MongooseAdapter(),
   *   primaryService: 'main',
   *   connectionOptions: {
   *     uri: process.env.MONGO_URI!,
   *     options: { maxPoolSize: 10 },
   *   },
   *   autoConnect: true,
   *   autoDisconnect: true,
   * }
   * ```
   */
  database?: MagikDatabaseConfig<TConnection, TServices>;

  /**
   * Authentication middleware configuration.
   *
   * Define your own auth types and their middleware handlers.
   * If not provided, routes with `auth` will throw an error.
   *
   * @example
   * ```typescript
   * auth: {
   *   handlers: {
   *     ensureAuthenticated: (req, res, next) => {
   *       if (!req.user) return res.status(401).send('Unauthorized');
   *       next();
   *     },
   *     ensureAdmin: (req, res, next) => {
   *       if (!req.user?.isAdmin) return res.status(403).send('Forbidden');
   *       next();
   *     },
   *   },
   *   roleHandler: (roles) => (req, res, next) => {
   *     const userRoles = req.user?.roles ?? [];
   *     if (roles.some(r => userRoles.includes(r))) return next();
   *     res.status(403).send('Forbidden');
   *   },
   * }
   * ```
   */
  auth?: AuthConfig<TAuthTypes>;

  /**
   * Plugins to install during initialization.
   *
   * These are installed in order after the server is created
   * but before it starts listening.
   */
  plugins?: MagikPlugin[];

  /**
   * Middleware presets to apply during initialization.
   *
   * Presets are no longer automatically loaded - you must explicitly
   * include the ones you want. This allows for full control over
   * which middleware is applied and in what order.
   *
   * @example
   * ```typescript
   * import { securityPreset, parserPreset, allPresets } from 'magik/presets';
   *
   * // Apply specific presets
   * presets: [securityPreset, parserPreset],
   *
   * // Or use all built-in presets
   * presets: allPresets,
   *
   * // Or no presets (you configure everything manually)
   * presets: [],
   * ```
   */
  presets?: MiddlewarePreset[];

  routeDiscoveryOptions?: RouteDiscoveryConfig;

  /**
   * Disable automatic route discovery.
   * Useful when you want to register routes manually.
   *
   * @default false
   */
  disableRouteDiscovery?: boolean;
}

// ============================================================================
// Config Type Inference Helpers
// ============================================================================

/**
 * Infer the auth types from a server config.
 *
 * @example
 * ```typescript
 * const config = {
 *   name: 'my-api',
 *   auth: {
 *     handlers: {
 *       ensureAuthenticated: ...,
 *       ensureAdmin: ...,
 *     }
 *   }
 * } satisfies MagikServerConfig;
 *
 * type MyAuthTypes = InferAuthTypes<typeof config>;
 * // Result: 'ensureAuthenticated' | 'ensureAdmin'
 * ```
 */
export type InferAuthTypes<T extends MagikServerConfig> =
  T extends MagikServerConfig<any, infer A, any, any> ? A : never;

/**
 * Infer the database connection type from a server config.
 */
export type InferDbConnection<T extends MagikServerConfig> =
  T extends MagikServerConfig<any, any, infer C, any> ? C : never;

/**
 * Infer the database service names from a server config.
 */
export type InferDbServices<T extends MagikServerConfig> =
  T extends MagikServerConfig<any, any, any, infer S> ? S : never;
