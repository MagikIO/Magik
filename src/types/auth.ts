import type { RequestHandler } from 'express-serve-static-core';

// ============================================================================
// Auth Configuration
// ============================================================================

/**
 * Configuration for authentication middleware.
 * 
 * This allows users to define their own auth types rather than being
 * locked into framework-defined types like 'ensureAdmin'.
 * 
 * @example
 * ```typescript
 * const authConfig: AuthConfig = {
 *   handlers: {
 *     ensureAuthenticated: (req, res, next) => {
 *       if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
 *       next();
 *     },
 *     ensureAdmin: (req, res, next) => {
 *       if (!req.user?.isAdmin) return res.status(403).json({ error: 'Forbidden' });
 *       next();
 *     },
 *     // Your custom auth types!
 *     ensureSubscribed: (req, res, next) => {
 *       if (!req.user?.subscription?.active) {
 *         return res.status(402).json({ error: 'Subscription required' });
 *       }
 *       next();
 *     },
 *   },
 *   roleHandler: (roles) => (req, res, next) => {
 *     const userRoles = req.user?.roles ?? [];
 *     if (!roles.some(r => userRoles.includes(r))) {
 *       return res.status(403).json({ error: 'Insufficient role' });
 *     }
 *     next();
 *   },
 * };
 * ```
 */
export interface AuthConfig<TAuthTypes extends string = string> {
  /**
   * Map of auth type names to their middleware handlers.
   * 
   * The keys become the valid values for `auth` in route definitions.
   * For example, if you define `ensureAuthenticated`, you can use:
   * ```typescript
   * createRoute({ auth: 'ensureAuthenticated', handler: ... })
   * ```
   */
  handlers: Record<TAuthTypes, RequestHandler>;

  /**
   * Handler factory for role-based auth.
   * 
   * When a route uses an array for auth (e.g., `auth: ['admin', 'moderator']`),
   * this function is called to create the middleware.
   * 
   * @param roles - The roles required for the route
   * @returns Middleware that checks if user has any of the roles
   * 
   * @example
   * ```typescript
   * roleHandler: (roles) => (req, res, next) => {
   *   const userRoles = req.user?.roles ?? [];
   *   if (roles.some(r => userRoles.includes(r))) {
   *     return next();
   *   }
   *   res.status(403).json({ error: 'Forbidden' });
   * }
   * ```
   */
  roleHandler?: (roles: string[]) => RequestHandler;

  /**
   * Fallback handler when an unknown auth type is requested.
   * 
   * If not provided, unknown auth types will throw an error.
   * This can be useful for development/debugging.
   */
  fallbackHandler?: (authType: string) => RequestHandler;
}

// ============================================================================
// Auth Types Helper
// ============================================================================

/**
 * Extracts the auth type names from an AuthConfig.
 * 
 * @example
 * ```typescript
 * const config = {
 *   handlers: {
 *     ensureAuthenticated: ...,
 *     ensureAdmin: ...,
 *   }
 * } satisfies AuthConfig;
 * 
 * type MyAuthTypes = ExtractAuthTypes<typeof config>;
 * // Result: 'ensureAuthenticated' | 'ensureAdmin'
 * ```
 */
export type ExtractAuthTypes<T extends AuthConfig> = keyof T['handlers'] & string;

/**
 * The runtime auth type - either a named type or an array of roles.
 * 
 * When using config-based auth, this becomes:
 * - A key from your `handlers` object, OR
 * - An array of role strings (handled by `roleHandler`)
 */
export type AuthTypes<TAuthTypes extends string = string> = TAuthTypes | string[];

// ============================================================================
// Default Auth Types (for backwards compatibility)
// ============================================================================

/**
 * Default auth type names that Magik recognizes.
 * 
 * These are provided for backwards compatibility and as a suggested
 * naming convention. You're free to use any names you want.
 */
export type DefaultAuthTypes =
  | 'ensureAuthenticated'
  | 'ensureAccessGranted'
  | 'ensureAdmin'
  | 'ensureIT'
  | 'ensureIsEmployee';

// ============================================================================
// Auth Middleware Map (internal)
// ============================================================================

/**
 * Internal type for the middleware engine's auth map.
 * This is what gets built from AuthConfig.
 */
export interface AuthMiddlewareMap {
  [authType: string]: RequestHandler;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if auth is a role array.
 */
export function isRoleArray(auth: AuthTypes): auth is string[] {
  return Array.isArray(auth);
}

/**
 * Creates a placeholder auth handler that returns 501 Not Implemented.
 * Useful for development when auth isn't configured yet.
 */
export function createPlaceholderAuth(authType: string): RequestHandler {
  return (_req, res) => {
    res.status(501).json({
      error: 'Auth not configured',
      message: `Auth type "${authType}" is not implemented. Configure it in MagikServerConfig.auth`,
    });
  };
}

/**
 * Creates a simple "always allow" auth handler.
 * Useful for development/testing.
 */
export function createPassthroughAuth(): RequestHandler {
  return (_req, _res, next) => next?.();
}

/**
 * Creates a simple "always deny" auth handler.
 * Useful for locking down routes during maintenance.
 */
export function createDenyAuth(message = 'Access denied'): RequestHandler {
  return (_req, res) => {
    res.status(403).json({ error: message });
  };
}
