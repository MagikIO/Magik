import 'reflect-metadata';
import type {
  HTTPMethod,
  PathSegment,
  RouteDefinition,
} from '../types/routes.js';

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
  return <T extends new (...args: any[]) => any>(target: T) => {
    // Store the base path on the class
    Reflect.defineMetadata(BASE_PATH_KEY, basePath, target);

    // Add helper method to get routes from instance
    target.prototype.getRoutes = (): RouteDefinition[] =>
      Reflect.getMetadata(ROUTES_KEY, target) || [];

    // Add helper method to get base path from instance
    target.prototype.getBasePath = (): PathSegment => basePath;

    return target;
  };
}

// ============================================================================
// Method Decorator Factory
// ============================================================================

/**
 * Internal route metadata stored during decoration.
 */
interface RouteMetadata {
  path: PathSegment;
  method: HTTPMethod;
  propertyKey: string;
  handler: Function;
}

function createMethodDecorator(method: HTTPMethod) {
  return (path: PathSegment = '/') =>
    (
      target: object,
      propertyKey: string,
      descriptor: PropertyDescriptor,
    ): PropertyDescriptor => {
      const routes: RouteMetadata[] =
        Reflect.getMetadata(ROUTES_KEY, target.constructor) || [];

      // Store the original method
      const originalMethod = descriptor.value;

      // Replace descriptor value with wrapper that includes route metadata
      descriptor.value = function () {
        const routeConfig = originalMethod.apply(this);

        // Merge decorator metadata with returned route config
        return {
          ...routeConfig,
          path: path,
          method: method,
          propertyKey,
        };
      };

      // Preserve function name for debugging
      Object.defineProperty(descriptor.value, 'name', {
        value: propertyKey,
        writable: false,
      });

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
 * Get the base path for a router class.
 *
 * @param target - The router class (constructor function)
 * @returns The base path or undefined if not decorated with @Router
 *
 * @example
 * ```typescript
 * @Router('/users')
 * class UserRouter {}
 *
 * getBasePath(UserRouter); // '/users'
 * ```
 */
export function getBasePath(target: Function): PathSegment | undefined {
  return Reflect.getMetadata(BASE_PATH_KEY, target);
}

/**
 * Get all routes defined on a router class.
 *
 * @param target - The router class (constructor function)
 * @returns Array of route metadata
 *
 * @example
 * ```typescript
 * @Router('/users')
 * class UserRouter {
 *   @Get('/') list() { ... }
 *   @Get('/:id') getById() { ... }
 * }
 *
 * getRoutes(UserRouter);
 * // [
 * //   { path: '/', method: 'get', propertyKey: 'list', handler: [Function] },
 * //   { path: '/:id', method: 'get', propertyKey: 'getById', handler: [Function] }
 * // ]
 * ```
 */
export function getRoutes(target: Function): RouteMetadata[] {
  return Reflect.getMetadata(ROUTES_KEY, target) || [];
}

/**
 * Check if a class is decorated with @Router.
 *
 * @param target - The class to check
 * @returns True if the class has the @Router decorator
 */
export function isRouter(target: Function): boolean {
  return Reflect.hasMetadata(BASE_PATH_KEY, target);
}

/**
 * Get all route method names from a router class.
 *
 * @param target - The router class
 * @returns Array of method names that are decorated routes
 */
export function getRouteMethodNames(target: Function): string[] {
  const routes = getRoutes(target);
  return routes.map((r) => r.propertyKey);
}
