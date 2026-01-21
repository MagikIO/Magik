import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { Express } from 'express';
import type { IMagikDatabaseAdapter } from './database.js';
import type { IEventEngine, IMiddlewareEngine, IRouterManager } from './engines.js';
import type { ServerStatusType } from './events.js';

// ============================================================================
// Core Server Interface
// ============================================================================

/**
 * Forward declaration for MagikPlugin to avoid circular dependencies.
 * The full type is defined in plugins.ts.
 */
export interface MagikPluginBase {
  config: {
    name: string;
    version: string;
  };
}

/**
 * Interface for a running MagikServer instance.
 *
 * This interface is defined in core.ts to break the circular dependency
 * between server.ts and plugins.ts.
 *
 * @typeParam TServerName - String literal type for the server name
 * @typeParam TConnection - Database connection type
 * @typeParam TServices - Database service names
 */
export interface IMagikServer<
  TServerName extends string = string,
  TConnection = unknown,
  TServices extends string = string,
> {
  /** Server name */
  readonly name: TServerName;

  /** Express application instance */
  readonly app: Express;

  /** HTTP server instance */
  readonly server: Server<typeof IncomingMessage, typeof ServerResponse>;

  /** Port the server is listening on */
  readonly port: number;

  /** Current server status */
  readonly status: ServerStatusType;

  /** Debug mode enabled */
  readonly DEBUG: boolean;

  /** Development mode check */
  readonly DevMode: boolean;

  // ========== Engines ==========

  /** Router manager for handling routes */
  readonly routerManager: IRouterManager;

  /** Middleware engine for managing middleware */
  readonly middlewareEngine: IMiddlewareEngine;

  /** Event engine for lifecycle events */
  readonly eventEngine: IEventEngine;

  // ========== Database ==========

  /**
   * Database adapter instance (if configured).
   *
   * @example
   * ```typescript
   * // Get a connection
   * const conn = server.db?.getConnection('main');
   *
   * // Check connection status
   * if (server.db?.isConnected('main')) {
   *   // ...
   * }
   * ```
   */
  readonly db?: IMagikDatabaseAdapter<TConnection, TServices>;

  /**
   * Primary database connection (if configured).
   *
   * Shorthand for `server.db?.getConnection(primaryService)`.
   */
  readonly primaryConnection?: TConnection;

  // ========== Methods ==========

  /**
   * Install a plugin.
   * @param plugin - The plugin to install
   */
  use(plugin: MagikPluginBase): Promise<this>;

  /**
   * Gracefully shutdown the server.
   *
   * This will:
   * 1. Stop accepting new connections
   * 2. Emit 'beforeStop' event
   * 3. Close database connections (if autoDisconnect)
   * 4. Emit 'afterStop' event
   */
  shutdownServer(): Promise<void>;
}
