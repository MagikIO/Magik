import type {
  ConnectionOptions,
  ConnectionResult,
  ConnectionState,
  IMagikDatabaseAdapter,
  IRepository,
  IRepositoryRegistry,
  QueryOptions,
  RepositoryConfig,
} from '@magik_io/magik-types';
import mongoose, { type Connection, type Model, type Schema } from 'mongoose';

// ============================================================================
// Mongoose Repository Implementation
// ============================================================================

/**
 * Mongoose implementation of the IRepository interface.
 * Wraps a Mongoose Model to provide database-agnostic data access.
 *
 * @typeParam T - The entity type
 * @typeParam TId - The ID type (defaults to string for MongoDB ObjectId)
 */
export class MongooseRepository<T, TId = string>
  implements IRepository<T, TId>
{
  constructor(private readonly model: Model<T>) {}

  async findById(
    id: TId,
    options?: Pick<QueryOptions<T>, 'select' | 'populate'>,
  ): Promise<T | null> {
    let query = this.model.findById(id);

    if (options?.select) {
      query = query.select(options.select.join(' '));
    }
    if (options?.populate) {
      query = this.applyPopulate(query, options.populate);
    }

    return (await query.lean().exec()) as T | null;
  }

  async findOne(
    query: Partial<T>,
    options?: QueryOptions<T>,
  ): Promise<T | null> {
    let q = this.model.findOne(query as mongoose.FilterQuery<T>);
    q = this.applyQueryOptions(q, options);
    return (await q.lean().exec()) as T | null;
  }

  async findMany(query: Partial<T>, options?: QueryOptions<T>): Promise<T[]> {
    let q = this.model.find(query as mongoose.FilterQuery<T>);
    q = this.applyQueryOptions(q, options);
    return (await q.lean().exec()) as T[];
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const doc = await this.model.create(data);
    return doc.toObject() as T;
  }

  async createMany(data: Omit<T, 'id'>[]): Promise<T[]> {
    const docs = await this.model.insertMany(data);
    return docs.map((d) => (d as unknown as mongoose.Document<unknown, object, T>).toObject() as T);
  }

  async update(id: TId, data: Partial<T>): Promise<T | null> {
    return (await this.model
      .findByIdAndUpdate(id, data as mongoose.UpdateQuery<T>, { new: true })
      .lean()
      .exec()) as T | null;
  }

  async updateMany(query: Partial<T>, data: Partial<T>): Promise<number> {
    const result = await this.model.updateMany(
      query as mongoose.FilterQuery<T>,
      data as mongoose.UpdateQuery<T>,
    );
    return result.modifiedCount;
  }

  async delete(id: TId): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id);
    return result !== null;
  }

  async deleteMany(query: Partial<T>): Promise<number> {
    const result = await this.model.deleteMany(
      query as mongoose.FilterQuery<T>,
    );
    return result.deletedCount;
  }

  async count(query?: Partial<T>): Promise<number> {
    return await this.model.countDocuments(query as mongoose.FilterQuery<T>);
  }

  async exists(query: Partial<T>): Promise<boolean> {
    const result = await this.model.exists(query as mongoose.FilterQuery<T>);
    return result !== null;
  }

  /**
   * Get the underlying Mongoose model.
   * Use sparingly - prefer the abstracted methods.
   */
  getNativeModel(): Model<T> {
    return this.model;
  }

  // Helper to apply query options
  private applyQueryOptions<TResult, TDoc>(
    query: mongoose.Query<TResult, TDoc>,
    options?: QueryOptions<T>,
  ): mongoose.Query<TResult, TDoc> {
    if (!options) return query;

    if (options.select) {
      query = query.select(options.select.join(' ')) as mongoose.Query<TResult, TDoc>;
    }
    if (options.sort) {
      query = query.sort(options.sort as Record<string, 1 | -1>) as mongoose.Query<TResult, TDoc>;
    }
    if (options.limit) {
      query = query.limit(options.limit) as mongoose.Query<TResult, TDoc>;
    }
    if (options.skip) {
      query = query.skip(options.skip) as mongoose.Query<TResult, TDoc>;
    }
    if (options.populate) {
      query = this.applyPopulate(query, options.populate);
    }

    return query;
  }

  // Helper to apply population
  private applyPopulate<TResult, TDoc>(
    query: mongoose.Query<TResult, TDoc>,
    populate: QueryOptions<T>['populate'],
  ): mongoose.Query<TResult, TDoc> {
    if (!populate) return query;

    if (typeof populate === 'string') {
      return query.populate(populate) as mongoose.Query<TResult, TDoc>;
    }
    if (Array.isArray(populate)) {
      for (const p of populate) {
        if (typeof p === 'string') {
          query = query.populate(p) as mongoose.Query<TResult, TDoc>;
        } else {
          query = query.populate(p) as mongoose.Query<TResult, TDoc>;
        }
      }
    }
    return query;
  }
}

