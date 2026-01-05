import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ErrorRequestHandler, RequestHandler } from 'express';

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

export interface AuthMiddlewareMap {
  ensureAuthenticated: RequestHandler;
  ensureAccessGranted: RequestHandler;
  ensureAdmin: RequestHandler;
  ensureIT: RequestHandler;
  ensureIsEmployee: RequestHandler;
  [key: string]: RequestHandler;
}

// ============================================================================
// Middleware Handler Types
// ============================================================================

export type MiddlewareFn =
  | RequestHandler
  | ErrorRequestHandler
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
