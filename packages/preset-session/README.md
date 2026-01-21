# @magik_io/preset-session

Session middleware preset for Magik featuring Redis-backed sessions, Passport.js authentication, and flash messages.

## Installation

```bash
pnpm add @magik_io/preset-session
```

## Features

- 🔧 **Fully Configurable** - Customize all session components
- 💾 **Redis-Backed Sessions** - Persistent session storage with Redis
- 🔐 **Passport.js Integration** - Built-in authentication middleware
- 💬 **Flash Messages** - Session-based flash message support
- 🎯 **Priority Control** - Fine-tune middleware execution order
- ⚡ **Enable/Disable Components** - Only include what you need
- 🍪 **Cookie Customization** - Full control over session cookies

## Prerequisites

This preset requires a Redis connection. Make sure you have Redis installed and a client connection ready.

```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redisClient.connect();
```

## Usage

### Quick Start

```typescript
import { MagikServer } from '@magik_io/magik';
import { sessionPreset } from '@magik_io/preset-session';
import { createClient } from 'redis';

const redisClient = createClient();
await redisClient.connect();

const server = new MagikServer();
server.applyPreset(sessionPreset(redisClient));
```

### Custom Session Secret

```typescript
server.applyPreset(sessionPreset(redisClient, {
  session: {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: 'myapp.sid',
  }
}));
```

### Custom Priorities

Adjust the execution order of session middleware:

```typescript
server.applyPreset(sessionPreset(redisClient, {
  priority: {
    session: 85,
    passportInitialize: 80,
    passportSession: 79,
    flash: 78,
  }
}));
```

### Disable Specific Components

Only enable what you need:

```typescript
// Session and flash only, no Passport
server.applyPreset(sessionPreset(redisClient, {
  session: { enabled: true },
  passport: { enabled: false },
  flash: { enabled: true }
}));

// Session and Passport only, no flash messages
server.applyPreset(sessionPreset(redisClient, {
  session: { enabled: true },
  passport: { enabled: true },
  flash: { enabled: false }
}));
```

### Advanced Cookie Configuration

#### Production Secure Cookies

```typescript
server.applyPreset(sessionPreset(redisClient, {
  session: {
    cookie: {
      secure: true, // Requires HTTPS
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      domain: '.example.com',
      path: '/',
    }
  }
}));
```

#### Development Cookies

```typescript
server.applyPreset(sessionPreset(redisClient, {
  session: {
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60, // 1 hour
    }
  }
}));
```

### Session Options

#### Multiple Session Secrets (Key Rotation)

```typescript
server.applyPreset(sessionPreset(redisClient, {
  session: {
    secret: [
      process.env.SESSION_SECRET_NEW!,
      process.env.SESSION_SECRET_OLD!,
    ],
  }
}));
```

#### Rolling Sessions

```typescript
server.applyPreset(sessionPreset(redisClient, {
  session: {
    rolling: true, // Reset maxAge on every response
    resave: false,
    saveUninitialized: false,
  }
}));
```

#### Behind Proxy Configuration

```typescript
server.applyPreset(sessionPreset(redisClient, {
  session: {
    proxy: true, // Trust first proxy
    cookie: {
      secure: true,
    }
  }
}));
```

#### Session Destruction Behavior

```typescript
server.applyPreset(sessionPreset(redisClient, {
  session: {
    unset: 'destroy', // or 'keep'
  }
}));
```

### Passport Configuration

#### Custom User Property

```typescript
server.applyPreset(sessionPreset(redisClient, {
  passport: {
    enabled: true,
    userProperty: 'currentUser', // Default is 'user'
  }
}));

// Access in routes as req.currentUser instead of req.user
```

### Complete Configuration Example

