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
import { EventEngine } from '../engines/EventEngine';
import { MiddlewareEngine } from '../engines/MiddlewareEngine';
import { PluginEngine } from '../engines/PluginEngine';
import { RouterManager } from '../engines/RouterManager';
import type { ServerEvent, ServerStatusType } from '../types/events';
import type { MiddlewareCategory } from '../types/middleware';
import type { MagikPlugin } from '../types/plugins';
import type { PathSegment } from '../types/routes';
import type { IMagikServer, MagikServerConfig } from '../types/server';
import type { IMagikDatabaseAdapter, MagikDatabaseConfig } from '../types/database';
import type { AuthConfig } from '../types/auth';
import { discoverRoutes } from './discoverRoutes';

const magikEventEmitter = new EventEmitter();

/**
 * MagikServer is the main server class that orchestrates all components.
 * 
 * It provides:
 * - Express application setup
 * - Plugin management
 * - Middleware engine with config-based auth
 * - Route management with auto-discovery
 * - Event system for lifecycle hooks
 * - Optional database connection via adapter pattern
 * 
 * @typeParam TServerName - String literal type for the server name
 * @typeParam TAuthTypes - String literal union of auth type names
 * @typeParam TConnection - Database connection type
 * @typeParam TServices - Database service names
 * 
 * @example
 * ```typescript
 * // Minimal setup
 * const server = await MagikServer.init({ name: 'my-api' });
 * 
 * // Full setup with database and auth
 * const server = await MagikServer.init({
 *   name: 'my-api',
 *   port: 3000,
 *   database: {
 *     adapter: new MongooseAdapter(),
 *     primaryService: 'main',
 *     connectionOptions: { uri: process.env.MONGO_URI! },
 *   },
 *   auth: {
 *     handlers: {
 *       ensureAuthenticated: myAuthMiddleware,
 *       ensureAdmin: myAdminMiddleware,
 *     },
 *   },
 *   plugins: [
 *     new ErrorHandlingPlugin(),
 *     new GracefulShutdownPlugin(),
 *   ],
 * });
 * ```
 */
export class MagikServer<
  TServerName extends string = string,
  TAuthTypes extends string = string,
  TConnection = unknown,
  TServices extends string = string,
