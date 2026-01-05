import consola from 'consola';
import { Router, type RequestHandler, type Response, type NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import type { IRouteEngine } from '../types/engines';
import type { AuthTypes } from '../types/middleware';
import type {
  HTTPMethod,
  MagikRequest,
  PathSegment,
  RouteDefinition
} from '../types/routes';
import type { IMagikServer } from '../types/server';

/**
 * RouteEngine manages route registration and request handling for a specific prefix
 *
 * Each prefix (e.g., '/users', '/orders') gets its own RouteEngine instance.
 * The engine handles:
 * - Route registration with path and method
 * - Authentication middleware
 * - Request validation
 * - File uploads
 * - Error handling
 *
 * @example
 * ```typescript
 * const engine = new RouteEngine(server, '/users', true);
 *
 * engine.route({
 *   path: '/',
 *   method: 'get',
 *   handler: (req, res) => res.json([]),
 * });
 *
 * engine.route({
 *   path: '/:id',
 *   method: 'get',
 *   auth: 'ensureAuthenticated',
 *   handler: (req, res) => res.json({ id: req.params.id }),
 * });
 * ```
 */
export class RouteEngine implements IRouteEngine {
  private router: Router;
  private routeCount = 0;
  private methodCounts: Record<HTTPMethod, number> = {
    get: 0,
    post: 0,
    put: 0,
    delete: 0,
    patch: 0,
  };

  constructor(
    private server: IMagikServer,
    public readonly prefix: PathSegment,
    private debug = false,
  ) {
    this.router = Router();
  }

  /**
   * Get the Express router instance
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Get the total number of routes registered
   */
  getRouteCount(): number {
    return this.routeCount;
  }

  /**
   * Get route count by HTTP method
   */
  getRouteCountByMethod(): Record<HTTPMethod, number> {
    return { ...this.methodCounts };
  }

  /**
   * Wrap a handler function with error handling
   */
  private wrapHandler<Schema>(
    handler: (
      req: MagikRequest<Schema>,
      res: Response,
      next: NextFunction,
    ) => Promise<unknown> | void,
    useNext = false,
  ): RequestHandler {
    return async (req, res, next) => {
      try {
        if (typeof handler !== 'function') {
          consola.error('[RouteEngine] Handler is not a function:', {
            handler,
            route: req.originalUrl,
          });
          return res.status(500).send("We're sorry, but something went wrong");
        }

        if (useNext) {
          await handler(req as MagikRequest<Schema>, res, next);
        } else {
          await handler(req as MagikRequest<Schema>, res, next);
        }
      } catch (error) {
        consola.error('[RouteEngine] Handler error:', error);
        next(error);
      }
    };
  }

  /**
   * Register a route definition
   *
   * @param config - The route definition
   * @returns this for chaining
   */
  route<Schema>(config: RouteDefinition<Schema>): this {
    const method = config.method ?? 'get';
    const path = config.path ?? '/';

    const middlewares: RequestHandler[] = [
      ...this.getAuthMiddleware(config.auth),
      ...this.getValidationMiddleware(config.validationSchema),
      ...(config.middlewares ?? []),
    ].filter(Boolean) as RequestHandler[];

    this.router[method](
      path,
      ...middlewares,
      this.wrapHandler(config.handler, config.useNext),
    );

    this.routeCount++;
    this.methodCounts[method]++;

    this.debug &&
      consola.info(
        `[RouteEngine] Registered ${method.toUpperCase()} ${this.prefix}${path}`,
      );

    return this;
  }

  /**
   * Get auth middleware for the route
   */
  private getAuthMiddleware(auth?: AuthTypes): RequestHandler[] {
    if (!auth) return [];

    try {
      const middleware = this.server.middlewareEngine.getAuthMiddleware(auth);
      return [middleware];
    } catch (error) {
      consola.error('[RouteEngine] Auth middleware error:', error);
      throw error;
    }
  }

  /**
   * Get validation middleware for the route
   */
  private getValidationMiddleware(schema?: ZodSchema): RequestHandler[] {
    if (!schema) return [];

    return [
      (req, res, next) => {
        try {
          const result = schema.safeParse(req.body);
          if (!result.success) {
            return res.status(400).json({
              error: 'Validation failed',
              details: result.error.flatten(),
            });
          }
          req.body = result.data;
          next();
        } catch (error) {
          next(error);
        }
      },
    ];
  }
}