```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

await redisClient.connect();

const isDevelopment = process.env.NODE_ENV === 'development';

server.applyPreset(sessionPreset(redisClient, {
  priority: {
    session: 80,
    passportInitialize: 75,
    passportSession: 74,
    flash: 73,
  },
  session: {
    enabled: true,
    secret: process.env.SESSION_SECRET || 'development-secret',
    name: 'app.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: !isDevelopment,
    cookie: {
      secure: !isDevelopment,
      httpOnly: true,
      sameSite: isDevelopment ? 'lax' : 'strict',
      maxAge: 1000 * 60 * 60 * 24 * (isDevelopment ? 1 : 7),
      domain: isDevelopment ? undefined : '.example.com',
    },
  },
  passport: {
    enabled: true,
  },
  flash: {
    enabled: true,
  },
}));
```

### Using Flash Messages

```typescript
// Set flash message
app.get('/login', (req, res) => {
  req.flash('error', 'Invalid credentials');
  res.redirect('/login');
});

// Get flash messages
app.get('/login', (req, res) => {
  const errors = req.flash('error');
  res.render('login', { errors });
});
```

### Environment-Based Configuration

```typescript
const sessionConfig: SessionOptions = {
  session: {
    secret: process.env.SESSION_SECRET!,
    name: process.env.SESSION_NAME || 'sessionId',
    cookie: {
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'),
      domain: process.env.COOKIE_DOMAIN,
    },
  },
};

server.applyPreset(sessionPreset(redisClient, sessionConfig));
```

## Default Configuration

The preset with no options is equivalent to:

```typescript
sessionPreset(redisClient, {
  priority: {
    session: 80,
    passportInitialize: 75,
    passportSession: 74,
    flash: 73,
  },
  session: {
    enabled: true,
    secret: 'change-this-secret',
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 86400000, // 24 hours
    },
  },
  passport: {
    enabled: true,
  },
  flash: {
    enabled: true,
  },
})
```

## API

### `sessionPreset(redisConnection, options?): MiddlewarePreset`

Factory function to create a session preset with Redis-backed storage.

#### Parameters

- **redisConnection** (required): `RedisClientType` - Connected Redis client instance
- **options** (optional): `SessionOptions` - Configuration options

#### Options

```typescript
interface SessionOptions {
  priority?: {
    session?: number;
    passportInitialize?: number;
    passportSession?: number;
    flash?: number;
  };
  session?: {
    enabled?: boolean;
    secret?: string | string[];
    name?: string;
    resave?: boolean;
    saveUninitialized?: boolean;
    cookie?: {
      path?: string;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none' | boolean;
      maxAge?: number;
      domain?: string;
    };
    rolling?: boolean;
    proxy?: boolean;
    unset?: 'destroy' | 'keep';
  };
  passport?: {
    enabled?: boolean;
    userProperty?: string;
  };
  flash?: {
    enabled?: boolean;
  };
}
```

## Session Components

### Express Session
Provides session support with Redis-backed storage for persistence across server restarts and load balancing.

### Passport.js
Authentication middleware that works seamlessly with sessions. Supports various authentication strategies.

### Connect Flash
Provides flash message support for displaying one-time messages (e.g., success messages, error messages) stored in the session.

## Dependencies

This preset automatically handles dependencies between middleware:
- Passport Initialize depends on Session
- Passport Session depends on Passport Initialize
- Flash depends on Session

## Best Practices

1. **Always use strong secrets** in production (use environment variables)
2. **Enable secure cookies** when behind HTTPS
3. **Use rolling sessions** for better security
4. **Set appropriate maxAge** based on your security requirements
5. **Configure proxy trust** when behind a reverse proxy
6. **Use Redis connection pooling** for better performance
7. **Implement Redis reconnection strategy** for reliability
8. **Monitor Redis connection** health

## Security Considerations

- Never commit session secrets to version control
- Use HTTPS in production with `secure: true` cookies
- Set `httpOnly: true` to prevent XSS attacks
- Use `sameSite: 'strict'` for maximum CSRF protection
- Implement session timeout and rotation
- Regularly rotate session secrets
- Monitor for session fixation attacks

## License

MIT
