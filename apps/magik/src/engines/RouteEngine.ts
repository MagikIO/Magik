import consola from 'consola';
import { Router } from 'express';
import z from 'zod/v4';
import type { IRouteEngine } from '../types/engines';

import type {
  HTTPMethod,
  MagikRequest,
  PathSegment,
  RouteDefinition
} from '../types/routes';
import type { IMagikServer } from '../types/server';
import type { RequestHandler, NextFunction, Response } from 'express-serve-static-core';
import type { AuthTypes } from 'src/types/auth';

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
      next: NextFunction | undefined,
    ) => Promise<unknown> | void,
    useNext = false,
  ): RequestHandler {
    return async (req, res, next): Promise<void> => {
      try {
        if (typeof handler !== 'function') {
          consola.error('[RouteEngine] Handler is not a function:', {
            handler,
            route: req.originalUrl,
          });
          res.status(500).send("We're sorry, but something went wrong");
          return;
        }

        if (useNext) {
          await handler(req as MagikRequest<Schema>, res, next);
        } else {
          await handler(req as MagikRequest<Schema>, res, next);
        }
      } catch (error) {
        consola.error('[RouteEngine] Handler error:', error);
        next?.(error);
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
  private getValidationMiddleware(schema?: z.ZodSchema): RequestHandler[] {
    if (!schema) return [];

    return [
      async (req, res, next) => {
        try {
          const hasReqKeys =
            schema instanceof z.ZodObject &&
            Object.keys(schema.shape).some((key) =>
              ['body', 'params', 'query'].includes(key),
            );

          const result = hasReqKeys
            ? await schema.safeParseAsync({
                body: req.body,
                params: req.params,
                query: req.query,
              })
            : await schema.safeParseAsync(req.body);

          if (!result.success) {
            if (this.debug) {
              consola.error('\nValidation Errors:');
              result.error.issues.forEach((issue) => {
                const inputData = hasReqKeys
                  ? { body: req.body, params: req.params, query: req.query }
                  : req.body;

                const currentValue = issue.path.reduce(
                  (obj, key) => obj?.[key],
                  inputData,
                );

                consola.error({
                  field: issue.path.join('.') || 'root',
                  error: issue.message,
                  type: issue.code,
                  received:
                    currentValue === undefined ? 'undefined' : currentValue,
                  expected: this.getExpectedValue(issue),
                });
              });
              consola.error(''); // Empty line for readability
            }


            res.status(400).json({
              error: 'Validation failed',
              details: result.error.issues.map((issue) => ({
                field: issue.path.join('.') || 'root',
                message: issue.message,
                code: issue.code,
              })),
            });

            return
          }

          req.body = hasReqKeys 
            ? (result.data as { body: any }).body 
            : result.data;
          next?.();
        } catch (error) {
          next?.(error);
        }
      },
    ];
  }

    private getExpectedValue(issue: z.core.$ZodIssue): string {
    switch (issue.code) {
      case 'invalid_type':
        return `type: ${(issue as any).expected}`;
      case 'too_small':
        return `min length: ${(issue as any).minimum}`;
      case 'too_big':
        return `max length: ${(issue as any).maximum}`;
      default:
        return issue.code;
    }
  }
}
