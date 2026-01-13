import consola from 'consola';
import type { Express } from 'express';
import type { RequestHandler } from 'express-serve-static-core';
import type {
  AuthConfig,
  AuthMiddlewareMap,
  AuthTypes,
} from '../types/auth.js';
import { isRoleArray } from '../types/auth.js';
import type { IMiddlewareEngine } from '../types/engines.js';
import type {
  MiddlewareCategory,
  MiddlewareConfig,
  MiddlewarePreset,
} from '../types/middleware.js';

/**
 * MiddlewareEngine manages middleware registration, ordering, and application.
 *
 * Now accepts auth configuration at construction time, allowing users to
 * define their own auth types rather than using hardcoded defaults.
 *
 * @example
 * ```typescript
 * const middlewareEngine = new MiddlewareEngine(app, true, {
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
 * });
 * ```
 */
export class MiddlewareEngine implements IMiddlewareEngine {
  private middlewareRegistry = new Map<string, MiddlewareConfig>();
  private orderedMiddleware: MiddlewareConfig[] = [];

  private authMiddleware: AuthMiddlewareMap = {};
  private roleHandler?: (roles: string[]) => RequestHandler;
  private fallbackHandler?: (authType: string) => RequestHandler;

  constructor(
    private app: Express,
    private debug = false,
    authConfig?: AuthConfig,
  ) {
    // Configure auth from config
    if (authConfig) {
      this.configureAuth(authConfig);
    }
  }

  /**
   * Configure authentication middleware from config.
   *
   * This can be called after construction to update auth configuration.
   */
  public configureAuth(config: AuthConfig): this {
    // Set handlers
    if (config.handlers) {
      this.authMiddleware = { ...config.handlers };
      this.debug &&
        consola.info(
          `[MiddlewareEngine] Configured ${Object.keys(config.handlers).length} auth handler(s)`,
        );
    }

    // Set role handler
    if (config.roleHandler) {
      this.roleHandler = config.roleHandler;
      this.debug && consola.info('[MiddlewareEngine] Configured role handler');
    }

    // Set fallback handler
    if (config.fallbackHandler) {
      this.fallbackHandler = config.fallbackHandler;
    }

    return this;
  }

  /**
   * Check if a middleware is registered.
   */
  public hasMiddleware(name: string): boolean {
    return this.middlewareRegistry.has(name);
  }

  /**
   * Check if an auth type is configured.
   */
  public hasAuthType(authType: string): boolean {
    return authType in this.authMiddleware;
  }

  /**
   * Get all configured auth type names.
   */
  public getAuthTypes(): string[] {
    return Object.keys(this.authMiddleware);
  }

  /**
   * Register a single middleware configuration.
   */
  register(config: MiddlewareConfig): this {
    try {
      this.validateMiddleware(config);
      this.middlewareRegistry.set(config.name, config);
      this.debug &&
        consola.info(
          `[MiddlewareEngine] Registered middleware: ${config.name}`,
        );
      return this;
    } catch (error) {
      consola.error('[MiddlewareEngine] Error registering middleware:', error);
      throw error;
    }
  }

  /**
   * Register multiple middleware configurations.
   */
  registerBulk(configs: MiddlewareConfig[]): this {
    configs.forEach((config) => this.register(config));
    return this;
  }

  /**
   * Register a complete middleware preset.
   */
  registerPreset(preset: MiddlewarePreset): this {
    this.registerBulk(preset.middlewares);
    this.debug &&
      consola.info(`[MiddlewareEngine] Registered preset: ${preset.name}`);
    return this;
  }

  /**
   * Enable a middleware by name.
   */
  enable(name: string): this {
    const middleware = this.middlewareRegistry.get(name);
    if (middleware) {
      middleware.enabled = true;
    }
    return this;
  }

  /**
   * Disable a middleware by name.
   */
  disable(name: string): this {
    const middleware = this.middlewareRegistry.get(name);
    if (middleware) {
      middleware.enabled = false;
    }
    return this;
  }

  /**
   * Apply all middleware in a category to the Express app.
   */
  applyCategory(category: MiddlewareCategory): this {
    this.orderMiddleware();
    const ordered = this.orderedMiddleware.filter(
      (m) => m.category === category,
    );
    this.applyMiddleware(ordered);

    this.debug &&
      consola.info(
        `[MiddlewareEngine] Applied ${ordered.length} middleware(s) from category: ${category}`,
      );

    return this;
  }

  /**
   * Get the auth middleware handler for the given auth type.
   *
   * @param auth - Auth type name or array of roles
   * @returns The middleware handler
   * @throws Error if auth type is not configured and no fallback exists
   */
  getAuthMiddleware(auth: AuthTypes): RequestHandler {
    // Handle role array
    if (isRoleArray(auth)) {
      if (!this.roleHandler) {
        throw new Error(
          '[MiddlewareEngine] Role-based auth used but no roleHandler configured. ' +
            'Add a roleHandler to your auth config.',
        );
      }
      return this.roleHandler(auth);
    }

    // Handle named auth type
    const middleware = this.authMiddleware[auth];

    if (middleware) {
      return middleware;
    }

    // Try fallback handler
    if (this.fallbackHandler) {
      return this.fallbackHandler(auth);
    }

    // No handler found - provide helpful error
    const availableTypes = Object.keys(this.authMiddleware);
    const suggestion =
      availableTypes.length > 0
        ? `Available types: ${availableTypes.join(', ')}`
        : 'No auth types configured. Add handlers to your auth config.';

    throw new Error(
      `[MiddlewareEngine] Unknown auth type: "${auth}". ${suggestion}`,
    );
  }

  /**
   * Add or update a single auth handler.
   *
   * Useful for plugins that want to register auth types.
   */
  setAuthHandler(name: string, handler: RequestHandler): this {
    this.authMiddleware[name] = handler;
    this.debug && consola.info(`[MiddlewareEngine] Set auth handler: ${name}`);
    return this;
  }

  /**
   * Remove an auth handler.
   */
  removeAuthHandler(name: string): this {
    delete this.authMiddleware[name];
    return this;
  }

  /**
   * Validate a middleware configuration.
   */
  private validateMiddleware(config: MiddlewareConfig) {
    if (!config?.name) {
      throw new Error('[MiddlewareEngine] Middleware must have a name');
    }

    if (!config?.handler) {
      throw new Error(
        `[MiddlewareEngine] Middleware ${config.name} must have a handler`,
      );
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
   * Order middleware by priority and dependencies.
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
   * Apply middleware handlers to the Express app.
   * Automatically detects error handlers (4 parameters) and standard handlers (3 parameters).
   */
  private applyMiddleware(middlewares: MiddlewareConfig[]) {
    middlewares.forEach((m) => {
      try {
        // Detect error handler by parameter count (4 params = error handler)
        const isErrorHandler = m.handler.length === 4;

        if (isErrorHandler) {
          // Error handlers must be cast to any to satisfy Express's overload resolution
          this.app.use(m.handler as any);
        } else {
          // Standard middleware handlers
          this.app.use(m.handler as RequestHandler);
        }

        this.debug &&
          consola.info(
            `[MiddlewareEngine] Applied: ${m.name}${isErrorHandler ? ' (error handler)' : ''}`,
          );
      } catch (error) {
        consola.error(
          `[MiddlewareEngine] Error applying middleware ${m.name}:`,
          error,
        );
        throw error;
      }
    });
  }
}
