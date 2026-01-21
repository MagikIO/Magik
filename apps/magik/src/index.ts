// Types
export type {
  // Auth
  AuthConfig,
  AuthMiddlewareMap,
  AuthTypes,
  ConnectionHooks,
  ConnectionOptions,
  ConnectionResult,
  // Database
  ConnectionState,
  EventHandler,
  EventHandlerMap,
  ExtractAuthTypes,
  HTTPMethod,
  IEventEngine,
  IExtendedRepository,
  IMagikDatabaseAdapter,
  IMagikServer,
  // Engines
  IMiddlewareEngine,
  InferConnection,
  InferEntity,
  InferId,
  InferServices,
  InferUser,
  IPluginEngine,
  IRepository,
  IRepositoryFactory,
  IRepositoryRegistry,
  IRouteEngine,
  // User Adapter
  IUserAdapter,
  MagikDatabaseConfig,
  MagikGetRequest,
  MagikGetRouteFn,
  MagikPlugin,
  // Plugins
  MagikPluginConfig,
  MagikRequest,
  MagikRouteFn,
  // Server
  MagikServerConfig,
  // Middleware
  MiddlewareCategory,
  MiddlewareConfig,
  MiddlewareFn,
  MiddlewarePreset,
  // Routes
  PathSegment,
  PluginRouteMap,
  PopulateOptions,
  // Repository
  QueryOptions,
  RepositoryConfig,
  RouteConfig,
  RouteDefinition,
  // Events
  ServerEvent,
  ServerStatus,
  ServerStatusType,
  SimpleUser,
  TypedRouteConfig,
  UploadConfig,
  ValidationSchema,
} from '@magik_io/magik-types';
// Re-export utilities from types
export {
  createDenyAuth,
  createPassthroughAuth,
  createPlaceholderAuth,
  createUserAdapter,
  GenericUserAdapter,
  isDatabaseAdapter,
  isRoleArray,
  isUserAdapter,
  SimpleUserAdapter,
} from '@magik_io/magik-types';
export { discoverRoutes } from './core/discoverRoutes.js';
export { MagikServer } from './core/MagikServer.js';
// Decorators
export {
  Delete,
  Get,
  getBasePath,
  getRoutes,
  Patch,
  Post,
  Put,
  Router,
} from './decorators/route.js';
// Engines
export {
  EventEngine,
  MiddlewareEngine,
  PluginEngine,
  RouteEngine,
  RouterManager,
} from './engines/index.js';
// Factories
export { createRoute } from './factories/route.js';
export type { AuthMiddlewareOptions } from './helpers/auth.js';
// Auth Helpers
export {
  createAllPermissionsMiddleware,
  createAllRolesMiddleware,
  createAuthenticatedMiddleware,
  createAuthWithRolesMiddleware,
  createPermissionHandlerFactory,
  createPermissionMiddleware,
  createRoleHandlerFactory,
  createRoleMiddleware,
  createTwoFactorMiddleware,
} from './helpers/auth.js';
// Plugins
export {
  DebugPlugin,
  ErrorHandlingPlugin,
  GracefulShutdownPlugin,
  RateLimiterPlugin,
} from './plugins/index.js';
