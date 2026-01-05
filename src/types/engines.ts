import type { RequestHandler } from 'express';
import type { AuthTypes, MiddlewareConfig } from './middleware';
import type { MagikPlugin, PluginRouteMap } from './plugins';
import type { RouteDefinition } from './routes';

// ============================================================================
// Middleware Engine Interface
// ============================================================================

export interface IMiddlewareEngine {
  /**
   * Register a middleware configuration
   * @param middleware - The middleware config to register
   */
  register(middleware: MiddlewareConfig): this;

  /**
   * Enable a middleware by name
   * @param name - The middleware name to enable
   */
  enable(name: string): this;

  /**
   * Get the auth middleware handler for the given auth type
   * @param auth - The auth type
   */
  getAuthMiddleware(auth: AuthTypes): RequestHandler;

  /**
   * Check if a middleware is registered
   * @param name - The middleware name to check
   */
  hasMiddleware(name: string): boolean;
}

// ============================================================================
// Route Engine Interface
// ============================================================================

export interface IRouteEngine {
  /**
   * Get the Express router
   */
  getRouter(): unknown;

  /**
   * Register a route definition
   * @param config - The route definition
   */
  route<T>(config: RouteDefinition<T>): this;

  /**
   * Get the total number of routes registered
   */
  getRouteCount(): number;
}

// ============================================================================
// Plugin Engine Interface
// ============================================================================

export interface IPluginEngine {
  /**
   * Load and initialize a plugin
   * @param plugin - The plugin to load
   */
  loadPlugin(plugin: MagikPlugin): Promise<void>;

  /**
   * Register routes from a plugin route map
   * @param routes - The route map from the plugin
   */
  registerPluginRoutes(routes: PluginRouteMap): void;
}

// ============================================================================
// Event Engine Interface
// ============================================================================

export interface IEventEngine {
  /**
   * Emit an event synchronously
   * @param event - The event name
   * @param args - Arguments to pass to handlers
   */
  emit(event: string, ...args: unknown[]): boolean;

  /**
   * Emit an event asynchronously
   * @param event - The event name
   * @param args - Arguments to pass to handlers
   */
  emitAsync(event: string, ...args: unknown[]): Promise<void>;

  /**
   * Register an event handler
   * @param event - The event name
   * @param listener - The handler function
   */
  on(event: string, listener: (...args: unknown[]) => void): this;
}
