import type { Express } from 'express';
import type { Server, IncomingMessage, ServerResponse } from 'http';
import type { EventEngine } from '../engines/EventEngine';
import type { MiddlewareEngine } from '../engines/MiddlewareEngine';
import type { RouterManager } from '../engines/RouterManager';
import type { ServerStatusType } from './events';
import type { MagikPlugin } from './plugins';
import type { IMagikDatabaseAdapter,MagikDatabaseConfig } from './database';

/**
 * Server status states.
 */
export type ServerStatus = 'STARTING' | 'ONLINE' | 'OFFLINE' | 'SHUTTING_DOWN' | 'ERROR';

// ============================================================================
// Server Configuration
// ============================================================================


/**
 * Configuration options for creating a MagikServer.
 * 
 * @typeParam TServerName - String literal type for the server name
 * @typeParam TConnection - Database connection type (optional)
 * @typeParam TServices - Database service names (optional)
 * @typeParam TAdapter - Database adapter type (optional)
 */
export interface MagikServerConfig<
  TServerName extends string = string,
  TConnection = unknown,
  TServices extends string = string,
  TAdapter extends IMagikDatabaseAdapter<TConnection, TServices> = IMagikDatabaseAdapter<TConnection, TServices>
> {
  /** Unique name for this server instance */
  name: TServerName;
  
  /** Port to listen on. Can also be set via environment variable. */
  port?: number;
  
  /** Host to bind to. Defaults to '0.0.0.0' */
  host?: string;
  
  /** Enable debug mode for verbose logging */
  debug?: boolean;
  
  /**
   * Database configuration.
   * Omit entirely if this server doesn't need a database.
   */
  database?: MagikDatabaseConfig<TConnection, TServices, TAdapter>;
}


// ============================================================================
// Server Interface
// ============================================================================

export interface IMagikServer<ServerName extends string = string> {
  /** Server name */
  readonly name: ServerName;

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
  readonly routerManager: RouterManager;

  /** Middleware engine for managing middleware */
  readonly middlewareEngine: MiddlewareEngine;

  /** Event engine for lifecycle events */
  readonly eventEngine: EventEngine;

  // ========== Methods ==========

  /**
   * Install a plugin
   * @param plugin - The plugin to install
   */
  use(plugin: MagikPlugin): Promise<this>;

  shutdownServer(): Promise<void>
}