> implements IMagikServer<TServerName, TConnection, TServices> {

  // ========== Public Properties ==========
  public readonly name: TServerName;
  public readonly app: Express;
  public readonly server: Server<typeof IncomingMessage, typeof ServerResponse>;
  public readonly port: number;
  public status: ServerStatusType = 'OFFLINE';
  public readonly DEBUG: boolean;

  // ========== Engines ==========
  
  public readonly routerManager: RouterManager;
  public readonly middlewareEngine: MiddlewareEngine;
  public readonly eventEngine: EventEngine;

  // ========== Private ==========
  
  private readonly pluginEngine: PluginEngine;
  private readonly pluginRegistry = new Map<string, MagikPlugin>();
  private readonly mode: 'development' | 'production';
  private readonly config: MagikServerConfig<TServerName, TAuthTypes, TConnection, TServices>;
  
  // ========== Database ==========
  
  private readonly databaseConfig?: MagikDatabaseConfig<TConnection, TServices>;
  private databaseAdapter?: IMagikDatabaseAdapter<TConnection, TServices>;
  private primaryServiceName?: TServices;

  protected eventEmitter = magikEventEmitter;

  // ========== Getters ==========

  public get DevMode(): boolean {
    return this.mode === 'development';
  }

  /**
   * Database adapter instance (if configured).
   */
  public get db(): IMagikDatabaseAdapter<TConnection, TServices> | undefined {
    return this.databaseAdapter;
  }

  /**
   * Primary database connection (if configured).
   */
  public get primaryConnection(): TConnection | undefined {
    if (!this.databaseAdapter || !this.primaryServiceName) return undefined;
    return this.databaseAdapter.getConnection(this.primaryServiceName);
  }

  // ========== Static Initializer ==========

  /**
   * Initialize a new MagikServer.
   * 
   * This is the recommended way to create a server instance.
   * It handles all setup including database connection and returns
   * a ready-to-use server.
   * 
   * @param config - Server configuration
   * @returns Promise resolving to the initialized server
   */
  static async init<
    ServerName extends string = string,
    AuthTypes extends string = string,
    Connection = unknown,
    Services extends string = string,
  >(
    config: MagikServerConfig<ServerName, AuthTypes, Connection, Services>,
  ): Promise<MagikServer<ServerName, AuthTypes, Connection, Services>> {
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

  // ========== Constructor ==========

  private constructor(config: MagikServerConfig<TServerName, TAuthTypes, TConnection, TServices>) {
    this.config = config;
    this.name = config.name;
    this.port = this.normalizePort(config.port ?? process.env.PORT ?? '5000');
    this.DEBUG = config.debug ?? process.env.DEBUG === 'true';
    this.mode = config.mode ?? (process.env.NODE_ENV as 'development' | 'production') ?? 'development';

    // Store database config
    this.databaseConfig = config.database;
    if (config.database) {
      this.databaseAdapter = config.database.adapter as IMagikDatabaseAdapter<TConnection, TServices>;
      this.primaryServiceName = config.database.primaryService;
    }

    // Create Express app
    this.app = express();

    // Create HTTP server
    this.server = createServer(this.app);

    // Initialize engines with auth config
    this.middlewareEngine = new MiddlewareEngine(this.app, this.DEBUG, config.auth);
    this.eventEngine = new EventEngine(this.DEBUG);
    this.pluginEngine = new PluginEngine(this);
    this.routerManager = new RouterManager(this);
  }

  // ========== Initialization ==========

  private async initialize() {
    try {
      this.status = 'STARTING';
      this.DEBUG && consola.start('[MagikServer] Starting initialization');

      // Setup event system
      await this.setupEventSystem();
      this.DEBUG && consola.success('[MagikServer] Event system ready');

      // Connect to database (if configured)
      await this.connectDatabase(); // --- IGNORE ---
      // DONT THINK THIS IS THE CORRECT PLACE?

      // Apply middleware
      this.setupMiddleware('security');
      this.DEBUG && consola.success('[MagikServer] Security middleware applied');

      this.setupMiddleware('parser');
      this.DEBUG && consola.success('[MagikServer] Parser middleware applied');

      // Install initial plugins from config (This also is not when we traditionally load the plugins?)
      if (this.config.plugins?.length) {
        for (const plugin of this.config.plugins) {
          await this.use(plugin);
        }
      }

      // Discover and register routes (unless disabled)
      if (!this.config.disableRouteDiscovery) {
        await this.addRoutes();
      }

      // Start server
      await this.startServer();
      this.DEBUG && consola.success('[MagikServer] Server started');

      // Setup server event listeners
      this.addServerEventListeners();

      // Listen for connections
      this.listenToServer();

      consola.info(`Server running in ${this.mode} mode`);
    } catch (error) {
      this.status = 'ERROR';
      consola.error('[MagikServer:Initialize]', error);
      throw error;
    }
  }

  // ========== Database ==========

  /**
   * Connect to database using the configured adapter.
   */
  private async connectDatabase(): Promise<void> {
    if (!this.databaseConfig || !this.databaseAdapter) {
      this.DEBUG && consola.info('[MagikServer] No database configured, skipping');
      return;
    }

    const { autoConnect = true, primaryService, connectionOptions } = this.databaseConfig;

    if (!autoConnect) {
      this.DEBUG && consola.info('[MagikServer] Database autoConnect disabled, skipping');
      return;
    }

    if (!connectionOptions?.uri) {
      this.DEBUG && consola.warn('[MagikServer] No connection URI provided, skipping database connection');
      return;
    }

    try {
      this.DEBUG && consola.start(`[MagikServer] Connecting to database (${primaryService})...`);

      const result = await this.databaseAdapter.connect({
        ...connectionOptions,
        serviceName: primaryService,
        hooks: {
          onConnected: () => {
            consola.success(`[MagikServer] Database connected (${primaryService})`);
          },
          onDisconnected: () => {
            consola.info(`[MagikServer] Database disconnected (${primaryService})`);
          },
          onError: (error) => {
            consola.error(`[MagikServer] Database error (${primaryService}):`, error);
          },
        },
      });

      this.DEBUG && consola.success(`[MagikServer] Database connected: ${result.state}`);
    } catch (error) {
      consola.error('[MagikServer] Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Disconnect from database.
   */
  private async disconnectDatabase(): Promise<void> {
    if (!this.databaseAdapter) return;

    const { autoDisconnect = true } = this.databaseConfig ?? {};
    if (!autoDisconnect) return;

    try {
      this.DEBUG && consola.start('[MagikServer] Disconnecting from database...');
      await this.databaseAdapter.disconnectAll();
      this.DEBUG && consola.success('[MagikServer] Database disconnected');
    } catch (error) {
      consola.error('[MagikServer] Error disconnecting from database:', error);
    }
  }

  // ========== Plugin Management ==========

  /**
   * Install a plugin.
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

  // ========== Middleware ==========

  private setupMiddleware(category: MiddlewareCategory): this {
    this.middlewareEngine.applyCategory(category);
    return this;
  }

  // ========== Event System ==========

  private async setupEventSystem() {
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

  // ========== Routes ==========

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
      const routeDefinitions = await discoverRoutes(
        this.DEBUG,
        this.config.routesDir,
      );

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


  // ========== Server Lifecycle ==========

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
    const host = this.config.host ?? '0.0.0.0';
    
    this.server.listen(this.port, host, async () => {
      this.prettyLog();
      await this.eventEngine.emitAsync('afterStart');
    });
  }

  /**
   * Gracefully shutdown the server.
   */
  async shutdownServer(): Promise<void> {
    if (this.status === 'SHUTTING_DOWN') return;
    
    this.status = 'SHUTTING_DOWN';
    consola.info('[MagikServer] Shutting down...');

    try {
      // Emit beforeStop event
      await this.eventEngine.emitAsync('beforeStop');

      // Close HTTP server
      await new Promise<void>((resolve, reject) => {
        this.server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Disconnect database
      await this.disconnectDatabase();

      // Emit afterStop event
      await this.eventEngine.emitAsync('afterStop');

      this.status = 'OFFLINE';
      consola.success('[MagikServer] Shutdown complete');
    } catch (error) {
      consola.error('[MagikServer] Error during shutdown:', error);
      throw error;
    }
  }

  // ========== Utilities ==========

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
    
    if (this.databaseAdapter && this.primaryServiceName) {
      const dbConnected = this.databaseAdapter.isConnected(this.primaryServiceName);
      consola.info(`Database: ${dbConnected ? '✅ Connected' : '❌ Not connected'}`);
    }
  }

  private normalizePort(val: string | number): number {
    const port = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(port)) return 5000;
    if (port >= 0) return port;
    return 5000;
  }
}
