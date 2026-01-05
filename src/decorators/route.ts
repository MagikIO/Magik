import 'reflect-metadata';
import type { PathSegment, RouteDefinition } from '../types/routes';

// ============================================================================
// Metadata Keys
// ============================================================================

const ROUTES_KEY = Symbol('routes');
const BASE_PATH_KEY = Symbol('basePath');

// ============================================================================
// Router Decorator
// ============================================================================

/**
 * Class decorator that defines the base path for all routes in a router class
 *
 * @param basePath - The base path prefix for all routes (e.g., '/users')
 *
 * @example
 * ```typescript
 * @Router('/users')
 * export default class UserRouter {
 *   // All routes will be prefixed with /users
 * }
 * ```
 */
export function Router(basePath: PathSegment) {
  return function (target: Function) {
    Reflect.defineMetadata(BASE_PATH_KEY, basePath, target);

    // Add routes method to prototype for easy access
    target.prototype.getRoutes = function () {
      return Reflect.getMetadata(ROUTES_KEY, target) || [];
    };
  };
}

// ============================================================================
// Method Decorator Factory
// ============================================================================

function createMethodDecorator(method: 'get' | 'post' | 'put' | 'delete' | 'patch') {
  return function (path: PathSegment) {
    return function (
      target: object,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ) {
      const routes = Reflect.getMetadata(ROUTES_KEY, target.constructor) || [];

      // Store the original method
      const originalMethod = descriptor.value;

      // Replace descriptor value with wrapper that includes route metadata
      descriptor.value = function () {
        const routeConfig = originalMethod.apply(this);
        return {
          ...routeConfig,
          path: path,
          method: method,
          propertyKey,
        };
      };

      // Store route metadata for discovery
      routes.push({
        path,
        method,
        propertyKey,
        handler: originalMethod,
      });

      Reflect.defineMetadata(ROUTES_KEY, routes, target.constructor);

      return descriptor;
    };
  };
}

// ============================================================================
// HTTP Method Decorators
// ============================================================================

/**
 * GET method decorator
 *
 * @param path - The route path (relative to router base path)
 *
 * @example
 * ```typescript
 * @Get('/:id')
 * public getUser() {
 *   return createRoute({
 *     handler: (req, res) => res.json({ id: req.params.id })
 *   });
 * }
 * ```
 */
export const Get = createMethodDecorator('get');

/**
 * POST method decorator
 *
 * @param path - The route path (relative to router base path)
 *
 * @example
 * ```typescript
 * @Post('/')
 * public createUser() {
 *   return createRoute({
 *     schema: userSchema,
 *     handler: (req, res) => res.json(req.body)
 *   });
 * }
 * ```
 */
export const Post = createMethodDecorator('post');

/**
 * PUT method decorator
 *
 * @param path - The route path (relative to router base path)
 *
 * @example
 * ```typescript
 * @Put('/:id')
 * public updateUser() {
 *   return createRoute({
 *     schema: updateUserSchema,
 *     handler: (req, res) => res.json({ updated: true })
 *   });
 * }
 * ```
 */
export const Put = createMethodDecorator('put');

/**
 * DELETE method decorator
 *
 * @param path - The route path (relative to router base path)
 *
 * @example
 * ```typescript
 * @Delete('/:id')
 * public deleteUser() {
 *   return createRoute({
 *     auth: 'ensureAdmin',
 *     handler: (req, res) => res.status(204).send()
 *   });
 * }
 * ```
 */
export const Delete = createMethodDecorator('delete');

/**
 * PATCH method decorator
 *
 * @param path - The route path (relative to router base path)
 *
 * @example
 * ```typescript
 * @Patch('/:id')
 * public patchUser() {
 *   return createRoute({
 *     handler: (req, res) => res.json({ patched: true })
 *   });
 * }
 * ```
 */
export const Patch = createMethodDecorator('patch');

// ============================================================================
// Metadata Accessors
// ============================================================================

/**
 * Get all routes defined on a router class
 *
 * @param target - The router class
 * @returns Array of route definitions
 */
export function getRoutes(target: Function): RouteDefinition[] {
  return Reflect.getMetadata(ROUTES_KEY, target) || [];
}

/**
 * Get the base path for a router class
 *
 * @param target - The router class
 * @returns The base path or undefined if not decorated
 */
export function getBasePath(target: Function): PathSegment | undefined {
  return Reflect.getMetadata(BASE_PATH_KEY, target);
}
