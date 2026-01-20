/**
 * Query options for repository find operations.
 * Database adapters translate these to their native query format.
 */
export interface QueryOptions<T = unknown> {
  /** Fields to sort by (positive = ascending, negative = descending) */
  sort?: Partial<Record<keyof T, 1 | -1>>;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  skip?: number;
  /** Fields to include in the result (projection) */
  select?: (keyof T)[];
  /** Related entities to populate/join */
  populate?: string | string[] | PopulateOptions[];
}

/**
 * Options for populating/joining related entities.
 */
export interface PopulateOptions {
  /** Path to the field to populate */
  path: string;
  /** Fields to select from the populated documents */
  select?: string[];
  /** Nested population */
  populate?: PopulateOptions[];
}

/**
 * Base repository interface that all repositories implement.
 * Provides a database-agnostic API for CRUD operations.
 *
 * @typeParam T - The entity type this repository manages
 * @typeParam TId - The type of the entity's ID (defaults to string)
 *
 * @example
 * ```typescript
 * interface User {
 *   id: string;
 *   email: string;
 *   name: string;
 * }
 *
 * const userRepo: IRepository<User> = adapter.getRepository('users');
 * const user = await userRepo.findById('123');
 * ```
 */
export interface IRepository<T, TId = string> {
  /**
   * Find an entity by its ID.
   *
   * @param id - The entity's unique identifier
   * @param options - Optional query options (select, populate)
   * @returns The entity or null if not found
   */
  findById(id: TId, options?: Pick<QueryOptions<T>, 'select' | 'populate'>): Promise<T | null>;

  /**
   * Find a single entity matching the query.
   *
   * @param query - Partial entity to match against
   * @param options - Optional query options
   * @returns The first matching entity or null
   */
  findOne(query: Partial<T>, options?: QueryOptions<T>): Promise<T | null>;

  /**
   * Find all entities matching the query.
   *
   * @param query - Partial entity to match against (empty = all)
   * @param options - Optional query options (sort, limit, skip, etc.)
   * @returns Array of matching entities
   */
  findMany(query: Partial<T>, options?: QueryOptions<T>): Promise<T[]>;

  /**
   * Create a new entity.
   *
   * @param data - The entity data (without ID, which is generated)
   * @returns The created entity with its generated ID
   */
  create(data: Omit<T, 'id'>): Promise<T>;

  /**
   * Create multiple entities in a batch.
   *
   * @param data - Array of entity data
   * @returns Array of created entities
   */
  createMany(data: Omit<T, 'id'>[]): Promise<T[]>;

  /**
   * Update an existing entity by ID.
   *
   * @param id - The entity's unique identifier
   * @param data - Partial entity data to update
   * @returns The updated entity or null if not found
   */
  update(id: TId, data: Partial<T>): Promise<T | null>;

  /**
   * Update multiple entities matching the query.
   *
   * @param query - Partial entity to match against
   * @param data - Partial entity data to update
   * @returns Number of entities updated
   */
  updateMany(query: Partial<T>, data: Partial<T>): Promise<number>;

  /**
   * Delete an entity by ID.
   *
   * @param id - The entity's unique identifier
   * @returns True if deleted, false if not found
   */
  delete(id: TId): Promise<boolean>;

  /**
   * Delete multiple entities matching the query.
   *
   * @param query - Partial entity to match against
   * @returns Number of entities deleted
   */
  deleteMany(query: Partial<T>): Promise<number>;

  /**
   * Count entities matching the query.
   *
   * @param query - Partial entity to match against (empty = count all)
   * @returns The count of matching entities
   */
  count(query?: Partial<T>): Promise<number>;

  /**
   * Check if any entity matches the query.
   *
   * @param query - Partial entity to match against
   * @returns True if at least one entity matches
   */
  exists(query: Partial<T>): Promise<boolean>;
}

/**
 * Repository registry that holds all repositories for a database connection.
 * Provides type-safe access to repositories by name.
 *
 * @example
 * ```typescript
 * const registry: IRepositoryRegistry = adapter.repositories;
 * const userRepo = registry.get<User>('users');
 * ```
 */
export interface IRepositoryRegistry {
  /**
   * Get a repository by name.
   *
   * @param name - The repository/collection name
   * @returns The repository or undefined if not registered
   */
  get<T, TId = string>(name: string): IRepository<T, TId> | undefined;

  /**
   * Register a repository under a name.
   *
   * @param name - The repository/collection name
   * @param repo - The repository instance
   */
  register<T, TId = string>(name: string, repo: IRepository<T, TId>): void;

  /**
   * Check if a repository is registered.
   *
   * @param name - The repository/collection name
   * @returns True if registered
   */
  has(name: string): boolean;

  /**
   * Get all registered repository names.
   */
  names(): string[];
}

/**
 * Factory interface for creating repositories.
 * Database adapters implement this to create database-specific repositories.
 *
 * @typeParam TConnection - The database connection type
 * @typeParam TSchema - The schema/model definition type
 *
 * @example
 * ```typescript
 * // Mongoose factory
 * class MongooseRepositoryFactory implements IRepositoryFactory<Connection, Schema> {
 *   createRepository(conn, name, schema) {
 *     const model = conn.model(name, schema);
 *     return new MongooseRepository(model);
 *   }
 * }
 * ```
 */
export interface IRepositoryFactory<TConnection, TSchema = unknown> {
  /**
   * Create a repository for a collection/table.
   *
   * @param connection - The database connection
   * @param name - The collection/table name
   * @param schema - The schema/model definition
   * @returns A repository instance
   */
  createRepository<T, TId = string>(
    connection: TConnection,
    name: string,
    schema: TSchema
  ): IRepository<T, TId>;
}

/**
 * Extended repository interface with raw query support.
 * For cases where the abstraction isn't enough.
 *
 * @typeParam T - The entity type
 * @typeParam TId - The ID type
 * @typeParam TNativeQuery - The native query type (e.g., mongoose.FilterQuery)
 */
export interface IExtendedRepository<T, TId = string, TNativeQuery = unknown>
  extends IRepository<T, TId> {
  /**
   * Execute a raw/native query.
   * Useful for complex queries that don't fit the standard interface.
   *
   * @param query - Database-native query object
   * @returns Query results
   */
  rawQuery(query: TNativeQuery): Promise<T[]>;

  /**
   * Get the underlying native model/collection.
   * Use sparingly - prefer the abstracted methods.
   */
  getNativeModel(): unknown;
}

/**
 * Repository configuration for registering models with an adapter.
 * Used when setting up repositories in MagikDatabaseConfig.
 */
export interface RepositoryConfig<TSchema = unknown> {
  /** The collection/table name */
  name: string;
  /** The schema/model definition */
  schema: TSchema;
  /** Optional custom repository class */
  repository?: new (...args: unknown[]) => IRepository<unknown>;
}

/**
 * Helper type to extract entity type from a repository.
 */
export type InferEntity<R> = R extends IRepository<infer T, unknown> ? T : never;

/**
 * Helper type to extract ID type from a repository.
 */
export type InferId<R> = R extends IRepository<unknown, infer TId> ? TId : never;
