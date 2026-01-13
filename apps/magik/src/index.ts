// Core
export { MagikServer } from './core/MagikServer';
export { discoverRoutes } from './core/discoverRoutes';

// Decorators
export {
  Router,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  getRoutes,
  getBasePath,
} from './decorators/route';

// Factories
export { createRoute } from './factories/route';

// Engines
export {
  EventEngine,
  MiddlewareEngine,
  PluginEngine,
  RouteEngine,
  RouterManager,
} from './engines';

// Plugins
export {
  DebugPlugin,
  ErrorHandlingPlugin,
  GracefulShutdownPlugin,
  RateLimiterPlugin,
} from './plugins';

// Presets
export { allPresets, parserPreset, securityPreset } from './presets';

// Auth Helpers
export {
  createRoleMiddleware,
  createAllRolesMiddleware,
  createPermissionMiddleware,
  createAllPermissionsMiddleware,
  createAuthenticatedMiddleware,
  createTwoFactorMiddleware,
  createRoleHandlerFactory,
  createPermissionHandlerFactory,
  createAuthWithRolesMiddleware,
} from './helpers/auth';

export type { AuthMiddlewareOptions } from './helpers/auth';

// Types
export type {
  // Routes
  PathSegment,
  HTTPMethod,
  ValidationSchema,
  MagikRequest,
  MagikGetRequest,
  MagikRouteFn,
  MagikGetRouteFn,
  UploadConfig,
  RouteDefinition,
  TypedRouteConfig,
  RouteConfig,
  // Middleware
  MiddlewareCategory,
  AuthTypes,
  AuthMiddlewareMap,
  MiddlewareFn,
  MiddlewareConfig,
  MiddlewarePreset,
  // Events
  ServerEvent,
  ServerStatus,
  ServerStatusType,
  EventHandler,
  EventHandlerMap,
  // Plugins
  MagikPluginConfig,
  PluginRouteMap,
  MagikPlugin,
  // Server
  MagikServerConfig,
  IMagikServer,
  // Engines
  IMiddlewareEngine,
  IRouteEngine,
  IPluginEngine,
  IEventEngine,
  // Database
  ConnectionState,
  ConnectionOptions,
  ConnectionHooks,
  ConnectionResult,
  IMagikDatabaseAdapter,
  MagikDatabaseConfig,
  InferConnection,
  InferServices,
  // Repository
  QueryOptions,
  PopulateOptions,
  IRepository,
  IRepositoryRegistry,
  IRepositoryFactory,
  IExtendedRepository,
  RepositoryConfig,
  InferEntity,
  InferId,
  // User Adapter
  IUserAdapter,
  SimpleUser,
  InferUser,
  // Auth
  AuthConfig,
  ExtractAuthTypes,
} from './types';

// Re-export utilities from types
export {
  isDatabaseAdapter,
  isRoleArray,
  createPlaceholderAuth,
  createPassthroughAuth,
  createDenyAuth,
  GenericUserAdapter,
  SimpleUserAdapter,
  isUserAdapter,
  createUserAdapter,
} from './types';
