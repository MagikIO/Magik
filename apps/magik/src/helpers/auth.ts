import type { IUserAdapter } from '@magik_io/magik-types';
import type { RequestHandler } from 'express';
import type {
  NextFunction,
  Request,
  Response,
} from 'express-serve-static-core';

// ============================================================================
// Role-Based Middleware Helpers
// ============================================================================

/**
 * Options for creating auth middleware.
 */
export interface AuthMiddlewareOptions {
  /** HTTP status code for unauthorized responses (default: 401) */
  unauthorizedStatus?: number;
  /** HTTP status code for forbidden responses (default: 403) */
  forbiddenStatus?: number;
  /** Custom error message for unauthorized responses */
  unauthorizedMessage?: string;
  /** Custom error message for forbidden responses */
  forbiddenMessage?: string;
  /** If true, send JSON responses. If false, call next with error (default: true) */
  sendResponse?: boolean;
}

const defaultOptions: Required<AuthMiddlewareOptions> = {
  unauthorizedStatus: 401,
  forbiddenStatus: 403,
  unauthorizedMessage: 'Unauthorized',
  forbiddenMessage: 'Forbidden',
  sendResponse: true,
};

/**
 * Creates middleware that checks if a user has ANY of the specified roles.
 *
 * @param adapter - User adapter to access roles
 * @param requiredRoles - Array of roles, user must have at least one
 * @param options - Response configuration
 * @returns Express middleware
 *
 * @example
 * ```typescript
 * const adapter = new MyUserAdapter();
 *
 * // Route that requires admin OR moderator role
 * app.get('/admin', createRoleMiddleware(adapter, ['admin', 'moderator']), handler);
 * ```
 */
export function createRoleMiddleware<TUser>(
  adapter: IUserAdapter<TUser>,
  requiredRoles: string[],
  options: AuthMiddlewareOptions = {},
): RequestHandler {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: TUser }).user;

    // Check authentication first
    const isAuthenticated = adapter.isAuthenticated
      ? adapter.isAuthenticated(user)
      : user != null;

    if (!isAuthenticated) {
      if (opts.sendResponse) {
        res.status(opts.unauthorizedStatus).json({
          error: opts.unauthorizedMessage,
        });
        return;
      }
      next(new Error(opts.unauthorizedMessage));
      return;
    }

    // Check roles
    const hasRole = adapter.hasAnyRole
      ? adapter.hasAnyRole(user!, requiredRoles)
      : requiredRoles.some((role) => adapter.hasRole(user!, role));

    if (!hasRole) {
      if (opts.sendResponse) {
        res.status(opts.forbiddenStatus).json({
          error: opts.forbiddenMessage,
        });
        return;
      }
      next(new Error(opts.forbiddenMessage));
      return;
    }

    next();
  };
}

/**
 * Creates middleware that checks if a user has ALL of the specified roles.
 *
 * @param adapter - User adapter to access roles
 * @param requiredRoles - Array of roles, user must have all of them
 * @param options - Response configuration
 * @returns Express middleware
 *
 * @example
 * ```typescript
 * // Route that requires BOTH admin AND verified roles
 * app.get('/secure', createAllRolesMiddleware(adapter, ['admin', 'verified']), handler);
 * ```
 */
export function createAllRolesMiddleware<TUser>(
  adapter: IUserAdapter<TUser>,
  requiredRoles: string[],
  options: AuthMiddlewareOptions = {},
): RequestHandler {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: TUser }).user;

    const isAuthenticated = adapter.isAuthenticated
      ? adapter.isAuthenticated(user)
      : user != null;

    if (!isAuthenticated) {
      if (opts.sendResponse) {
        res.status(opts.unauthorizedStatus).json({
          error: opts.unauthorizedMessage,
        });
        return;
      }
      next(new Error(opts.unauthorizedMessage));
      return;
    }

    const hasAllRoles = adapter.hasAllRoles
      ? adapter.hasAllRoles(user!, requiredRoles)
      : requiredRoles.every((role) => adapter.hasRole(user!, role));

    if (!hasAllRoles) {
      if (opts.sendResponse) {
        res.status(opts.forbiddenStatus).json({
          error: opts.forbiddenMessage,
        });
        return;
      }
      next(new Error(opts.forbiddenMessage));
      return;
    }

    next();
  };
}

