# @magik_io/preset-parser

Parser middleware preset for Magik featuring JSON, URL-encoded, cookie parsing, and HTTP method override support.

## Installation

```bash
pnpm add @magik_io/preset-parser
```

## Features

- 🔧 **Fully Configurable** - Customize each parser independently
- 📦 **JSON Parser** - Parse JSON request bodies with configurable limits
- 🔗 **URL-encoded Parser** - Handle form submissions and query strings
- 🍪 **Cookie Parser** - Parse cookies with optional signing
- 🔄 **Method Override** - Support PUT/DELETE via POST forms
- 🎯 **Priority Control** - Fine-tune middleware execution order
- ⚡ **Enable/Disable Parsers** - Only include what you need

## Usage

### Quick Start (Default Preset)

Use the default preset with all parsers enabled:

```typescript
import { MagikServer } from '@magik_io/magik';
import { DefaultParserPreset } from '@magik_io/preset-parser';

const server = new MagikServer();
server.applyPreset(DefaultParserPreset);
```

### Configurable Preset

Customize parser behavior with the factory function:

```typescript
import { parserPreset } from '@magik_io/preset-parser';

// Increase JSON body limit
server.applyPreset(parserPreset({
  json: {
    limit: '50mb'
  }
}));

// Use extended URL-encoded parsing
server.applyPreset(parserPreset({
  urlencoded: {
    extended: true
  }
}));

// Add cookie secret for signed cookies
server.applyPreset(parserPreset({
  cookie: {
    secret: 'my-secret-key'
  }
}));
```

### Custom Priorities

Adjust the execution order of parsers:

```typescript
server.applyPreset(parserPreset({
  priority: {
    json: 90,
    urlencoded: 89,
    cookie: 88,
    methodOverride: 87
  }
}));
```

### Disable Specific Parsers

Only enable the parsers you need:

```typescript
// Only JSON and cookies, no URL-encoded or method override
server.applyPreset(parserPreset({
  json: { enabled: true },
  urlencoded: { enabled: false },
  cookie: { enabled: true },
  methodOverride: { enabled: false }
}));
```

### Advanced JSON Parser Options

```typescript
server.applyPreset(parserPreset({
  json: {
    limit: '10mb',
    strict: true, // Only accept arrays and objects
    type: 'application/json', // Custom content type
    verify: (req, res, buf, encoding) => {
      // Custom verification logic
      console.log('Received JSON:', buf.length, 'bytes');
    }
  }
}));
```

### Advanced URL-encoded Parser Options

```typescript
server.applyPreset(parserPreset({
  urlencoded: {
    extended: true, // Use qs library for rich objects
    limit: '5mb',
    parameterLimit: 10000,
    type: 'application/x-www-form-urlencoded'
  }
}));
```

### Signed Cookies

Enable cookie signing with a secret:

```typescript
server.applyPreset(parserPreset({
  cookie: {
    secret: 'my-secret-key',
    options: {
      decode: (val) => val // Custom decoder
    }
  }
}));

// Multiple secrets for key rotation
server.applyPreset(parserPreset({
  cookie: {
    secret: ['new-secret', 'old-secret']
  }
}));
```

### Method Override Configuration

```typescript
// Use query parameter instead
server.applyPreset(parserPreset({
  methodOverride: {
    getter: 'X-HTTP-Method-Override', // Header-based
    methods: ['POST'] // Only override POST requests
  }
}));

// Custom getter function
server.applyPreset(parserPreset({
  methodOverride: {
    getter: (req, res) => {
      if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        return method;
      }
    }
  }
}));
```

### Complete Configuration Example

```typescript
server.applyPreset(parserPreset({
  priority: {
    json: 90,
    urlencoded: 89,
    cookie: 88,
    methodOverride: 87
  },
  json: {
    enabled: true,
    limit: '50mb',
    strict: true
  },
  urlencoded: {
    enabled: true,
    extended: true,
    limit: '50mb',
    parameterLimit: 100000
  },
  cookie: {
    enabled: true,
    secret: process.env.COOKIE_SECRET
  },
  methodOverride: {
    enabled: true,
    getter: '_method'
  }
}));
```

## Default Configuration

The default preset is equivalent to:

```typescript
parserPreset({
  priority: {
    json: 85,
    urlencoded: 84,
    cookie: 83,
    methodOverride: 82
  },
  json: {
    enabled: true,
    limit: '20mb',
    strict: true
  },
  urlencoded: {
    enabled: true,
    extended: false,
    limit: '20mb',
    parameterLimit: 50000
  },
  cookie: {
    enabled: true
  },
  methodOverride: {
    enabled: true,
    getter: '_method'
  }
})
```

## API

### `parserPreset(options?: ParserOptions): MiddlewarePreset`

Factory function to create a customized parser preset.

#### Options

```typescript
interface ParserOptions {
  priority?: {
    json?: number;
    urlencoded?: number;
    cookie?: number;
    methodOverride?: number;
  };
  json?: {
    enabled?: boolean;
    limit?: string | number;
    strict?: boolean;
    type?: string | string[] | ((req: any) => boolean);
    verify?: (req: any, res: any, buf: Buffer, encoding: string) => void;
  };
  urlencoded?: {
    enabled?: boolean;
    extended?: boolean;
    limit?: string | number;
    parameterLimit?: number;
    type?: string | string[] | ((req: any) => boolean);
  };
  cookie?: {
    enabled?: boolean;
    secret?: string | string[];
    options?: cookieParser.CookieParseOptions;
  };
  methodOverride?: {
    enabled?: boolean;
    getter?: string | ((req: any, res: any) => string);
    methods?: string[];
  };
}
```

### `DefaultParserPreset: MiddlewarePreset`

Pre-configured preset with all parsers enabled at default priorities.

## Parser Details

### JSON Parser
Parses incoming requests with JSON payloads based on body-parser.

### URL-encoded Parser
Parses incoming requests with URL-encoded payloads (form submissions).

### Cookie Parser
Parses Cookie header and populates `req.cookies` with an object keyed by cookie names.

### Method Override
Allows you to use HTTP verbs such as PUT or DELETE in places where the client doesn't support it (e.g., HTML forms).

## License

MIT
