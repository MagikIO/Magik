# @magik_io/preset-static

Static file serving middleware preset for Magik using Express static file handler.

## Installation

```bash
pnpm add @magik_io/preset-static
```

## Features

- 🔧 **Fully Configurable** - Customize all express.static options
- 📁 **Single or Multiple Directories** - Serve from one or many static directories
- 🎯 **Priority Control** - Fine-tune middleware execution order
- ⚡ **Performance Options** - Configure caching, ETags, and more
- 🔒 **Security Options** - Control dotfile access and fallthrough behavior
- 📦 **Smart Defaults** - Production-ready settings out of the box

## Usage

### Quick Start (Single Directory)

Serve static files from a single directory:

```typescript
import { MagikServer } from '@magik_io/magik';
import { staticPreset } from '@magik_io/preset-static';
import { join } from 'path';

const server = new MagikServer();

// Serve from public directory
server.applyPreset(staticPreset(join(__dirname, 'public')));
```

### Custom Options

Customize caching and other options:

```typescript
import { staticPreset } from '@magik_io/preset-static';

server.applyPreset(staticPreset('./public', {
  priority: 65,
  options: {
    maxAge: '7 days',
    etag: true,
    lastModified: true,
  }
}));
```

### Multiple Static Directories

Serve from multiple directories with different configurations:

```typescript
import { multiStaticPreset } from '@magik_io/preset-static';
import { join } from 'path';

server.applyPreset(multiStaticPreset({
  priority: 60,
  directories: [
    {
      path: join(__dirname, 'public'),
      options: {
        maxAge: '3 days',
      },
    },
    {
      path: join(__dirname, 'assets'),
      options: {
        maxAge: '30 days',
        immutable: true,
      },
    },
    {
      path: join(__dirname, 'uploads'),
      options: {
        maxAge: '1 day',
        dotfiles: 'deny',
      },
    },
  ],
}));
```

### Custom Priority

```typescript
server.applyPreset(staticPreset('./public', {
  priority: 50, // Lower priority, runs later
}));
```

### Development vs Production

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

