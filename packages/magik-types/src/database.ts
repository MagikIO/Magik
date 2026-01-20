import type {
  IRepository,
  IRepositoryRegistry,
  RepositoryConfig,
} from './repository.js';

/**
 * Connection lifecycle states that MagikIO can react to.
 * Database adapters can emit these to trigger server-level behavior.
 */
export type ConnectionState = 
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'error';

/**
 * Options passed when establishing a database connection.
 * Generic TOptions allows database-specific configuration.
 */
export interface ConnectionOptions<TOptions = unknown> {
  /** Connection URI/string */
  uri: string;
  /** Service identifier for connection pooling/sharing */
  serviceName: string;
  /** Database-specific options (e.g., mongoose.ConnectOptions) */
  options?: TOptions;
  /** Callbacks for connection lifecycle events */
  hooks?: ConnectionHooks;
}

/**
 * Lifecycle hooks that MagikIO can use to respond to connection events.
 * These are optional — adapters don't have to support all of them.
 */
export interface ConnectionHooks {
  onConnecting?: () => void;
  onConnected?: () => void;
  onDisconnecting?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Result of a connection attempt.
 * Provides both the connection and metadata about it.
 */
export interface ConnectionResult<TConnection> {
  /** The raw database connection */
  connection: TConnection;
  /** Current state of the connection */
  state: ConnectionState;
  /** Service name this connection is registered under */
  serviceName: string;
}

/**
 * Core interface that any database adapter must implement.
 * 
 * @typeParam TConnection - The raw connection type (e.g., mongoose.Connection, pg.Pool)
 * @typeParam TServices - String literal union of valid service names
 * @typeParam TConnectOptions - Database-specific connection options
 * 
 * @example
 * ```typescript
 * // MongoDB adapter
 * class MongoAdapter implements IMagikDatabaseAdapter<mongoose.Connection, 'main' | 'analytics'> {
 *   // ...implementation
 * }
 * 
 * // PostgreSQL adapter  
 * class PostgresAdapter implements IMagikDatabaseAdapter<pg.Pool, 'primary' | 'replica'> {
 *   // ...implementation
 * }
 * ```
 */
export interface IMagikDatabaseAdapter<
  TConnection = unknown,
  TServices extends string = string,
  TConnectOptions = unknown
> {
  /**
   * Map of service names to their active connections.
   * Allows connection pooling/sharing across the application.
   */
  readonly connections: Map<TServices, TConnection>;

  /**
   * Establish a database connection.
   * 
   * @param options - Connection configuration
   * @returns The connection result with metadata
   * @throws Should throw a descriptive error if connection fails
   */
  connect(
    options: ConnectionOptions<TConnectOptions> & { serviceName: TServices }
  ): Promise<ConnectionResult<TConnection>>;

  /**
   * Close a specific service's connection.
   * 
   * @param serviceName - The service to disconnect
   * @returns 'OK' if closed, 'NO_CONNECTION' if nothing to close
   */
  disconnect(serviceName: TServices): Promise<'OK' | 'NO_CONNECTION'>;

  /**
   * Close all active connections.
   * Called during server shutdown.
   */
  disconnectAll(): Promise<void>;

  /**
   * Get a specific connection by service name.
   * 
   * @param serviceName - The service to retrieve
   * @returns The connection or undefined if not connected
   */
  getConnection(serviceName: TServices): TConnection | undefined;

  /**
   * Check if a service has an active connection.
   */
  isConnected(serviceName: TServices): boolean;

  /**
   * Get the current state of a connection.
   */
  getConnectionState(serviceName: TServices): ConnectionState | undefined;

  // ============================================================
  // Repository Support (Optional)
  // Adapters can implement these for database-agnostic data access
  // ============================================================

  /**
   * Registry of all repositories managed by this adapter.
   * Optional - only required if using the repository pattern.
   */
  readonly repositories?: IRepositoryRegistry;

  /**
   * Register a repository for a collection/table.
   * Creates a database-specific repository wrapping the schema.
   *
   * @param serviceName - The service/connection to register against
   * @param name - The collection/table name
   * @param schema - Database-specific schema definition
   * @returns The created repository
   *
   * @example
   * ```typescript
   * // Mongoose
   * const userRepo = adapter.registerRepository('main', 'users', UserSchema);
   *
   * // PostgreSQL/Prisma
   * const userRepo = adapter.registerRepository('primary', 'users', prisma.user);
   * ```
   */
  registerRepository?<T, TId = string>(
    serviceName: TServices,
    name: string,
    schema: unknown
  ): IRepository<T, TId>;

  /**
   * Get a repository by name.
   *
   * @param name - The collection/table name
   * @returns The repository or undefined if not registered
   */
  getRepository?<T, TId = string>(name: string): IRepository<T, TId> | undefined;

  /**
   * Register multiple repositories at once.
   *
   * @param serviceName - The service/connection to register against
   * @param configs - Array of repository configurations
   */
  registerRepositories?(serviceName: TServices, configs: RepositoryConfig[]): void;
}

/**
 * Configuration for database in MagikServerConfig.
 * Wraps an adapter instance with the primary connection info.
 */
export interface MagikDatabaseConfig<
  TConnection = unknown,
  TServices extends string = string,
  TAdapter extends IMagikDatabaseAdapter<TConnection, TServices> = IMagikDatabaseAdapter<TConnection, TServices>
> {
  /** The database adapter instance */
  adapter: TAdapter;
  
  /** 
   * The primary service name for this server.
   * This connection will be used by default for server operations.
   */
  primaryService: TServices;
  
  /**
   * Connection options for the primary service.
   * If not provided, assumes connection is already established.
   */
  connectionOptions?: Omit<ConnectionOptions, 'serviceName'>;
  
  /**
   * If true, connect automatically when server starts.
   * @default true
   */
  autoConnect?: boolean;
  
  /**
   * If true, disconnect automatically when server shuts down.
   * @default true
   */
  autoDisconnect?: boolean;

  /**
   * Repository configurations to register after connection.
   * Each config defines a collection/table and its schema.
   *
   * @example
   * ```typescript
   * repositories: [
   *   { name: 'users', schema: UserSchema },
   *   { name: 'orders', schema: OrderSchema },
   * ]
   * ```
   */
  repositories?: RepositoryConfig[];
}

/**
 * Helper type to extract the connection type from an adapter.
 */
export type InferConnection<T> = T extends IMagikDatabaseAdapter<infer C, any, any> ? C : never;

/**
 * Helper type to extract the services type from an adapter.
 */
export type InferServices<T> = T extends IMagikDatabaseAdapter<any, infer S, any> ? S : never;

/**
 * Type guard to check if an object implements IMagikDatabaseAdapter.
 */
export function isDatabaseAdapter(obj: unknown): obj is IMagikDatabaseAdapter {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'connections' in obj &&
    'connect' in obj &&
    'disconnect' in obj &&
    'disconnectAll' in obj &&
    typeof (obj as IMagikDatabaseAdapter).connect === 'function' &&
    typeof (obj as IMagikDatabaseAdapter).disconnect === 'function' &&
    typeof (obj as IMagikDatabaseAdapter).disconnectAll === 'function'
  );
}
