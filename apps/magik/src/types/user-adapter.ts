/**
 * User adapter interface for standardized role/permission access.
 *
 * This provides an abstraction layer between your user model and the
 * auth system. Instead of auth handlers needing to know your user schema,
 * they can use the adapter to access roles, permissions, etc.
 *
 * @typeParam TUser - Your user type (e.g., HubUser, Express.User)
 *
 * @example
 * ```typescript
 * // Define your user type
 * interface MyUser {
 *   id: string;
 *   groups: string;
 *   accessLevel: 'full' | 'limited' | null;
 *   twoFactor?: { enabled: boolean; authenticated: boolean };
 * }
 *
 * // Implement the adapter
 * class MyUserAdapter implements IUserAdapter<MyUser> {
 *   getRoles(user: MyUser) {
 *     return [user.groups];
 *   }
 *
 *   getPermissions(user: MyUser) {
 *     return user.accessLevel ? [user.accessLevel] : [];
 *   }
 *
 *   hasRole(user: MyUser, role: string) {
 *     return user.groups === role;
 *   }
 *
 *   hasPermission(user: MyUser, permission: string) {
 *     return user.accessLevel === permission;
 *   }
 * }
 *
 * // Use in auth config
 * const server = await MagikServer.init({
 *   auth: {
 *     userAdapter: new MyUserAdapter(),
 *     handlers: { ... },
 *   }
 * });
 * ```
 */
export interface IUserAdapter<TUser = unknown> {
  // ============================================================
  // Core Methods (Required)
  // ============================================================

  /**
   * Get all roles assigned to a user.
   *
   * @param user - The user object from req.user
   * @returns Array of role names/identifiers
   *
   * @example
   * ```typescript
   * // If user.groups is a single string
   * getRoles(user) { return [user.groups]; }
   *
   * // If user.roles is already an array
   * getRoles(user) { return user.roles; }
   * ```
   */
  getRoles(user: TUser): string[];

  /**
   * Get all permissions assigned to a user.
   * Permissions are typically more granular than roles.
   *
   * @param user - The user object
   * @returns Array of permission names/identifiers
   */
  getPermissions(user: TUser): string[];

  /**
   * Check if a user has a specific role.
   *
   * @param user - The user object
   * @param role - The role to check for
   * @returns True if user has the role
   */
  hasRole(user: TUser, role: string): boolean;

  /**
   * Check if a user has a specific permission.
   *
   * @param user - The user object
   * @param permission - The permission to check for
   * @returns True if user has the permission
   */
  hasPermission(user: TUser, permission: string): boolean;

  // ============================================================
  // Extended Methods (Optional)
  // ============================================================

  /**
   * Check if a user is authenticated.
   * Default implementation checks if user is truthy.
   *
   * @param user - The user object (may be null/undefined)
   * @returns True if authenticated
   */
  isAuthenticated?(user: TUser | null | undefined): boolean;

  /**
   * Check if a user requires two-factor authentication.
   *
   * @param user - The user object
   * @returns True if 2FA is required
   */
  requiresTwoFactor?(user: TUser): boolean;

  /**
   * Check if a user has completed two-factor authentication.
   *
   * @param user - The user object
   * @returns True if 2FA has been verified
   */
  hasTwoFactorPassed?(user: TUser): boolean;

  /**
   * Get a user's unique identifier.
   * Useful for logging, audit trails, etc.
   *
   * @param user - The user object
   * @returns The user's ID as a string
   */
  getUserId?(user: TUser): string;

  /**
   * Get a user's display name.
   * Useful for personalization, logging, etc.
   *
   * @param user - The user object
   * @returns The user's display name
   */
  getDisplayName?(user: TUser): string;

  /**
   * Check if a user has ALL of the specified roles.
   *
   * @param user - The user object
   * @param roles - Array of roles to check
   * @returns True if user has all roles
   */
  hasAllRoles?(user: TUser, roles: string[]): boolean;

  /**
   * Check if a user has ANY of the specified roles.
   *
   * @param user - The user object
   * @param roles - Array of roles to check
   * @returns True if user has at least one role
   */
  hasAnyRole?(user: TUser, roles: string[]): boolean;