// ============================================================================
// Repository Registry
// ============================================================================

/**
 * Registry that holds all repositories for the adapter.
 */
class RepositoryRegistry implements IRepositoryRegistry {
  private repos = new Map<string, IRepository<unknown>>();

  get<T, TId = string>(name: string): IRepository<T, TId> | undefined {
    return this.repos.get(name) as IRepository<T, TId> | undefined;
  }

  register<T, TId = string>(name: string, repo: IRepository<T, TId>): void {
    this.repos.set(name, repo as IRepository<unknown>);
  }

  has(name: string): boolean {
    return this.repos.has(name);
  }

  names(): string[] {
    return Array.from(this.repos.keys());
  }
}

// ============================================================================
// Mongoose Adapter
// ============================================================================

/**
 * Mongoose database adapter implementing IMagikDatabaseAdapter.
 *
 * Provides connection management and repository support for MongoDB.
 *
 * @typeParam TServices - String literal union of service names
 *
 * @example
 * ```typescript
 * const adapter = new MongooseAdapter<'main' | 'analytics'>();
 *
 * await adapter.connect({
 *   uri: 'mongodb://localhost:27017/mydb',
 *   serviceName: 'main',
 * });
 *
 * // Register a repository
 * const userRepo = adapter.registerRepository('main', 'users', UserSchema);
 *
 * // Use the repository
 * const user = await userRepo.findById('123');
 * ```
 */
