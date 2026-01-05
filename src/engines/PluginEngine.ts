import consola from 'consola';
import type { IPluginEngine } from '../types/engines';
import type { ServerEvent } from '../types/events';
import type { MagikPlugin, PluginRouteMap } from '../types/plugins';
import type { PathSegment } from '../types/routes';
import type { IMagikServer } from '../types/server';

/**
 * PluginEngine manages plugin loading, dependencies, and lifecycle
 *
 * Plugins extend Magik's functionality by:
 * - Adding middleware
 * - Registering routes
 * - Hooking into lifecycle events
 * - Providing custom functionality
 *
 * The engine handles:
 * - Dependency resolution between plugins
 * - Middleware requirement verification
 * - Plugin lifecycle (install, start, shutdown)
 *
 * @example
 * ```typescript
 * const pluginEngine = new PluginEngine(server);
 *
 * await pluginEngine.loadPlugin({
 *   config: { name: 'my-plugin', version: '1.0.0' },
 *   onInstall: (server) => console.log('Installed!'),
 *   registerRoutes: () => ({
 *     '/my-plugin': [
 *       { path: '/status', method: 'get', handler: (req, res) => res.json({ ok: true }) }
 *     ]
 *   }),
 * });
 * ```
 */
export class PluginEngine implements IPluginEngine {
  private plugins = new Map<string, MagikPlugin>();
  private loadedPlugins = new Set<string>();

  constructor(private server: IMagikServer) {}

  /**
   * Load and initialize a plugin
   *
   * This handles:
   * - Checking plugin dependencies
   * - Verifying required middleware exists
   * - Registering plugin routes
   * - Setting up event handlers
   * - Calling the plugin's onInstall hook
   *
   * @param plugin - The plugin to load
   */
  async loadPlugin(plugin: MagikPlugin): Promise<void> {
    const {
      name,
      pluginDependencies = [],
      requiredMiddleware = [],
    } = plugin.config;

    this.server.DEBUG &&
      consola.start(`[PluginEngine] Loading plugin: ${name}`);

    // Check dependencies
    for (const dep of pluginDependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(
          `[PluginEngine] Plugin ${name} depends on plugin ${dep} which is not installed`,
        );
      }
      if (!this.loadedPlugins.has(dep)) {
        await this.loadPlugin(this.plugins.get(dep)!);
      }
    }

    // Check required middleware
    for (const middleware of requiredMiddleware) {
      if (!this.server.middlewareEngine.hasMiddleware(middleware)) {
        throw new Error(
          `[PluginEngine] Plugin ${name} requires middleware ${middleware} which is not registered`,
        );
      }
    }

    // Register routes if provided
    if (plugin.registerRoutes) {
      this.registerPluginRoutes(plugin.registerRoutes());
    }

    // Register event handlers if provided
    if (plugin.onEvent) {
      Object.entries(plugin.onEvent).forEach(([event, handler]) => {
        if (handler) {
          this.server.eventEngine.on(event as ServerEvent, () =>
            handler(this.server),
          );
        }
      });
    }

    // Install plugin
    if (!this.loadedPlugins.has(name)) {
      await plugin.onInstall?.(this.server);
      this.plugins.set(name, plugin);
      this.loadedPlugins.add(name);

      this.server.DEBUG &&
        consola.success(`[PluginEngine] Plugin ${name} loaded successfully`);
    }
  }

  /**
   * Register routes from a plugin route map
   *
   * @param routes - The route map from the plugin
   */
  registerPluginRoutes(routes: PluginRouteMap): void {
    for (const [prefix, definitions] of Object.entries(routes)) {
      // Get or create route engine for prefix
      const engine = this.server.routerManager.register(prefix as PathSegment);

      // Register each route
      for (const routeDef of definitions) {
        engine.route(routeDef);
      }

      this.server.DEBUG &&
        consola.info(
          `[PluginEngine] Registered ${definitions.length} route(s) at ${prefix}`,
        );
    }
  }

  /**
   * Get a loaded plugin by name
   *
   * @param name - The plugin name
   * @returns The plugin or undefined if not found
   */
  getPlugin(name: string): MagikPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if a plugin is loaded
   *
   * @param name - The plugin name
   * @returns true if the plugin is loaded
   */
  hasPlugin(name: string): boolean {
    return this.loadedPlugins.has(name);
  }

  /**
   * Get all loaded plugin names
   *
   * @returns Array of plugin names
   */
  getLoadedPlugins(): string[] {
    return Array.from(this.loadedPlugins);
  }
}
