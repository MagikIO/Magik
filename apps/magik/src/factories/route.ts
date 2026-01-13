import type { z } from 'zod';
import type { PathSegment, TypedRouteConfig } from '../types/routes';

/**
 * Factory function to create a typed route configuration
 *
 * This is the recommended way to define routes in Magik. It provides:
 * - Full TypeScript inference for request body based on schema
 * - Type-safe auth configuration
 * - Clean, declarative route definitions
 *
 * @param config - The route configuration
 * @returns The route configuration (passthrough for type inference)
 *
 * @example
 * ```typescript
 * import { createRoute } from '@anandamide/magik/factories';
 * import { z } from 'zod';
 *
 * @Router('/users')
 * export default class UserRouter {
 *   @Post('/')
 *   public createUser() {
 *     return createRoute({
 *       auth: 'ensureAuthenticated',
 *       schema: z.object({
 *         email: z.string().email(),
 *         name: z.string().min(2),
 *       }),
 *       handler: async (req, res) => {
 *         // req.body is typed as { email: string; name: string }
 *         const user = await UserService.create(req.body);
 *         res.status(201).json(user);
 *       },
 *     });
 *   }
 *
 *   @Get('/:id')
 *   public getUser() {
 *     return createRoute({
 *       handler: async (req, res) => {
 *         const user = await UserService.findById(req.params.id);
 *         res.json(user);
 *       },
 *     });
 *   }
 * }
 * ```
 */
export function createRoute<
  TSchema extends z.ZodSchema | undefined = undefined,
  TPath extends PathSegment = PathSegment,
>(config: TypedRouteConfig<TSchema, TPath>): TypedRouteConfig<TSchema, TPath> {
  return config;
}