/**
 * Creates middleware that checks if a user has ANY of the specified permissions.
 *
 * @param adapter - User adapter to access permissions
 * @param requiredPermissions - Array of permissions, user must have at least one
 * @param options - Response configuration
 * @returns Express middleware
 */
export function createPermissionMiddleware<TUser>(
  adapter: IUserAdapter<TUser>,
  requiredPermissions: string[],
  options: AuthMiddlewareOptions = {},
): RequestHandler {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: TUser }).user;

    const isAuthenticated = adapter.isAuthenticated
      ? adapter.isAuthenticated(user)
      : user != null;

    if (!isAuthenticated) {
      if (opts.sendResponse) {
        res.status(opts.unauthorizedStatus).json({
          error: opts.unauthorizedMessage,
        });
        return;
      }
      next(new Error(opts.unauthorizedMessage));
      return;
    }

    const hasPermission = adapter.hasAnyPermission
      ? adapter.hasAnyPermission(user!, requiredPermissions)
      : requiredPermissions.some((perm) => adapter.hasPermission(user!, perm));

    if (!hasPermission) {
      if (opts.sendResponse) {
        res.status(opts.forbiddenStatus).json({
          error: opts.forbiddenMessage,
        });
        return;
      }
      next(new Error(opts.forbiddenMessage));
      return;
    }

    next();
  };
}

/**
 * Creates middleware that checks if a user has ALL of the specified permissions.
 *
 * @param adapter - User adapter to access permissions
 * @param requiredPermissions - Array of permissions, user must have all of them
 * @param options - Response configuration
 * @returns Express middleware
 */
export function createAllPermissionsMiddleware<TUser>(
  adapter: IUserAdapter<TUser>,
  requiredPermissions: string[],
  options: AuthMiddlewareOptions = {},
): RequestHandler {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: TUser }).user;

    const isAuthenticated = adapter.isAuthenticated
      ? adapter.isAuthenticated(user)
      : user != null;

    if (!isAuthenticated) {
      if (opts.sendResponse) {
        res.status(opts.unauthorizedStatus).json({
          error: opts.unauthorizedMessage,
        });
        return;
      }
      next(new Error(opts.unauthorizedMessage));
      return;
    }

    const hasAllPermissions = adapter.hasAllPermissions
      ? adapter.hasAllPermissions(user!, requiredPermissions)
      : requiredPermissions.every((perm) => adapter.hasPermission(user!, perm));

    if (!hasAllPermissions) {
      if (opts.sendResponse) {
        res.status(opts.forbiddenStatus).json({
          error: opts.forbiddenMessage,
        });
        return;
      }
      next(new Error(opts.forbiddenMessage));
      return;
    }

    next();
  };
}

// ============================================================================
// Authentication Middleware Helpers
// ============================================================================

/**
 * Creates middleware that ensures a user is authenticated.
 *
 * @param adapter - User adapter (uses isAuthenticated if available)
 * @param options - Response configuration
 * @returns Express middleware
 *
 * @example
 * ```typescript
 * const ensureAuth = createAuthenticatedMiddleware(adapter);
 * app.get('/profile', ensureAuth, handler);
 * ```
 */
export function createAuthenticatedMiddleware<TUser>(
  adapter: IUserAdapter<TUser>,
  options: AuthMiddlewareOptions = {},
): RequestHandler {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: TUser }).user;

    const isAuthenticated = adapter.isAuthenticated
      ? adapter.isAuthenticated(user)
      : user != null;

    if (!isAuthenticated) {
      if (opts.sendResponse) {
        res.status(opts.unauthorizedStatus).json({
          error: opts.unauthorizedMessage,
        });
        return;
      }
      next(new Error(opts.unauthorizedMessage));
      return;
    }

    next();
  };
}

/**
 * Creates middleware that ensures two-factor authentication has been completed.
 * Requires the adapter to implement requiresTwoFactor and hasTwoFactorPassed.
 *
 * @param adapter - User adapter with 2FA methods
 * @param options - Response configuration
 * @returns Express middleware
 *
 * @example
 * ```typescript
 * const ensure2FA = createTwoFactorMiddleware(adapter, {
 *   forbiddenMessage: 'Two-factor authentication required',
 * });
 * app.get('/sensitive', ensure2FA, handler);
 * ```
 */