  /**
   * Check if a user has ALL of the specified permissions.
   *
   * @param user - The user object
   * @param permissions - Array of permissions to check
   * @returns True if user has all permissions
   */
  hasAllPermissions?(user: TUser, permissions: string[]): boolean;

  /**
   * Check if a user has ANY of the specified permissions.
   *
   * @param user - The user object
   * @param permissions - Array of permissions to check
   * @returns True if user has at least one permission
   */
  hasAnyPermission?(user: TUser, permissions: string[]): boolean;
}

// ============================================================================
// Default / Generic Implementations
// ============================================================================

/**
 * A no-op user adapter that returns empty/false for everything.
 * Use this when you want generic user handling without an adapter.
 *
 * Auth handlers using this adapter will need to cast req.user themselves.
 */
export class GenericUserAdapter implements IUserAdapter<unknown> {
  getRoles(): string[] {
    return [];
  }

  getPermissions(): string[] {
    return [];
  }

  hasRole(): boolean {
    return false;
  }

  hasPermission(): boolean {
    return false;
  }

  isAuthenticated(user: unknown): boolean {
    return user != null;
  }
}

/**
 * A simple user adapter that works with a basic user shape.
 * Useful for quick prototyping or simple applications.
 *
 * Expects user to have optional `roles` and `permissions` arrays.
 */
export interface SimpleUser {
  id?: string;
  roles?: string[];
  permissions?: string[];
  name?: string;
}

export class SimpleUserAdapter implements IUserAdapter<SimpleUser> {
  getRoles(user: SimpleUser): string[] {
    return user.roles ?? [];
  }

  getPermissions(user: SimpleUser): string[] {
    return user.permissions ?? [];
  }

  hasRole(user: SimpleUser, role: string): boolean {
    return this.getRoles(user).includes(role);
  }

  hasPermission(user: SimpleUser, permission: string): boolean {
    return this.getPermissions(user).includes(permission);
  }

  isAuthenticated(user: SimpleUser | null | undefined): boolean {
    return user != null;
  }

  getUserId(user: SimpleUser): string {
    return user.id ?? '';
  }

  getDisplayName(user: SimpleUser): string {
    return user.name ?? 'Unknown';
  }

  hasAllRoles(user: SimpleUser, roles: string[]): boolean {
    const userRoles = this.getRoles(user);
    return roles.every((r) => userRoles.includes(r));
  }

  hasAnyRole(user: SimpleUser, roles: string[]): boolean {
    const userRoles = this.getRoles(user);
    return roles.some((r) => userRoles.includes(r));
  }

  hasAllPermissions(user: SimpleUser, permissions: string[]): boolean {
    const userPerms = this.getPermissions(user);
    return permissions.every((p) => userPerms.includes(p));
  }

  hasAnyPermission(user: SimpleUser, permissions: string[]): boolean {
    const userPerms = this.getPermissions(user);
    return permissions.some((p) => userPerms.includes(p));
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if an object implements IUserAdapter.
 */
export function isUserAdapter(obj: unknown): obj is IUserAdapter {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'getRoles' in obj &&
    'getPermissions' in obj &&
    'hasRole' in obj &&
    'hasPermission' in obj &&
    typeof (obj as IUserAdapter).getRoles === 'function' &&
    typeof (obj as IUserAdapter).getPermissions === 'function' &&
    typeof (obj as IUserAdapter).hasRole === 'function' &&
    typeof (obj as IUserAdapter).hasPermission === 'function'
  );
}

/**
 * Helper to create a user adapter from a plain object.
 * Useful for quick inline adapter definitions.
 *
 * @example
 * ```typescript
 * const adapter = createUserAdapter({
 *   getRoles: (user) => [user.group],
 *   getPermissions: (user) => user.perms,
 *   hasRole: (user, role) => user.group === role,
 *   hasPermission: (user, perm) => user.perms.includes(perm),
 * });
 * ```
 */
export function createUserAdapter<TUser>(
  impl: IUserAdapter<TUser>
): IUserAdapter<TUser> {
  return impl;
}

/**
 * Helper type to infer the user type from an adapter.
 */
export type InferUser<T> = T extends IUserAdapter<infer U> ? U : never;
