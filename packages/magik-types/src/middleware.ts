import type { IncomingMessage } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import type { ServerResponse } from 'http';

export type MagikMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

export type MagikErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

// ============================================================================
// Middleware Categories
// ============================================================================

export type MiddlewareCategory =
  | 'security'
  | 'session'
  | 'parser'
  | 'compression'
  | 'logging'
  | 'static'
  | 'custom';

// ============================================================================
// Auth Types
// ============================================================================

export type AuthTypes =
  | 'ensureAuthenticated'
  | 'ensureAccessGranted'
  | 'ensureAdmin'
  | 'ensureIT'
  | 'ensureIsEmployee'
  | string[];

// ============================================================================
// Auth Middleware Map
// ============================================================================

/**
 * A flexible map of auth type names to their middleware handlers.
 * Uses string index signature to allow any auth type name.
 *
 * @deprecated Import AuthMiddlewareMap from './auth' instead for type-safe auth.
 */
export interface AuthMiddlewareMap {
  [authType: string]: MagikMiddleware;
}

// ============================================================================
// Middleware Handler Types
// ============================================================================

/**
 * Flexible middleware function type that accepts various Express middleware formats.
 * This union allows compatibility with different middleware libraries while maintaining type safety.
 */
export type MiddlewareFn =
  | MagikMiddleware
  | MagikErrorHandler
  | ((
      req: IncomingMessage,
      res: ServerResponse<IncomingMessage>,
      next: (err?: unknown) => void,
    ) => void)
  | ((
      req: IncomingMessage,
      res: ServerResponse,
      next: (err?: unknown) => void,
    ) => void);

// ============================================================================
// Middleware Configuration
// ============================================================================

export interface MiddlewareConfig {
  /** Unique name for this middleware */
  name: string;
  /** Category determines when middleware is applied */
  category: MiddlewareCategory;
  /** Higher priority = applied earlier (default: 0) */
  priority?: number;
  /** Other middleware names this depends on */
  dependencies?: string[];
  /** Whether this middleware is enabled (default: true) */
  enabled?: boolean;
  /** The actual middleware handler function */
  handler: MiddlewareFn;
  /** Additional options for the middleware */
  options?: Record<string, unknown>;
}

// ============================================================================
// Middleware Preset
// ============================================================================

export interface MiddlewarePreset {
  /** Name of this preset */
  name: string;
  /** Middleware configurations in this preset */
  middlewares: MiddlewareConfig[];
}
