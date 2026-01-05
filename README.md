# 🪄 Magik

A powerful, plugin-based Express server framework with decorator-based routing, middleware presets, and lifecycle events.

[![npm version](https://img.shields.io/npm/v/@anandamide/magik.svg)](https://www.npmjs.com/package/@anandamide/magik)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## Features

- **🔌 Plugin Architecture** - Extensible plugin system with lifecycle hooks
- **🎯 Decorator-based Routing** - Define routes using `@Router`, `@Get`, `@Post`, etc.
- **⚙️ Middleware Engine** - Category-based middleware with priority ordering and presets
- **📡 Event System** - Lifecycle events for server operations
- **✅ Zod Validation** - Type-safe request validation out of the box
- **🔒 Built-in Auth** - Authentication middleware helpers
- **🚀 Auto Route Discovery** - Automatically discovers and registers routes

## Installation

```bash
npm install @anandamide/magik
# or
yarn add @anandamide/magik
# or
pnpm add @anandamide/magik
```

## Quick Start

```typescript
import { MagikServer } from '@anandamide/magik';

const server = await MagikServer.init({
  name: 'my-api',
  port: 3000,
});

console.log(`Server running on port ${server.port}`);
```

## Decorator-Based Routing

Define routes using familiar decorators:

```typescript
import { Router, Get, Post, Delete } from '@anandamide/magik/decorators';
import { createRoute } from '@anandamide/magik/factories';
import { z } from 'zod';

@Router('/users')
export default class UserRouter {
  @Get('/')
  public listUsers() {
    return createRoute({
      handler: async (req, res) => {
        const users = await UserService.findAll();
        res.json(users);
      },
    });
  }

  @Get('/:id')
  public getUser() {
    return createRoute({
      auth: 'ensureAuthenticated',
      handler: async (req, res) => {
        const user = await UserService.findById(req.params.id);
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
        // req.body is fully typed from the schema
        const user = await UserService.create(req.body);
        res.status(201).json(user);
      },
    });
  }

  @Delete('/:id')
  public deleteUser() {
    return createRoute({
      auth: 'ensureAdmin',
      handler: async (req, res) => {
        await UserService.delete(req.params.id);
        res.status(204).send();
      },
    });
  }
}
```

## Plugin System

Extend Magik with plugins:

```typescript
import { MagikPlugin, IMagikServer } from '@anandamide/magik/types';

export class MyPlugin implements MagikPlugin {
  config = {
    name: 'my-plugin',
    version: '1.0.0',
    pluginDependencies: [], // Optional: other plugins this depends on
    requiredMiddleware: [], // Optional: middleware that must be registered
  };

  // Called when plugin is installed
  async onInstall(server: IMagikServer) {
    console.log('Plugin installed!');
  }

  // Called before server starts
  async beforeStart(server: IMagikServer) {
    console.log('Server about to start...');
  }

  // Called after server starts
  async afterStart(server: IMagikServer) {
    console.log('Server started!');
  }

  // Called before server shuts down
  async beforeShutdown(server: IMagikServer) {
    console.log('Server shutting down...');
  }

  // Register custom middleware
  registerMiddleware() {
    return [
      {
        name: 'my-middleware',
        category: 'custom',
        priority: 50,
        handler: (req, res, next) => {
          req.customData = 'hello';
          next();
        },
      },
    ];
  }

  // Register plugin routes
  registerRoutes() {
    return {
      '/my-plugin': [
        {
          path: '/status',
          method: 'get',
          handler: (req, res) => res.json({ status: 'ok' }),
        },
      ],
    };
  }

  // React to server events
  onEvent = {
    routesLoaded: (server: IMagikServer) => {
      console.log('All routes loaded!');
    },
  };
}

// Use the plugin
const server = await MagikServer.init({ name: 'my-api' });
await server.use(new MyPlugin());
```

## Middleware Engine

Magik organizes middleware into categories with priority ordering:

### Categories

| Category | Priority Range | Purpose |
|----------|---------------|---------|
| `security` | 90-100 | Helmet, CORS, rate limiting |
| `session` | 70-89 | Session management, cookies |
| `parser` | 80-89 | Body parsing, JSON, URL-encoded |
| `compression` | 60-69 | Response compression |
| `logging` | 50-59 | Request logging, Morgan |
| `static` | 40-49 | Static file serving |
| `custom` | 0-39 | Custom application middleware |

### Built-in Presets

```typescript
// Magik comes with these presets pre-configured:

// Security Preset
// - Helmet (security headers)
// - CORS

// Parser Preset
// - JSON parser (20mb limit)
// - URL-encoded parser
// - Cookie parser
// - Method override

// Session Preset (when using PassportAuthenticationPlugin)
// - Express session
// - Passport initialization
```

### Custom Middleware

```typescript
server.middlewareEngine.register({
  name: 'request-timer',
  category: 'logging',
  priority: 55,
  handler: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.path} - ${Date.now() - start}ms`);
    });
    next();
  },
});
```

## Authentication

Built-in authentication middleware:

```typescript
@Router('/admin')
export default class AdminRouter {
  @Get('/dashboard')
  public dashboard() {
    return createRoute({
      // Require any authenticated user
      auth: 'ensureAuthenticated',
      handler: (req, res) => {
        res.render('dashboard', { user: req.user });
      },
    });
  }

