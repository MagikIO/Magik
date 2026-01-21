# @magik_io/preset-security

Security middleware preset for Magik featuring Helmet and CORS protection.

## Installation

```bash
pnpm add @magik_io/preset-security
```

## Features

- 🔧 **Fully Configurable** - Customize Helmet and CORS independently
- 🛡️ **Helmet Security** - Secure HTTP headers with comprehensive options
- 🌐 **CORS Support** - Configure cross-origin resource sharing
- 🎯 **Priority Control** - Fine-tune middleware execution order
- ⚡ **Enable/Disable** - Only include what you need
- 🔒 **Production Ready** - Sensible security defaults

## Usage

### Quick Start (Default Preset)

Use the default preset with balanced security settings:

```typescript
import { MagikServer } from '@magik_io/magik';
import { DefaultSecurityPreset } from '@magik_io/preset-security';

const server = new MagikServer();
server.applyPreset(DefaultSecurityPreset);
```

### Configurable Preset

Customize security behavior with the factory function:

```typescript
import { securityPreset } from '@magik_io/preset-security';

// Basic customization
server.applyPreset(securityPreset({
  priority: {
    helmet: 95,
    cors: 85
  }
}));
```

### Custom Priorities

Adjust the execution order:

```typescript
server.applyPreset(securityPreset({
  priority: {
    helmet: 100,
    cors: 90
  }
}));
```

### Disable Specific Middleware

Only enable what you need:

```typescript
// Only Helmet, no CORS
server.applyPreset(securityPreset({
  helmet: { enabled: true },
  cors: { enabled: false }
}));

// Only CORS, no Helmet
server.applyPreset(securityPreset({
  helmet: { enabled: false },
  cors: { enabled: true }
}));
```

### Advanced Helmet Configuration

#### Enable Content Security Policy

```typescript
server.applyPreset(securityPreset({
  helmet: {
    options: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    },
  },
}));
```

#### Strict Security Headers

```typescript
server.applyPreset(securityPreset({
  helmet: {
    options: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "same-origin" },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: "none" },
      referrerPolicy: { policy: "no-referrer" },
      xssFilter: true,
    },
  },
}));
```

#### Development-Friendly Settings

```typescript
server.applyPreset(securityPreset({
  helmet: {
    options: {
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
    },
  },
}));
```

### Advanced CORS Configuration

#### Allow Specific Origins

```typescript
server.applyPreset(securityPreset({
  cors: {
    options: {
      origin: ['https://example.com', 'https://app.example.com'],
      credentials: true,
    },
  },
}));
```

#### Dynamic Origin Validation

```typescript
server.applyPreset(securityPreset({
  cors: {
    options: {
      origin: (origin, callback) => {
        const allowedOrigins = ['https://example.com', 'https://app.example.com'];
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
  },
}));
```

#### Custom CORS Headers

```typescript
server.applyPreset(securityPreset({
  cors: {
    options: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
      credentials: true,
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  },
}));
```

#### CORS for Public API

```typescript
server.applyPreset(securityPreset({
  cors: {
    options: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: false,
    },
  },
}));
```

### Complete Configuration Example

```typescript
server.applyPreset(securityPreset({
  priority: {
    helmet: 100,
    cors: 90,
  },
  helmet: {
    enabled: true,
    options: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "https://cdn.example.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    },
  },
  cors: {
    enabled: true,
    options: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
  },
}));
```

### Environment-Based Configuration

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

server.applyPreset(securityPreset({
  helmet: {
    options: isDevelopment
      ? {
          contentSecurityPolicy: false,
          crossOriginResourcePolicy: false,
        }
      : {
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
            },
          },
          hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
          },
        },
  },
  cors: {
    options: {
      origin: isDevelopment ? '*' : process.env.ALLOWED_ORIGINS?.split(','),
      credentials: !isDevelopment,
    },
  },
}));
```

## Default Configuration

The default preset is equivalent to:

```typescript
securityPreset({
  priority: {
    helmet: 100,
    cors: 90,
  },
  helmet: {
    enabled: true,
    options: {
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
      xPoweredBy: false,
      referrerPolicy: {
        policy: [
          'origin',
          'strict-origin-when-cross-origin',
          'unsafe-url',
          'no-referrer',
        ],
      },
    },
  },
  cors: {
    enabled: true,
    options: {},
  },
})
```

## API

### `securityPreset(options?: SecurityOptions): MiddlewarePreset`

Factory function to create a customized security preset.

#### Options

```typescript
interface SecurityOptions {
  priority?: {
    helmet?: number;
    cors?: number;
  };
  helmet?: {
    enabled?: boolean;
    options?: HelmetOptions;
  };
  cors?: {
    enabled?: boolean;
    options?: CorsOptions;
  };
}
```

### `DefaultSecurityPreset: MiddlewarePreset`

Pre-configured preset with balanced security settings at default priorities.

## Security Components

### Helmet
Sets various HTTP headers to help protect your app from common web vulnerabilities:
- Content Security Policy
- X-Frame-Options
- Strict-Transport-Security
- X-Content-Type-Options
- And many more...

### CORS
Enables Cross-Origin Resource Sharing with configurable options:
- Origin validation
- Credentials support
- Custom headers
- Method restrictions
- Preflight request handling

## Best Practices

1. **Start with defaults** and gradually customize based on your needs
2. **Enable CSP** in production for maximum security
3. **Use strict CORS** policies in production
4. **Test thoroughly** when enabling strict security headers
5. **Monitor errors** to catch overly restrictive policies
6. **Use environment variables** for different environments

## License

MIT