server.applyPreset(staticPreset('./public', {
  options: {
    maxAge: isDevelopment ? 0 : '7 days',
    etag: !isDevelopment,
    immutable: !isDevelopment,
  }
}));
```

### Advanced Configuration Examples

#### Long-Term Caching for Assets

```typescript
server.applyPreset(staticPreset('./public/assets', {
  options: {
    maxAge: '365 days',
    immutable: true, // Assets with hashed filenames
    etag: false,
    lastModified: false,
  }
}));
```

#### Disable Caching for Development

```typescript
server.applyPreset(staticPreset('./public', {
  options: {
    maxAge: 0,
    etag: false,
    lastModified: false,
  }
}));
```

#### Custom File Extensions

```typescript
server.applyPreset(staticPreset('./public', {
  options: {
    extensions: ['html', 'htm'], // Try these extensions
    index: ['index.html', 'index.htm'], // Default index files
  }
}));
```

#### Deny Dotfiles Access

```typescript
server.applyPreset(staticPreset('./public', {
  options: {
    dotfiles: 'deny', // 403 for dotfiles
  }
}));
```

#### Custom Headers

```typescript
server.applyPreset(staticPreset('./public', {
  options: {
    setHeaders: (res, path, stat) => {
      // Add custom headers
      res.set('X-Custom-Header', 'value');
      
      // Set different cache for different file types
      if (path.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache');
      } else if (path.endsWith('.js') || path.endsWith('.css')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }
}));
```

#### Disable Directory Index

```typescript
server.applyPreset(staticPreset('./public', {
  options: {
    index: false, // Don't serve index.html for directories
  }
}));
```

#### Custom Index Files

```typescript
server.applyPreset(staticPreset('./public', {
  options: {
    index: ['default.html', 'index.html', 'home.html'],
  }
}));
```

### Complete Configuration Example

```typescript
import { staticPreset } from '@magik_io/preset-static';
import { join } from 'path';

const publicPath = join(__dirname, 'public');
const isDevelopment = process.env.NODE_ENV === 'development';

server.applyPreset(staticPreset(publicPath, {
  priority: 60,
  options: {
    dotfiles: 'ignore',
    etag: true,
    extensions: ['html'],
    index: ['index.html'],
    lastModified: true,
    maxAge: isDevelopment ? 0 : '7 days',
    redirect: false,
    immutable: !isDevelopment,
    setHeaders: (res, path, stat) => {
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  },
}));
```

### Multiple Directories with Different Configurations

```typescript
import { multiStaticPreset } from '@magik_io/preset-static';

server.applyPreset(multiStaticPreset({
  priority: 60,
  directories: [
    // Public assets - aggressive caching
    {
      path: './public/assets',
      options: {
        maxAge: '365 days',
        immutable: true,
      },
    },
    // Public HTML - no caching
    {
      path: './public',
      options: {
        maxAge: 0,
        index: ['index.html'],
      },
    },
    // User uploads - moderate caching, deny dotfiles
    {
      path: './uploads',
      options: {
        maxAge: '1 day',
        dotfiles: 'deny',
      },
    },
  ],
}));
```

## Default Configuration

The preset with no options is equivalent to:

```typescript
staticPreset(path, {
  priority: 60,
  options: {
    maxAge: '3 days',
    etag: true,
    lastModified: true,
    dotfiles: 'ignore',
  }
})
```

## API

### `staticPreset(path, options?): MiddlewarePreset`

Serve static files from a single directory.

#### Parameters

- **path** (required): `string` - Absolute or relative path to the static files directory
- **options** (optional): `StaticOptions` - Configuration options

#### StaticOptions

```typescript
interface StaticOptions {
  priority?: number;
  options?: {
    dotfiles?: 'allow' | 'deny' | 'ignore';
    etag?: boolean;
    extensions?: string[] | false;
    fallthrough?: boolean;
    immutable?: boolean;
    index?: boolean | string | string[];
    lastModified?: boolean;
    maxAge?: number | string;
    redirect?: boolean;
    setHeaders?: (res: any, path: string, stat: any) => void;
  };
}
```

### `multiStaticPreset(options): MiddlewarePreset`

Serve static files from multiple directories.

#### MultiStaticOptions

```typescript
interface MultiStaticOptions {
  directories: Array<{
    path: string;
    options?: StaticOptions['options'];
  }>;
  priority?: number;
}
```

## Options Reference

### `dotfiles`
- `'allow'` - No special treatment for dotfiles
- `'deny'` - Deny requests for dotfiles (403)
- `'ignore'` - Pretend dotfiles don't exist (404)
- Default: `'ignore'`

### `etag`
- Enable or disable ETag generation
- Default: `true`

### `extensions`
- File extensions to try when a file is not found
- Example: `['html', 'htm']`
- Default: `false`

### `fallthrough`
- Continue to next middleware if file not found
- Default: `true`

### `immutable`
- Enable or disable immutable directive in Cache-Control
- Useful for versioned/hashed assets
- Default: `false`

### `index`
- Send directory index file(s)
- Can be boolean, string, or array of strings
- Default: `['index.html']`

### `lastModified`
- Enable or disable Last-Modified header
- Default: `true`

### `maxAge`
- Set Cache-Control max-age in milliseconds or string
- Examples: `86400000`, `'1 day'`, `'7 days'`
- Default: `'3 days'`

### `redirect`
- Redirect to trailing "/" when pathname is a directory
- Default: `true`

### `setHeaders`
- Function to set custom headers
- Receives: `(res, path, stat)`

## Best Practices

1. **Use absolute paths** - Always use `path.join(__dirname, 'directory')` for reliability
2. **Different cache strategies** - Use long caches for versioned assets, short for HTML
3. **Use immutable** - For assets with hashed filenames (e.g., `app.abc123.js`)
4. **Deny dotfiles** - For sensitive directories like uploads
5. **Disable caching in development** - Set `maxAge: 0` during development
6. **Set custom headers** - Use `setHeaders` for fine-grained control
7. **Multiple directories** - Use `multiStaticPreset` for different caching strategies
8. **Security** - Never serve sensitive files or directories

## Common Patterns

### CDN-Style Asset Serving

```typescript
server.applyPreset(staticPreset('./public/assets', {
  options: {
    maxAge: '365 days',
    immutable: true,
    etag: false, // Not needed with versioned assets
  }
}));
```

### SPA (Single Page Application)

```typescript
server.applyPreset(staticPreset('./public', {
  options: {
    index: ['index.html'],
    maxAge: 0, // Don't cache the HTML
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.set('Cache-Control', 'no-cache');
      } else {
        res.set('Cache-Control', 'public, max-age=31536000');
      }
    },
  }
}));
```

### File Download Server

```typescript
server.applyPreset(staticPreset('./files', {
  options: {
    dotfiles: 'deny',
    index: false,
    maxAge: '1 hour',
  }
}));
```

## License

MIT