  @Post('/settings')
  public updateSettings() {
    return createRoute({
      // Require admin role
      auth: 'ensureAdmin',
      handler: (req, res) => {
        // Only admins can access this
      },
    });
  }

  @Get('/system')
  public systemStatus() {
    return createRoute({
      // Require IT role
      auth: 'ensureIT',
      handler: (req, res) => {
        // Only IT staff can access this
      },
    });
  }

  @Post('/reports')
  public generateReport() {
    return createRoute({
      // Require specific roles (array)
      auth: ['manager', 'analyst'],
      handler: (req, res) => {
        // Only managers or analysts can access this
      },
    });
  }
}
```

### Available Auth Types

| Type | Description |
|------|-------------|
| `ensureAuthenticated` | Any logged-in user |
| `ensureAdmin` | Admin role required |
| `ensureIT` | IT role required |
| `ensureIsEmployee` | Employee role required |
| `ensureAccessGranted` | Custom access check |
| `['role1', 'role2']` | Any of the specified roles |

## Request Validation with Zod

Type-safe validation with automatic TypeScript inference:

```typescript
import { z } from 'zod';

@Router('/orders')
export default class OrderRouter {
  @Post('/')
  public createOrder() {
    return createRoute({
      auth: 'ensureAuthenticated',
      schema: z.object({
        items: z.array(z.object({
          productId: z.string(),
          quantity: z.number().int().positive(),
        })).min(1),
        shippingAddress: z.object({
          street: z.string(),
          city: z.string(),
          state: z.string(),
          zip: z.string().regex(/^\d{5}(-\d{4})?$/),
        }),
        notes: z.string().optional(),
      }),
      handler: async (req, res) => {
        // req.body is fully typed:
        // {
        //   items: Array<{ productId: string; quantity: number }>;
        //   shippingAddress: { street: string; city: string; state: string; zip: string };
        //   notes?: string;
        // }
        const order = await OrderService.create(req.body);
        res.status(201).json(order);
      },
    });
  }
}
```

## Event System

React to server lifecycle events:

```typescript
// In a plugin
onEvent = {
  beforeStart: async (server) => {
    await initializeExternalConnections();
  },
  afterStart: async (server) => {
    console.log(`Server listening on ${server.port}`);
  },
  beforeStop: async (server) => {
    await closeExternalConnections();
  },
  afterStop: async (server) => {
    console.log('Server stopped');
  },
  routesLoaded: (server) => {
    const { total } = server.routerManager.getRouteCount();
    console.log(`Loaded ${total} routes`);
  },
  error: (server, error) => {
    console.error('Server error:', error);
  },
};

// Or directly on the event engine
server.eventEngine.on('routesLoaded', () => {
  console.log('Routes are ready!');
});
```

### Available Events

| Event | Description |
|-------|-------------|
| `beforeStart` | Before server starts listening |
| `afterStart` | After server is listening |
| `beforeStop` | Before graceful shutdown |
| `afterStop` | After server has stopped |
| `routesLoaded` | All routes registered |
| `error` | Unhandled error occurred |
| `request` | Incoming request |
| `response` | Outgoing response |
| `serverError` | Server-level error |
| `serverListening` | Server bound to port |
| `serverPortError` | Port permission error |
| `serverPortInUse` | Port already in use |

## File Uploads

Handle file uploads with Multer integration:

```typescript
@Router('/uploads')
export default class UploadRouter {
  @Post('/avatar')
  public uploadAvatar() {
    return createRoute({
      auth: 'ensureAuthenticated',
      upload: {
        field: 'avatar',
        multer: 'imageUpload', // Configured multer instance
        multi: false,
      },
      handler: async (req, res) => {
        const file = req.file;
        const url = await StorageService.upload(file);
        res.json({ url });
      },
    });
  }

