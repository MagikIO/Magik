import type { ServerEvent } from './events';
import type { MiddlewareConfig } from './middleware';
import type { PathSegment, RouteDefinition } from './routes';
import type { IMagikServer } from './server';

// ============================================================================
// Plugin Configuration
// ============================================================================

export interface MagikPluginConfig {
  /** Unique name for this plugin */
  name: string;
  /** Semantic version string */
  version: string;
  /** Other plugin names this plugin depends on */
  pluginDependencies?: string[];
  /** Middleware names that must be registered before this plugin */
  requiredMiddleware?: string[];
  /** Additional plugin-specific options */
  options?: Record<string, unknown>;
}

// ============================================================================
// Plugin Route Map
// ============================================================================

export interface PluginRouteMap {
  [prefix: PathSegment]: Array<RouteDefinition>;
}

// ============================================================================
// Plugin Interface
// ============================================================================

export interface MagikPlugin {
  /** Plugin configuration */
  config: MagikPluginConfig;

  /** Event handlers for server events */
  onEvent?: {
    [K in ServerEvent]?: (server: IMagikServer) => Promise<void> | void;
  };

  // ========== Lifecycle Hooks ==========

  /** Called when the plugin is installed */
  onInstall?: (server: IMagikServer) => Promise<void> | void;

  /** Called when the plugin is uninstalled */
  onUninstall?: (server: IMagikServer) => Promise<void> | void;

  // ========== Server Hooks ==========

  /** Called before the server starts */
  beforeStart?: (server: IMagikServer) => Promise<void> | void;

  /** Called after the server starts */
  afterStart?: (server: IMagikServer) => Promise<void> | void;

  /** Called before the server shuts down */
  beforeShutdown?: (server: IMagikServer) => Promise<void> | void;

  // ========== Extension Points ==========

  /** Register middleware configurations */
  registerMiddleware?: () => MiddlewareConfig[];

  /** Register route definitions grouped by prefix */
  registerRoutes?: () => PluginRouteMap;

  /** Register event handlers */
  registerEvents?: () => Record<string, (...args: unknown[]) => void>;
}
