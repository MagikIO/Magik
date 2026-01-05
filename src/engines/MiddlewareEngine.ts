import consola from 'consola';
import type { Express, RequestHandler } from 'express';
import type { IMiddlewareEngine } from '../types/engines';
import type {
  AuthMiddlewareMap,
  AuthTypes,
  MiddlewareCategory,
  MiddlewareConfig,
  MiddlewarePreset,
} from '../types/middleware';
import { allPresets } from '../presets';

/**
 * MiddlewareEngine manages middleware registration, ordering, and application
 *
 * Middleware is organized into categories with priority ordering:
 * - security (90-100): Helmet, CORS, rate limiting
 * - session (70-89): Session management, cookies
 * - parser (80-89): Body parsing, JSON, URL-encoded
 * - compression (60-69): Response compression
 * - logging (50-59): Request logging
 * - static (40-49): Static file serving
 * - custom (0-39): Application middleware
 *
 * @example
 * ```typescript
 * const middlewareEngine = new MiddlewareEngine(app, true);
 *
 * middlewareEngine.register({
 *   name: 'request-timer',
 *   category: 'logging',
 *   priority: 55,
 *   handler: (req, res, next) => {
 *     const start = Date.now();
 *     res.on('finish', () => {
 *       console.log(`${req.method} ${req.path} - ${Date.now() - start}ms`);
 *     });
 *     next();
 *   },
 * });
 *
 * middlewareEngine.applyCategory('logging');
 * ```
 */
export class MiddlewareEngine implements IMiddlewareEngine {
  private middlewareRegistry = new Map<string, MiddlewareConfig>();
  private orderedMiddleware: MiddlewareConfig[] = [];

  private authMiddleware: AuthMiddlewareMap = {
    ensureAuthenticated: this.createPlaceholderAuth('ensureAuthenticated'),
    ensureAccessGranted: this.createPlaceholderAuth('ensureAccessGranted'),
    ensureAdmin: this.createPlaceholderAuth('ensureAdmin'),
    ensureIT: this.createPlaceholderAuth('ensureIT'),
    ensureIsEmployee: this.createPlaceholderAuth('ensureIsEmployee'),
  };

  constructor(
    private app: Express,
    private debug = false,
  ) {
    // Load all built-in presets
    allPresets.forEach((preset) => {
      this.registerBulk(preset.middlewares);
      this.debug && consola.info(`[MiddlewareEngine] Loaded preset: ${preset.name}`);
    });
  }

  /**
   * Create a placeholder auth middleware that throws an error
   * These should be replaced by the actual auth implementation
   */
  private createPlaceholderAuth(name: string): RequestHandler {
    return (_req, _res, next) => {
      next(new Error(`Auth middleware "${name}" not configured. Install an auth plugin.`));
    };
  }

  /**
   * Check if a middleware is registered
   *
   * @param name - The middleware name
   * @returns true if registered
   */
  public hasMiddleware(name: string): boolean {
    return this.middlewareRegistry.has(name);
  }

  /**
   * Register a single middleware configuration
   *
   * @param config - The middleware configuration
   * @returns this for chaining
   */
  register(config: MiddlewareConfig): this {
    try {
      this.validateMiddleware(config);
      this.middlewareRegistry.set(config.name, config);
      this.debug && consola.info(`[MiddlewareEngine] Registered middleware: ${config.name}`);
      return this;
    } catch (error) {
      consola.error('[MiddlewareEngine] Error registering middleware:', error);
      throw error;
    }
  }

  /**
   * Register multiple middleware configurations
   *
   * @param configs - Array of middleware configurations
   * @returns this for chaining
   */
  registerBulk(configs: MiddlewareConfig[]): this {
    configs.forEach((config) => this.register(config));
    return this;
  }

  /**
   * Register a complete middleware preset
   *
   * @param preset - The preset containing multiple middleware configs
   * @returns this for chaining
   */
  registerPreset(preset: MiddlewarePreset): this {
    this.registerBulk(preset.middlewares);
    this.debug && consola.info(`[MiddlewareEngine] Registered preset: ${preset.name}`);
    return this;
  }

  /**
   * Enable a middleware by name
   *
   * @param name - The middleware name to enable
   * @returns this for chaining
   */
  enable(name: string): this {
    const middleware = this.middlewareRegistry.get(name);
    if (middleware) {
      middleware.enabled = true;
    }
    return this;
  }