export function createTwoFactorMiddleware<TUser>(
  adapter: IUserAdapter<TUser>,
  options: AuthMiddlewareOptions = {},
): RequestHandler {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: TUser }).user;

    // Check authentication first
    const isAuthenticated = adapter.isAuthenticated
      ? adapter.isAuthenticated(user)
      : user != null;

    if (!isAuthenticated) {
      if (opts.sendResponse) {
        res.status(opts.unauthorizedStatus).json({
          error: opts.unauthorizedMessage,
        });
        return;
      }
      next(new Error(opts.unauthorizedMessage));
      return;
    }

    // Check if 2FA is required and if so, if it's been completed
    if (adapter.requiresTwoFactor && adapter.hasTwoFactorPassed) {
      const requires2FA = adapter.requiresTwoFactor(user!);
      const passed2FA = adapter.hasTwoFactorPassed(user!);

      if (requires2FA && !passed2FA) {
        if (opts.sendResponse) {
          res.status(opts.forbiddenStatus).json({
            error: 'Two-factor authentication required',
            code: '2FA_REQUIRED',
          });
          return;
        }
        next(new Error('Two-factor authentication required'));
        return;
      }
    }

    next();
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a role handler factory function suitable for AuthConfig.roleHandler.
 *
 * @param adapter - User adapter to use for role checks
 * @param options - Default options for all created middleware
 * @returns A function that creates role middleware
 *
 * @example
 * ```typescript
 * const adapter = new MyUserAdapter();
 *
 * const authConfig: AuthConfig = {
 *   handlers: { ... },
 *   roleHandler: createRoleHandlerFactory(adapter),
 * };
 * ```
 */
export function createRoleHandlerFactory<TUser>(
  adapter: IUserAdapter<TUser>,
  options: AuthMiddlewareOptions = {},
): (roles: string[]) => RequestHandler {
  return (roles: string[]) => createRoleMiddleware(adapter, roles, options);
}

/**
 * Creates a permission handler factory function.
 *
 * @param adapter - User adapter to use for permission checks
 * @param options - Default options for all created middleware
 * @returns A function that creates permission middleware
 */
export function createPermissionHandlerFactory<TUser>(
  adapter: IUserAdapter<TUser>,
  options: AuthMiddlewareOptions = {},
): (permissions: string[]) => RequestHandler {
  return (permissions: string[]) =>
    createPermissionMiddleware(adapter, permissions, options);
}

// ============================================================================
// Composite Middleware
// ============================================================================

/**
 * Creates middleware that requires authentication AND specific roles.
 * Combines authentication check with role check in a single middleware.
 *
 * @param adapter - User adapter
 * @param roles - Required roles (user must have at least one)
 * @param options - Response configuration
 * @returns Express middleware
 */
export function createAuthWithRolesMiddleware<TUser>(
  adapter: IUserAdapter<TUser>,
  roles: string[],
  options: AuthMiddlewareOptions = {},
): RequestHandler {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as unknown as { user?: TUser }).user;

    // Check authentication
    const isAuthenticated = adapter.isAuthenticated
      ? adapter.isAuthenticated(user)
      : user != null;

    if (!isAuthenticated) {
      if (opts.sendResponse) {
        res.status(opts.unauthorizedStatus).json({
          error: opts.unauthorizedMessage,
        });
        return;
      }
      next(new Error(opts.unauthorizedMessage));
      return;
    }

    // Check 2FA if implemented
    if (adapter.requiresTwoFactor && adapter.hasTwoFactorPassed) {
      const requires2FA = adapter.requiresTwoFactor(user!);
      const passed2FA = adapter.hasTwoFactorPassed(user!);

      if (requires2FA && !passed2FA) {
        if (opts.sendResponse) {
          res.status(opts.forbiddenStatus).json({
            error: 'Two-factor authentication required',
            code: '2FA_REQUIRED',
          });
          return;
        }
        next(new Error('Two-factor authentication required'));
        return;
      }
    }

    // Check roles
    const hasRole = adapter.hasAnyRole
      ? adapter.hasAnyRole(user!, roles)
      : roles.some((role) => adapter.hasRole(user!, role));

    if (!hasRole) {
      if (opts.sendResponse) {
        res.status(opts.forbiddenStatus).json({
          error: opts.forbiddenMessage,
        });
        return;
      }
      next(new Error(opts.forbiddenMessage));
      return;
    }

    next();
  };
}
