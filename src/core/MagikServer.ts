import consola from 'consola';
import express, { type Express } from 'express';
import gradient from 'gradient-string';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'http';
import { EventEmitter } from 'events';
import { EventEngine } from './engines/EventEngine';
import { MiddlewareEngine } from './engines/MiddlewareEngine';
import { PluginEngine } from './engines/PluginEngine';
import { RouterManager } from './engines/RouterManager';
import type { ServerEvent, ServerStatusType } from './types/events';
import type { MiddlewareCategory } from './types/middleware';
import type { MagikPlugin } from './types/plugins';
import type { PathSegment } from './types/routes';
import type { IMagikServer, ServerConfig } from './types/server';
import { discoverRoutes } from './core/discoverRoutes';

const magikEventEmitter = new EventEmitter();

/**
 * MagikServer is the main server class that orchestrates all components
 *
 * It provides:
 * - Express application setup
 * - Plugin management
 * - Middleware engine
 * - Route management
 * - Event system
 * - Lifecycle hooks
 *
 * @example
 * ```typescript
 * import { MagikServer } from '@anandamide/magik';
 *
 * const server = await MagikServer.init({
 *   name: 'my-api',
 *   port: 3000,
 *   debug: true,
 * });
 *
 * // Install plugins
 * await server.use(new ErrorHandlingPlugin());
 * await server.use(new GracefulShutdownPlugin());
 *
 * console.log(`Server running on port ${server.port}`);
 * ```
 */