  @Post('/documents')
  public uploadDocuments() {
    return createRoute({
      auth: 'ensureAuthenticated',
      upload: {
        field: 'documents',
        multer: 'documentUpload',
        multi: true, // Multiple files
      },
      handler: async (req, res) => {
        const files = req.files;
        const urls = await Promise.all(
          files.map(f => StorageService.upload(f))
        );
        res.json({ urls });
      },
    });
  }
}
```

## Built-in Plugins

Magik includes several built-in plugins:

### ErrorHandlingPlugin

Global error handling with pretty error pages in development:

```typescript
import { ErrorHandlingPlugin } from '@anandamide/magik/plugins';

await server.use(new ErrorHandlingPlugin());
```

### GracefulShutdownPlugin

Handles SIGTERM/SIGINT for graceful shutdown:

```typescript
import { GracefulShutdownPlugin } from '@anandamide/magik/plugins';

await server.use(new GracefulShutdownPlugin());
```

### RateLimiterPlugin

Rate limiting for API endpoints:

```typescript
import { RateLimiterPlugin } from '@anandamide/magik/plugins';

await server.use(new RateLimiterPlugin({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
}));
```

### DebugPlugin

Debug logging and route inspection:

```typescript
import { DebugPlugin } from '@anandamide/magik/plugins';

await server.use(new DebugPlugin());
```

## Configuration

```typescript
interface MagikServerConfig {
  name: string;           // Server name (required)
  port?: number;          // Port (default: process.env.PORT || 5000)
  debug?: boolean;        // Enable debug logging
  mode?: 'development' | 'production';
}

const server = await MagikServer.init({
  name: 'my-api',
  port: 3000,
  debug: true,
  mode: 'development',
});
```

## API Reference

### MagikServer

```typescript
class MagikServer {
  // Static initializer
  static async init(config: MagikServerConfig): Promise<MagikServer>;

  // Properties
  name: string;
  app: Express;
  server: http.Server;
  port: number;
  status: 'ONLINE' | 'OFFLINE' | 'SHUTTING DOWN';
  DEBUG: boolean;
  DevMode: boolean;

  // Engines
  routerManager: RouterManager;
  middlewareEngine: MiddlewareEngine;
  eventEngine: EventEngine;

  // Methods
  use(plugin: MagikPlugin): Promise<this>;
  listen(): Promise<void>;
  close(): Promise<void>;
}
```

### RouterManager

```typescript
class RouterManager {
  register(prefix: PathSegment): RouteEngine;
  getRoute(prefix: PathSegment): RouteEngine | undefined;
  getRouteCount(): { total: number; byPrefix: Record<string, number> };
  getRouteCountByMethod(): Record<'get' | 'post' | 'put' | 'delete', number>;
  installRoutes(): void;
}
```

### MiddlewareEngine

```typescript
class MiddlewareEngine {
  register(config: MiddlewareConfig): this;
  registerBulk(configs: MiddlewareConfig[]): this;
  hasMiddleware(name: string): boolean;
  applyCategory(category: MiddlewareCategory): this;
  getAuthMiddleware(auth: AuthTypes): RequestHandler;
}
```

### EventEngine

```typescript
class EventEngine {
  on(event: ServerEvent, handler: Function): this;
  off(event: ServerEvent, handler: Function): this;
  emit(event: ServerEvent, ...args: any[]): boolean;
  emitAsync(event: ServerEvent, ...args: any[]): Promise<void>;
  clearHandlers(event?: ServerEvent): this;
}
```

## Project Structure

```
src/
├── routes/              # Route files (auto-discovered)
│   ├── userRoute.ts
│   ├── orderRoute.ts
│   └── admin/
│       └── adminRoute.ts
├── controllers/         # Business logic
├── middleware/          # Custom middleware
├── plugins/             # Custom plugins
└── index.ts             # Entry point
```

## TypeScript Support

Magik is written in TypeScript and provides full type definitions:

```typescript
import type {
  MagikPlugin,
  MagikPluginConfig,
  IMagikServer,
  RouteDefinition,
  MiddlewareConfig,
  MiddlewareCategory,
  AuthTypes,
  ServerEvent,
  PathSegment,
  MagikRequest,
  MagikGetRequest,
} from '@anandamide/magik/types';
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [MagikIO](https://github.com/MagikIO)

---

Made with 🪄 by the MagikIO team