  /**
   * Disable a middleware by name
   *
   * @param name - The middleware name to disable
   * @returns this for chaining
   */
  disable(name: string): this {
    const middleware = this.middlewareRegistry.get(name);
    if (middleware) {
      middleware.enabled = false;
    }
    return this;
  }

  /**
   * Apply all middleware in a category to the Express app
   *
   * @param category - The middleware category to apply
   * @returns this for chaining
   */
  applyCategory(category: MiddlewareCategory): this {
    const categoryMiddleware = Array.from(this.middlewareRegistry.values())
      .filter((m) => m.category === category && m.enabled !== false);

    this.orderMiddleware();
    const ordered = this.orderedMiddleware.filter((m) => m.category === category);
    this.applyMiddleware(ordered);

    this.debug &&
      consola.info(
        `[MiddlewareEngine] Applied ${ordered.length} middleware(s) from category: ${category}`,
      );

    return this;
  }

  /**
   * Set custom auth middleware handlers
   *
   * @param handlers - Partial map of auth handlers to set
   * @returns this for chaining
   */
  setAuthMiddleware(handlers: Partial<AuthMiddlewareMap>): this {
    Object.assign(this.authMiddleware, handlers);
    return this;
  }

  /**
   * Get the auth middleware handler for the given auth type
   *
   * @param auth - The auth type or array of roles
   * @returns The middleware handler
   */
  getAuthMiddleware(auth: AuthTypes): RequestHandler {
    // Handle role array auth
    if (Array.isArray(auth)) {
      return this.createRoleMiddleware(auth);
    }

    const middleware = this.authMiddleware[auth];
    if (!middleware) {
      throw new Error(`[MiddlewareEngine] Unknown auth type: ${auth}`);
    }

    return middleware;
  }

  /**
   * Create middleware that checks for any of the specified roles
   */
  private createRoleMiddleware(roles: string[]): RequestHandler {
    return (req, _res, next) => {
      const user = req.user as { roles?: string[] } | undefined;
      if (!user) {
        return next(new Error('Authentication required'));
      }

      const userRoles = user.roles || [];
      const hasRole = roles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        return next(new Error(`Required role(s): ${roles.join(', ')}`));
      }

      next();
    };
  }

  /**
   * Validate a middleware configuration
   */
  private validateMiddleware(config: MiddlewareConfig) {
    if (!config?.name) {
      throw new Error('[MiddlewareEngine] Middleware must have a name');
    }

    if (!config?.handler) {
      throw new Error(`[MiddlewareEngine] Middleware ${config.name} must have a handler`);
    }

    const validCategories: MiddlewareCategory[] = [
      'security',
      'session',
      'parser',
      'compression',
      'logging',
      'static',
      'custom',
    ];

    if (!config?.category || !validCategories.includes(config.category)) {
      throw new Error(
        `[MiddlewareEngine] Invalid category for middleware ${config.name}: ${config.category}`,
      );
    }

    // Check dependencies exist
    if (config.dependencies?.length) {
      config.dependencies.forEach((dep) => {
        if (!this.middlewareRegistry.has(dep)) {
          throw new Error(
            `[MiddlewareEngine] Missing dependency ${dep} for middleware ${config.name}`,
          );
        }
      });
    }
  }

  /**
   * Order middleware by priority and dependencies
   */
  private orderMiddleware() {
    const middlewares = Array.from(this.middlewareRegistry.values()).filter(
      (m) => m.enabled !== false,
    );

    this.orderedMiddleware = middlewares.sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;

      // Higher priority first
      if (priorityA !== priorityB) return priorityB - priorityA;

      // Handle dependencies
      if (a.dependencies?.includes(b.name)) return 1;
      if (b.dependencies?.includes(a.name)) return -1;

      return 0;
    });
  }

  /**
   * Apply middleware handlers to the Express app
   */
  private applyMiddleware(middlewares: MiddlewareConfig[]) {
    middlewares.forEach((m) => {
      try {
        const handler = m.handler as RequestHandler;
        this.app.use(handler);
        this.debug && consola.info(`[MiddlewareEngine] Applied: ${m.name}`);
      } catch (error) {
        consola.error(`[MiddlewareEngine] Error applying middleware ${m.name}:`, error);
        throw error;
      }
    });
  }
}
