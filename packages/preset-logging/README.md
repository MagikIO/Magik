# @magik_io/preset-logging

Logging middleware preset for Magik featuring beautiful colorized HTTP request logging powered by morgan.

## Installation

```bash
pnpm add @magik_io/preset-logging
```

## Features

- 🎨 **Beautiful Colorized Output** - Eye-catching color schemes for different HTTP methods
- 🔧 **Fully Configurable** - Customize colors, formats, and morgan options
- 🚀 **Multiple Formats** - Support for morgan's built-in formats or custom functions
- 🎯 **Priority Control** - Set middleware execution order
- 📊 **Request Filtering** - Skip logging for specific requests

## Usage

### Quick Start (Default Preset)

Use the default preset with vibrant colorized logging:

```typescript
import { MagikServer } from '@magik_io/magik';
import { DefaultLoggingPreset } from '@magik_io/preset-logging';

const server = new MagikServer();
server.applyPreset(DefaultLoggingPreset);
```

### Configurable Preset

Customize the logging behavior with the factory function:

```typescript
import { loggingPreset } from '@magik_io/preset-logging';

// Custom priority
server.applyPreset(loggingPreset({ priority: 80 }));

// Minimal color scheme
server.applyPreset(loggingPreset({ colorScheme: 'minimal' }));

// Monochrome (no colors)
server.applyPreset(loggingPreset({ colorScheme: 'monochrome' }));

// Disable colors completely
server.applyPreset(loggingPreset({ enableColors: false }));
```

### Morgan Built-in Formats

Use any of morgan's standard formats:

```typescript
// Development format
server.applyPreset(loggingPreset({ format: 'dev' }));

// Apache combined format
server.applyPreset(loggingPreset({ format: 'combined' }));

// Apache common format
server.applyPreset(loggingPreset({ format: 'common' }));

// Short format
server.applyPreset(loggingPreset({ format: 'short' }));

// Minimal format
server.applyPreset(loggingPreset({ format: 'tiny' }));
```

### Advanced Options

#### Skip Certain Requests

```typescript
server.applyPreset(loggingPreset({
  skip: (req, res) => res.statusCode < 400 // Only log errors
}));
```

#### Custom Output Stream

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

server.applyPreset(loggingPreset({
  stream: accessLogStream
}));
```

#### Immediate Logging

Log requests immediately instead of on response:

```typescript
server.applyPreset(loggingPreset({
  immediate: true
}));
```

#### Custom Format Function

Create your own custom logging format:

```typescript
server.applyPreset(loggingPreset({
  format: (tokens, req, res) => {
    return [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens['response-time'](req, res), 'ms'
    ].join(' ');
  }
}));
```

### Combining Multiple Options

```typescript
server.applyPreset(loggingPreset({
  priority: 90,
  colorScheme: 'minimal',
  skip: (req, res) => req.url?.startsWith('/health'),
  immediate: false
}));
```

## Color Schemes

### Default
Vibrant color schemes with background colors for each HTTP method:
- **GET**: Blue on Purple
- **POST**: Pink on Cyan
- **PUT**: Yellow on Gray
- **DELETE**: Red on Gray
- **PATCH**: Orange on Black
- **Others**: Yellow on Red

### Minimal
Simple, clean colors using standard chalk colors:
- Methods in blue
- Status codes colored by type (green for 2xx, yellow for 3xx, red for 4xx/5xx)
- URLs in cyan
- Response times in gray

### Monochrome
Plain text output without any colors, useful for production logs or file outputs.

## API

### `loggingPreset(options?: LoggingOptions): MiddlewarePreset`

Factory function to create a customized logging preset.

#### Options

```typescript
interface LoggingOptions extends morgan.Options {
  priority?: number;                    // Middleware priority (default: 95)
  format?: MorganFormat | FormatFn;     // Log format (default: 'colorized')
  colorScheme?: ColorScheme;            // Color scheme (default: 'default')
  enableColors?: boolean;               // Enable/disable colors (default: true)
  immediate?: boolean;                  // Log on request instead of response
  skip?: (req, res) => boolean;        // Skip logging for certain requests
  stream?: NodeJS.WritableStream;      // Output stream (default: stdout)
}

type ColorScheme = 'default' | 'minimal' | 'monochrome';
type MorganFormat = 'combined' | 'common' | 'dev' | 'short' | 'tiny' | 'colorized';
```

### `DefaultLoggingPreset: MiddlewarePreset`

Pre-configured preset with the default colorized format at priority 95.

## License

MIT
