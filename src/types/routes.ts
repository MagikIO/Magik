import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';

// ============================================================================
// Path Types
// ============================================================================

export type PathSegment = `/${string}`;

// ============================================================================
// HTTP Methods
// ============================================================================

export type HTTPMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

// ============================================================================
// Validation Schema
// ============================================================================

export type ValidationSchema = z.ZodSchema<unknown>;

// ============================================================================
// Request Types
// ============================================================================

export type MagikRequest<Schema = unknown> = Schema extends z.ZodSchema
  ? Omit<Request, 'body' | 'user'> & {
      body: z.infer<Schema>;
      user: Express.User;
    }
  : Schema extends object
    ? Omit<Request, keyof Schema | 'user'> & {
        [Key in keyof Schema]: Schema[Key];
      } & { user: Express.User }
    : Omit<Request, 'body' | 'user'> & { body: Schema; user: Express.User };

export type MagikGetRequest = Omit<Request, 'user'> & { user: Express.User };

// ============================================================================
// Route Handler Types
// ============================================================================

export type MagikRouteFn<Schema extends ValidationSchema = ValidationSchema> = (
  req: MagikRequest<z.infer<Schema>>,
  res: Response,
  next?: NextFunction,
) => Promise<void | Response> | void | Response;

export type MagikGetRouteFn = (
  req: MagikGetRequest,
  res: Response,
  next?: NextFunction,
) => Promise<void | Response> | void | Response;

// ============================================================================
// Upload Configuration
// ============================================================================

export interface UploadConfig {
  field: string;
  multer: string;
  multi?: boolean;
}

// ============================================================================
// Route Definition
// ============================================================================

export interface RouteDefinition<Schema = unknown> {
  path?: PathSegment;
  method?: HTTPMethod;
  auth?: AuthTypes;
  validationSchema?: z.ZodSchema<Schema>;
  middlewares?: RequestHandler[];
  handler: (
    req: MagikRequest<Schema>,
    res: Response,
    next?: NextFunction,
  ) => Promise<unknown> | void;
  upload?: UploadConfig;
  useNext?: boolean;
}

// ============================================================================
// Typed Route Config (for createRoute factory)
// ============================================================================

export interface TypedRouteConfig<
  TSchema extends z.ZodSchema | undefined = undefined,
  TPath extends PathSegment = PathSegment,
> {
  path?: TPath;
  method?: HTTPMethod;
  auth?: AuthTypes;
  schema?: TSchema;
  handler: (
    req: TSchema extends z.ZodSchema
      ? MagikRequest<z.infer<TSchema>>
      : MagikGetRequest,
    res: Response,
    next?: NextFunction,
  ) => Promise<unknown> | void | Response;
  upload?: UploadConfig;
  middlewares?: RequestHandler[];
  useNext?: boolean;
}

// ============================================================================
// Route Configuration (legacy support)
// ============================================================================

export interface RouteConfig<
  Method extends HTTPMethod = HTTPMethod,
  Path extends PathSegment = PathSegment,
  Schema extends ValidationSchema | undefined = ValidationSchema | undefined,
> {
  path: Path;
  method: Method;
  auth?: AuthTypes;
  validationSchema?: Schema;
  route: Schema extends undefined
    ? (req: MagikGetRequest, res: Response) => Promise<void>
    : (
        req: MagikRequest<z.infer<NonNullable<Schema>>>,
        res: Response,
      ) => Promise<void>;
  upload?: UploadConfig;
}

// ============================================================================
// Auth Types (imported here for convenience)
// ============================================================================

export type AuthTypes =
  | 'ensureAuthenticated'
  | 'ensureAccessGranted'
  | 'ensureAdmin'
  | 'ensureIT'
  | 'ensureIsEmployee'
  | string[];
