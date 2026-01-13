# Magik

A powerful, plugin-based Express server framework with decorator-based routing, database adapters, and opt-in middleware presets.

[![npm version](https://img.shields.io/npm/v/@magikio/magik.svg)](https://www.npmjs.com/package/@magikio/magik)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## Features

- **Database Agnostic** - Repository pattern with adapter support (Mongoose, PostgreSQL, etc.)
- **Opt-in Middleware** - Presets are explicit, not auto-loaded
- **Flexible Auth** - User adapter pattern for any user model
- **Plugin Architecture** - Extensible plugin system with lifecycle hooks
- **Decorator Routing** - Define routes using `@Router`, `@Get`, `@Post`, etc.
- **Type-Safe** - Full TypeScript support with generics throughout

## Installation

```bash
npm install @magikio/magik
# or
pnpm add @magikio/magik
```

## Quick Start

```typescript
import { MagikServer, allPresets } from '@magikio/magik';

const server = await MagikServer.init({
  name: 'my-api',
  port: 3000,
  presets: allPresets, // Opt-in to security + parser presets
});

console.log(`Server running on port ${server.port}`);
```

## Configuration

```typescript
import { MagikServer, allPresets, securityPreset, parserPreset } from '@magikio/magik';
import { MongooseAdapter } from '@magikio/mongoose-adapter';

const server = await MagikServer.init({
  name: 'my-api',
  port: 3000,
  debug: true,
  mode: 'development',

  // Middleware presets are opt-in (not auto-loaded)
  presets: [securityPreset, parserPreset],
  // Or use allPresets for all built-in presets

  // Optional: Database configuration
  database: {
    adapter: new MongooseAdapter(),
    primaryService: 'main',
    connectionOptions: {
      uri: process.env.MONGO_URI!,
    },
  },

  // Optional: Authentication configuration
  auth: {
    handlers: {
      ensureAuthenticated: (req, res, next) => {
        if (req.user) return next();
        res.status(401).json({ error: 'Unauthorized' });
      },
      ensureAdmin: (req, res, next) => {
        if (req.user?.role === 'admin') return next();
        res.status(403).json({ error: 'Forbidden' });
      },
    },
    roleHandler: (roles) => (req, res, next) => {
      if (roles.includes(req.user?.role)) return next();
      res.status(403).json({ error: 'Forbidden' });
    },
  },

  // Optional: Plugins
  plugins: [
    new ErrorHandlingPlugin(),
    new GracefulShutdownPlugin(),
  ],
});
```

## Database Adapters

Magik uses the adapter pattern for database-agnostic data access. This allows you to switch databases (e.g., from MongoDB to PostgreSQL) without changing your route handlers.

### Using the Mongoose Adapter

```typescript
import { MongooseAdapter } from '@magikio/mongoose-adapter';
import { Schema } from 'mongoose';

// Define your schema
const UserSchema = new Schema({
  email: { type: String, required: true },
  name: String,
  role: { type: String, default: 'user' },
});

// Create adapter and connect
const adapter = new MongooseAdapter<'main'>();

const server = await MagikServer.init({
  name: 'my-api',
  database: {
    adapter,
    primaryService: 'main',
    connectionOptions: { uri: process.env.MONGO_URI! },
  },
  presets: allPresets,
});

// Register repositories after connection
const userRepo = adapter.registerRepository<User>('main', 'users', UserSchema);

// Use in routes
const user = await userRepo.findById('123');
const users = await userRepo.findMany({ role: 'admin' }, { limit: 10 });
await userRepo.create({ email: 'test@example.com', name: 'Test User' });
```

### Repository Interface

All repositories implement a common interface for portability:

```typescript
interface IRepository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  findOne(query: Partial<T>): Promise<T | null>;
  findMany(query: Partial<T>, options?: QueryOptions): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  createMany(data: Omit<T, 'id'>[]): Promise<T[]>;
  update(id: TId, data: Partial<T>): Promise<T | null>;
  updateMany(query: Partial<T>, data: Partial<T>): Promise<number>;
  delete(id: TId): Promise<boolean>;
  deleteMany(query: Partial<T>): Promise<number>;
  count(query?: Partial<T>): Promise<number>;
  exists(query: Partial<T>): Promise<boolean>;
}
```

## Authentication

### Basic Auth Configuration

```typescript
const server = await MagikServer.init({
  name: 'my-api',
  auth: {
    handlers: {
      ensureAuthenticated: (req, res, next) => {
        if (req.user) return next();
        res.status(401).json({ error: 'Unauthorized' });
      },
      ensureAdmin: (req, res, next) => {
        if (req.user?.isAdmin) return next();
        res.status(403).json({ error: 'Forbidden' });
      },
    },
    // For role-based auth using arrays
    roleHandler: (roles) => (req, res, next) => {
      const userRoles = req.user?.roles ?? [];
      if (roles.some(r => userRoles.includes(r))) return next();
      res.status(403).json({ error: 'Forbidden' });
    },
  },
  presets: allPresets,
});
```

### Using User Adapters

For more complex auth scenarios, use the user adapter pattern:

```typescript
import {
  MagikServer,
  IUserAdapter,
  createRoleMiddleware,
  createRoleHandlerFactory,
} from '@magikio/magik';

// Define your user type
interface MyUser {
  id: string;
  groups: string;
  accessLevel: 'full' | 'limited' | null;
  twoFactor?: { enabled: boolean; authenticated: boolean };
}

// Implement the adapter
class MyUserAdapter implements IUserAdapter<MyUser> {
  getRoles(user: MyUser) {
    return [user.groups];
  }

  getPermissions(user: MyUser) {
    return user.accessLevel ? [user.accessLevel] : [];
  }

  hasRole(user: MyUser, role: string) {
    return user.groups === role;
  }

  hasPermission(user: MyUser, permission: string) {
    return user.accessLevel === permission;
  }

  // Optional: 2FA support
  requiresTwoFactor(user: MyUser) {
    return user.twoFactor?.enabled === true;
  }

  hasTwoFactorPassed(user: MyUser) {
    return user.twoFactor?.authenticated === true;
  }
}

const userAdapter = new MyUserAdapter();

const server = await MagikServer.init({
  name: 'my-api',
  auth: {
    userAdapter,
    handlers: {
      ensureAuthenticated: createAuthenticatedMiddleware(userAdapter),
      ensureAdmin: createRoleMiddleware(userAdapter, ['Admin', 'IT']),
    },
    roleHandler: createRoleHandlerFactory(userAdapter),
  },
  presets: allPresets,
});
```

### Auth Helper Functions

```typescript
import {
  createRoleMiddleware,        // Requires ANY of the specified roles
  createAllRolesMiddleware,    // Requires ALL of the specified roles
  createPermissionMiddleware,  // Requires ANY of the specified permissions
  createAllPermissionsMiddleware,
  createAuthenticatedMiddleware,
  createTwoFactorMiddleware,
  createRoleHandlerFactory,    // For AuthConfig.roleHandler
} from '@magikio/magik';

// Example usage
const requireAdmin = createRoleMiddleware(userAdapter, ['Admin']);
const requireManager = createAllRolesMiddleware(userAdapter, ['Manager', 'Verified']);
const require2FA = createTwoFactorMiddleware(userAdapter);
```

## Middleware Presets

Presets are **opt-in** and must be explicitly included in your configuration:

```typescript
import {
  MagikServer,
  allPresets,       // All built-in presets
  securityPreset,   // Helmet, CORS
  parserPreset,     // JSON, URL-encoded parsers
} from '@magikio/magik';

// Use all presets
const server = await MagikServer.init({
  name: 'my-api',
  presets: allPresets,
});

// Or pick specific ones
const server = await MagikServer.init({
  name: 'my-api',
  presets: [securityPreset], // Only security, no parsers
});

// Or no presets (configure everything manually)
const server = await MagikServer.init({
  name: 'my-api',
  presets: [],
});
```

### Available Presets

| Preset | Middleware |
|--------|------------|
| `securityPreset` | Helmet (security headers), CORS |
| `parserPreset` | JSON parser, URL-encoded parser |

### Additional Preset Packages

Install additional presets as needed:

```bash
# Session management
pnpm add @magikio/preset-session

# Redis session store
pnpm add @magikio/session-redis

# S3 file uploads
pnpm add @magikio/upload-s3
```

```typescript
import { createSessionPreset } from '@magikio/preset-session';
import { RedisStore } from 'connect-redis';

const server = await MagikServer.init({
  name: 'my-api',
  presets: [
    securityPreset,
    parserPreset,
    createSessionPreset({
      store: new RedisStore({ client: redisClient }),
      secret: process.env.SESSION_SECRET!,
      cookieName: 'my-app.sid',
    }),
  ],
});
```

## Decorator-Based Routing

```typescript
import { Router, Get, Post, Delete } from '@magikio/magik/decorators';
import { createRoute } from '@magikio/magik/factories';
import { z } from 'zod';

@Router('/users')
export default class UserRouter {
  @Get('/')
  public listUsers() {
    return createRoute({
      handler: async (req, res) => {
        const users = await userRepo.findMany({});
        res.json(users);
      },
    });
  }

  @Get('/:id')
  public getUser() {
    return createRoute({
      auth: 'ensureAuthenticated',
      handler: async (req, res) => {
        const user = await userRepo.findById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Not found' });
        res.json(user);
      },
    });
  }

  @Post('/')
  public createUser() {
    return createRoute({
      auth: 'ensureAdmin',
      schema: z.object({
        email: z.string().email(),
        name: z.string().min(2),
        role: z.enum(['user', 'admin']).optional(),
      }),
      handler: async (req, res) => {
        const user = await userRepo.create(req.body);
        res.status(201).json(user);
      },
    });
  }

  @Delete('/:id')
  public deleteUser() {
    return createRoute({
      auth: ['Admin', 'IT'], // Role array - requires any of these
      handler: async (req, res) => {
        await userRepo.delete(req.params.id);
        res.status(204).send();
      },
    });
  }
}
```

## Plugin System

```typescript
import { MagikPlugin, IMagikServer } from '@magikio/magik/types';

export class MyPlugin implements MagikPlugin {
  config = {
    name: 'my-plugin',
    version: '1.0.0',
  };

  async onInstall(server: IMagikServer) {
    console.log('Plugin installed!');
  }

  async beforeStart(server: IMagikServer) {
    // Before server starts listening
  }

  async afterStart(server: IMagikServer) {
    // After server is listening
  }

  async beforeShutdown(server: IMagikServer) {
    // Before graceful shutdown
  }

  registerMiddleware() {
    return [{
      name: 'my-middleware',
      category: 'custom',
      priority: 50,
      handler: (req, res, next) => {
        req.customData = 'hello';
        next();
      },
    }];
  }

  registerRoutes() {
    return {
      '/my-plugin': [{
        path: '/status',
        method: 'get',
        handler: (req, res) => res.json({ status: 'ok' }),
      }],
    };
  }
}

// Use the plugin
await server.use(new MyPlugin());
```

## Built-in Plugins

```typescript
import {
  ErrorHandlingPlugin,
  GracefulShutdownPlugin,
  RateLimiterPlugin,
  DebugPlugin,
} from '@magikio/magik/plugins';

// Error handling with pretty pages in development
await server.use(new ErrorHandlingPlugin());

// Graceful SIGTERM/SIGINT handling
await server.use(new GracefulShutdownPlugin());

// Rate limiting
await server.use(new RateLimiterPlugin({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
}));

// Debug logging
await server.use(new DebugPlugin());
```

## Event System

```typescript
// In a plugin
registerEvents() {
  return {
    beforeStart: async (server) => {
      await initializeConnections();
    },
    afterStart: async (server) => {
      console.log(`Listening on ${server.port}`);
    },
    routesLoaded: (server) => {
      const { total } = server.routerManager.getRouteCount();
      console.log(`Loaded ${total} routes`);
    },
  };
}

// Or directly
server.eventEngine.on('routesLoaded', () => {
  console.log('Routes ready!');
});
```

## TypeScript Types

```typescript
import type {
  // Server
  MagikServerConfig,
  IMagikServer,

  // Database
  IMagikDatabaseAdapter,
  IRepository,
  IRepositoryRegistry,
  QueryOptions,

  // Auth
  AuthConfig,
  IUserAdapter,

  // Middleware
  MiddlewareConfig,
  MiddlewarePreset,
  MiddlewareCategory,

  // Routes
  RouteDefinition,
  PathSegment,
  MagikRequest,

  // Plugins
  MagikPlugin,
  MagikPluginConfig,

  // Events
  ServerEvent,
} from '@magikio/magik';
```

## Migration from v0.x

If upgrading from a version with auto-loaded presets:

```typescript
// Before (v0.x) - presets auto-loaded
const server = await MagikServer.init({
  name: 'my-api',
});

// After (v1.x) - presets are opt-in
import { allPresets } from '@magikio/magik';

const server = await MagikServer.init({
  name: 'my-api',
  presets: allPresets, // Explicitly include presets
});
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md).

## License

MIT
