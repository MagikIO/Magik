// Routes
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
} from './routes';

// Middleware
export type {
  MiddlewareCategory,
  AuthTypes,
  AuthMiddlewareMap,
  MiddlewareFn,
  MiddlewareConfig,
  MiddlewarePreset,
} from './middleware';

// Events
export type {
  ServerEvent,
  ServerStatus,
  ServerStatusType,
  EventHandler,
  EventHandlerMap,
} from './events';

// Plugins
export type {
  MagikPluginConfig,
  PluginRouteMap,
  MagikPlugin,
} from './plugins';

// Server
export type { ServerConfig, IMagikServer } from './server';

// Engines
export type {
  IMiddlewareEngine,
  IRouteEngine,
  IPluginEngine,
  IEventEngine,
} from './engines';