export class MagikServer<ServerName extends string = string>
  implements IMagikServer<ServerName>
{
  public readonly name: ServerName;
  public readonly app: Express;
  public readonly server: Server<typeof IncomingMessage, typeof ServerResponse>;
  public readonly port: number;
  public status: ServerStatusType = 'OFFLINE';
  public DEBUG: boolean;

  public readonly routerManager: RouterManager;
  public readonly middlewareEngine: MiddlewareEngine;
  public readonly eventEngine: EventEngine;
  private readonly pluginEngine: PluginEngine;
  private readonly pluginRegistry = new Map<string, MagikPlugin>();

  private mode: 'development' | 'production';

  public get DevMode(): boolean {
    return this.mode === 'development';
  }

  protected eventEmitter = magikEventEmitter;

  /**
   * Initialize a new MagikServer
   *
   * This is the recommended way to create a server instance.
   * It handles all setup and returns a ready-to-use server.
   *
   * @param config - Server configuration
   * @returns Promise resolving to the initialized server
   */
  static async init<N extends string = string>(
    config: ServerConfig & { name: N },
  ): Promise<MagikServer<N>> {
    try {
      consola.start(`\n🪄 Initializing ${config.name}...`);

      const server = new MagikServer(config);
      await server.initialize();

      return server;
    } catch (error) {
      consola.error('[MagikServer:Init]', error);
      throw error;
    }
  }

  private constructor(config: ServerConfig & { name: ServerName }) {
    this.name = config.name;
    this.port = this.normalizePort(config.port ?? process.env.PORT ?? '5000');
    this.DEBUG = config.debug ?? process.env.DEBUG === 'true';
    this.mode = config.mode ?? (process.env.NODE_ENV as 'development' | 'production') ?? 'development';

    // Create Express app
    this.app = express();

    // Create HTTP server
    this.server = createServer(this.app);

    // Initialize engines
    this.middlewareEngine = new MiddlewareEngine(this.app, this.DEBUG);
    this.eventEngine = new EventEngine(this.DEBUG);
    this.pluginEngine = new PluginEngine(this);
    this.routerManager = new RouterManager(this);
  }

  private async initialize() {
    try {
      this.DEBUG && consola.start('[MagikServer] Starting initialization');

      // Setup event system
      await this.setupEventSystem();
      this.DEBUG && consola.success('[MagikServer] Event system ready');

      // Apply security middleware
      this.setupMiddleware('security');
      this.DEBUG && consola.success('[MagikServer] Security middleware applied');

      // Apply parser middleware
      this.setupMiddleware('parser');
      this.DEBUG && consola.success('[MagikServer] Parser middleware applied');

      // Discover and register routes
      await this.addRoutes();

      // Start server
      await this.startServer();
      this.DEBUG && consola.success('[MagikServer] Server started');

      // Setup server event listeners
      this.addServerEventListeners();

      // Listen for connections
      this.listenToServer();

      consola.info(`Server running in ${this.mode} mode`);
    } catch (error) {
      consola.error('[MagikServer:Initialize]', error);
      throw error;
    }
  }

  /**
   * Install a plugin
   *
   * @param plugin - The plugin to install
   * @returns this for chaining
   */
  async use(plugin: MagikPlugin): Promise<this> {
    this.DEBUG &&
      consola.start(`[MagikServer] Installing plugin: ${plugin.config.name}`);

    const { name, version } = plugin.config;

    if (this.pluginRegistry.has(name)) {
      throw new Error(`Plugin ${name} is already registered`);
    }

    // Load plugin and dependencies
    await this.pluginEngine.loadPlugin(plugin);
    this.pluginRegistry.set(name, plugin);

    // Register middleware if provided
    if (plugin.registerMiddleware) {
      const middleware = plugin.registerMiddleware();
      this.middlewareEngine.registerBulk(middleware);
    }

    // Register events if provided
    if (plugin.registerEvents) {
      const events = plugin.registerEvents();
      Object.entries(events).forEach(([event, handler]) => {
        this.eventEngine.on(event as ServerEvent, handler);
      });
    }

    this.DEBUG && consola.success(`Plugin ${name}@${version} installed`);
    return this;
  }

  private setupMiddleware(category: MiddlewareCategory): this {
    this.middlewareEngine.applyCategory(category);
    return this;
  }

  private async setupEventSystem() {
    // Server lifecycle events
    this.eventEngine
      .on('beforeStart', async () => {
        await Promise.all(
          Array.from(this.pluginRegistry.values())
            .map((plugin) => plugin.beforeStart?.(this))
            .filter(Boolean),
        );
      })
      .on('afterStart', async () => {
        await Promise.all(
          Array.from(this.pluginRegistry.values())
            .map((plugin) => plugin.afterStart?.(this))
            .filter(Boolean),
        );
      })
      .on('beforeStop', async () => {
        await Promise.all(
          Array.from(this.pluginRegistry.values())
            .map((plugin) => plugin.beforeShutdown?.(this))
            .filter(Boolean),
        );
      });

    return this;
  }

  private async addRoutes() {
    try {
      this.DEBUG && consola.start('[MagikServer] Adding routes');

      // Register plugin routes
      for (const plugin of this.pluginRegistry.values()) {
        if (plugin.registerRoutes) {
          const routes = plugin.registerRoutes();
          this.DEBUG &&
            consola.info(
              `[MagikServer] Plugin ${plugin.config.name} provided routes for ${Object.keys(routes).length} prefix(es)`,
            );

          for (const [prefix, definitions] of Object.entries(routes)) {
            const engine = this.routerManager.register(prefix as PathSegment);
            for (const route of definitions) {
              engine.route(route);
            }
          }
        }
      }

      // Discover and register application routes
      const routeDefinitions = await discoverRoutes(this.DEBUG);

      for (const [prefix, routes] of routeDefinitions) {
        const engine = this.routerManager.register(prefix);
        for (const route of routes) {
          engine.route(route);
        }
      }

      // Install all routes to Express
      this.routerManager.installRoutes();

      // Emit routesLoaded event
      await this.eventEngine.emitAsync('routesLoaded');

      if (this.DEBUG) {
        const { total } = this.routerManager.getRouteCount();
        consola.success(`[MagikServer] Total routes registered: ${total}`);
      }

      return this;
    } catch (error) {
      consola.error('[MagikServer:addRoutes]', error);
      throw error;
    }
  }

  private async startServer() {
    await this.eventEngine.emitAsync('beforeStart');
  }

  private addServerEventListeners() {
    this.server.on('error', (error: NodeJS.ErrnoException) => {
      this.eventEngine.handleServerError(error, String(this.port));
    });

    this.server.on('listening', () => {
      this.status = 'ONLINE';
      this.eventEngine.emit('serverListening', this.server.address());
    });
  }

  private listenToServer() {
    this.server.listen(this.port, async () => {
      this.prettyLog();
      await this.eventEngine.emitAsync('afterStart');
    });
  }

  private prettyLog() {
    const cyanToPurple = gradient(['cyan', 'purple']);
    const magikArt = `
    ╔══════════════════════════════════════════╗
    ║                                          ║
    ║   🪄  M A G I K   S E R V E R  🪄        ║
    ║                                          ║
    ╚══════════════════════════════════════════╝
    `;

    console.log(cyanToPurple(magikArt));
    consola.success(`${this.name} is running on port ${this.port}`);
  }

  private normalizePort(val: string | number): number {
    const port = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(port)) return 5000;
    if (port >= 0) return port;
    return 5000;
  }
}
