// ============================================================================
// Auth Types
// ============================================================================
export type {
  AuthConfig,
  ExtractAuthTypes,
  AuthTypes,
  DefaultAuthTypes,
  AuthMiddlewareMap,
} from './auth';

export {
  isRoleArray,
  createPlaceholderAuth,
  createPassthroughAuth,
  createDenyAuth,
} from './auth';

// ============================================================================
// Database Types
// ============================================================================
export type {
  ConnectionState,
  ConnectionOptions,
  ConnectionHooks,
  ConnectionResult,
  IMagikDatabaseAdapter,
  MagikDatabaseConfig,
  InferConnection,
  InferServices,
} from './database';

export { isDatabaseAdapter } from './database';

// ============================================================================
// Engine Types
// ============================================================================
export type {
  IMiddlewareEngine,
  IRouteEngine,
  IPluginEngine,
  IEventEngine,
} from './engines';

// ============================================================================
// Event Types
// ============================================================================
export type {
  ServerEvent,
  ServerStatus,
  ServerStatusType,
  EventHandler,
  EventHandlerMap,
} from './events';

// ============================================================================
// Middleware Types
// ============================================================================
export type {
  MagikMiddleware,
  MagikErrorHandler,
  MiddlewareCategory,
  AuthMiddlewareMap as LegacyAuthMiddlewareMap,
  MiddlewareFn,
  MiddlewareConfig,
  MiddlewarePreset,
} from './middleware';

// ============================================================================
// Plugin Types
// ============================================================================
export type {
  MagikPluginConfig,
  PluginRouteMap,
  MagikPlugin,
} from './plugins';

// ============================================================================
// Route Types
// ============================================================================
export type {
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
  RouteDiscoveryConfig,
} from './routes';

// ============================================================================
// Server Types
// ============================================================================
export type {
  ServerStatus as ServerStatusEnum,
  MagikServerConfig,
  IMagikServer,
  InferAuthTypes,
  InferDbConnection,
  InferDbServices,
} from './server';
