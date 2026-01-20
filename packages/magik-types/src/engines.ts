import type { RequestHandler } from 'express';
import type { HTTPMethod } from './index.js';
import type { AuthTypes, MiddlewareConfig } from './middleware.js';
import type { MagikPlugin, PluginRouteMap } from './plugins.js';
import type { RouteDefinition } from './routes.js';

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
// Route Manager Interface
// ============================================================================

export interface IRouterManager {
  routes: Map<`/${string}`, IRouteEngine>;

  /**
   * Register a new prefix and get its RouteEngine
   *
   * If a RouteEngine already exists for the prefix, returns the existing one.
   *
   * @param prefix - The route prefix (e.g., '/users')
   * @returns The RouteEngine for this prefix
   */
  register(prefix: `/${string}`): IRouteEngine;

  /**
   * Get an existing RouteEngine by prefix
   *
   * @param prefix - The route prefix
   * @returns The RouteEngine or undefined if not found
   */
  getRoute(prefix: `/${string}`): IRouteEngine | undefined;

  /**
   * Get the total route count and count by prefix
   *
   * @returns Object with total count and breakdown by prefix
   */
  getRouteCount(): { total: number; byPrefix: Record<string, number> };

  /**
   * Get route count grouped by HTTP method
   *
   * @returns Object with count per HTTP method
   */
  getRouteCountByMethod(): Record<HTTPMethod, number>;

  /**
   * Install all registered routes to the Express app
   *
   * This should be called after all routes are registered.
   */
  installRoutes(): void;
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
