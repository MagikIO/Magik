// ============================================================================
// Auth Types
// ============================================================================
export type {
  AuthConfig,
  AuthMiddlewareMap,
  AuthTypes,
  DefaultAuthTypes,
  ExtractAuthTypes,
} from './auth.js';

export {
  createDenyAuth,
  createPassthroughAuth,
  createPlaceholderAuth,
  isRoleArray,
} from './auth.js';

// ============================================================================
// Database Types
// ============================================================================
export type {
  ConnectionHooks,
  ConnectionOptions,
  ConnectionResult,
  ConnectionState,
  IMagikDatabaseAdapter,
  InferConnection,
  InferServices,
  MagikDatabaseConfig,
} from './database.js';

export { isDatabaseAdapter } from './database.js';
// ============================================================================
// Engine Types
// ============================================================================
export type {
  IEventEngine,
  IMiddlewareEngine,
  IPluginEngine,
  IRouteEngine,
  IRouterManager
} from './engines.js';
// ============================================================================
// Event Types
// ============================================================================
export type {
  EventHandler,
  EventHandlerMap,
  ServerEvent,
  ServerEventMap,
  ServerStatus,
  ServerStatusType,
} from './events.js';
// ============================================================================
// Middleware Types
// ============================================================================
export type {
  AuthMiddlewareMap as LegacyAuthMiddlewareMap,
  MagikErrorHandler,
  MagikMiddleware,
  MiddlewareCategory,
  MiddlewareConfig,
  MiddlewareFn,
  MiddlewarePreset,
} from './middleware.js';
// ============================================================================
// Plugin Types
// ============================================================================
export type {
  MagikPlugin,
  MagikPluginConfig,
  PluginRouteMap,
} from './plugins.js';
// ============================================================================
// Repository Types
// ============================================================================
export type {
  IExtendedRepository,
  InferEntity,
  InferId,
  IRepository,
  IRepositoryFactory,
  IRepositoryRegistry,
  PopulateOptions,
  QueryOptions,
  RepositoryConfig,
} from './repository.js';
// ============================================================================
// Route Types
// ============================================================================
export type {
  HTTPMethod,
  MagikGetRequest,
  MagikGetRouteFn,
  MagikRequest,
  MagikRouteFn,
  PathSegment,
  RouteConfig,
  RouteDefinition,
  RouteDiscoveryConfig,
  TypedRouteConfig,
  UploadConfig,
  ValidationSchema,
} from './routes.js';
// ============================================================================
// Server Types
// ============================================================================
export type {
  IMagikServer,
  InferAuthTypes,
  InferDbConnection,
  InferDbServices,
  MagikServerConfig,
  ServerStatus as ServerStatusEnum,
} from './server.js';
// ============================================================================
// User Adapter Types
// ============================================================================
export type {
  InferUser,
  IUserAdapter,
  SimpleUser,
} from './user-adapter.js';
export {
  createUserAdapter,
  GenericUserAdapter,
  isUserAdapter,
  SimpleUserAdapter,
} from './user-adapter.js';