export class MongooseAdapter<TServices extends string = string>
  implements IMagikDatabaseAdapter<Connection, TServices, mongoose.ConnectOptions>
{
  public readonly connections = new Map<TServices, Connection>();
  public readonly repositories: IRepositoryRegistry = new RepositoryRegistry();

  private states = new Map<TServices, ConnectionState>();
  private hooks = new Map<TServices, ConnectionOptions['hooks']>();

  async connect(
    options: ConnectionOptions<mongoose.ConnectOptions> & { serviceName: TServices },
  ): Promise<ConnectionResult<Connection>> {
    const { uri, serviceName, options: mongoOptions, hooks } = options;

    // Store hooks for lifecycle events
    if (hooks) {
      this.hooks.set(serviceName, hooks);
    }

    // Return existing connection if available
    if (this.connections.has(serviceName)) {
      return {
        connection: this.connections.get(serviceName)!,
        state: this.states.get(serviceName) ?? 'connected',
        serviceName,
      };
    }

    this.states.set(serviceName, 'connecting');
    hooks?.onConnecting?.();

    const connection = await mongoose
      .createConnection(uri, mongoOptions)
      .asPromise();

    // Setup listeners
    connection.on('connected', () => {
      this.states.set(serviceName, 'connected');
      hooks?.onConnected?.();
    });

    connection.on('disconnected', () => {
      this.states.set(serviceName, 'disconnected');
      hooks?.onDisconnected?.();
    });

    connection.on('error', (err) => {
      this.states.set(serviceName, 'error');
      hooks?.onError?.(err);
    });

    this.connections.set(serviceName, connection);
    this.states.set(serviceName, 'connected');

    return { connection, state: 'connected', serviceName };
  }

  async disconnect(serviceName: TServices): Promise<'OK' | 'NO_CONNECTION'> {
    const conn = this.connections.get(serviceName);
    if (!conn) return 'NO_CONNECTION';

    // Emit disconnecting hook
    const hooks = this.hooks.get(serviceName);
    this.states.set(serviceName, 'disconnecting');
    hooks?.onDisconnecting?.();

    await conn.close();

    this.connections.delete(serviceName);
    this.states.set(serviceName, 'disconnected');
    hooks?.onDisconnected?.();

    return 'OK';
  }

  async disconnectAll(): Promise<void> {
    const services = Array.from(this.connections.keys());
    for (const name of services) {
      await this.disconnect(name);
    }
  }

  getConnection(serviceName: TServices): Connection | undefined {
    return this.connections.get(serviceName);
  }

  isConnected(serviceName: TServices): boolean {
    return this.connections.get(serviceName)?.readyState === 1;
  }

  getConnectionState(serviceName: TServices): ConnectionState | undefined {
    return this.states.get(serviceName);
  }

  // ========== Repository Support ==========

  /**
   * Register a repository for a collection.
   *
   * @param serviceName - The service/connection to use
   * @param name - The collection name (also used as the model name)
   * @param schema - Mongoose schema definition
   * @returns The created repository
   *
   * @example
   * ```typescript
   * const UserSchema = new Schema({
   *   email: String,
   *   name: String,
   * });
   *
   * const userRepo = adapter.registerRepository('main', 'users', UserSchema);
   * ```
   */
  registerRepository<T, TId = string>(
    serviceName: TServices,
    name: string,
    schema: Schema,
  ): IRepository<T, TId> {
    const conn = this.connections.get(serviceName);
    if (!conn) {
      throw new Error(
        `[MongooseAdapter] Cannot register repository "${name}": ` +
          `no connection found for service "${serviceName}". ` +
          `Call connect() first.`,
      );
    }

    // Create or get the model
    let model: Model<T>;
    try {
      // Try to get existing model
      model = conn.model<T>(name);
    } catch {
      // Model doesn't exist, create it
      model = conn.model<T>(name, schema);
    }

    // Create and register the repository
    const repo = new MongooseRepository<T, TId>(model);
    this.repositories.register(name, repo);

    return repo;
  }

  /**
   * Get a repository by name.
   *
   * @param name - The collection/repository name
   * @returns The repository or undefined if not registered
   */
  getRepository<T, TId = string>(
    name: string,
  ): IRepository<T, TId> | undefined {
    return this.repositories.get<T, TId>(name);
  }

  /**
   * Register multiple repositories at once.
   *
   * @param serviceName - The service/connection to use
   * @param configs - Array of repository configurations
   */
  registerRepositories(
    serviceName: TServices,
    configs: RepositoryConfig<Schema>[],
  ): void {
    for (const config of configs) {
      this.registerRepository(serviceName, config.name, config.schema);
    }
  }

  // ========== Mongoose-Specific Helpers ==========

  /**
   * Register Mongoose models directly (legacy method).
   * Prefer using registerRepository for new code.
   *
   * @param serviceName - The service/connection to use
   * @param models - Map of model names to schemas
   * @deprecated Use registerRepository instead
   */
  registerModels(serviceName: TServices, models: Record<string, Schema>): void {
    const conn = this.connections.get(serviceName);
    if (!conn) throw new Error(`No connection: ${serviceName}`);

    Object.entries(models).forEach(([name, schema]) => {
      conn.model(name, schema);
    });
  }

  /**
   * Get a Mongoose model directly by name.
   * Useful when you need Mongoose-specific features.
   *
   * @param serviceName - The service/connection to use
   * @param name - The model name
   * @returns The Mongoose model
   */
  getModel<T>(serviceName: TServices, name: string): Model<T> {
    const conn = this.connections.get(serviceName);
    if (!conn) throw new Error(`No connection: ${serviceName}`);
    return conn.model<T>(name);
  }
}

// Re-export types for convenience
export type { IRepository, IRepositoryRegistry, QueryOptions };
