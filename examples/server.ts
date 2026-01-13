/**
 * Example Magik Server
 *
 * This file demonstrates how to set up a basic Magik server
 * with plugins, routes, and middleware.
 *
 * Run with: npx tsx examples/server.ts
 */

import { MagikServer } from '../src';
import {
  DebugPlugin,
  ErrorHandlingPlugin,
  GracefulShutdownPlugin,
  RateLimiterPlugin,
} from '../src/plugins';
// Import presets - these are now opt-in and must be explicitly included
import { allPresets } from '../src/presets';

async function main() {
  // Initialize the server
  const server = await MagikServer.init({
    name: 'example-api',
    port: 3000,
    debug: true,
    mode: 'development',
    // Presets are no longer auto-loaded - explicitly include the ones you need
    // Use allPresets for all built-in presets, or pick specific ones:
    // presets: [securityPreset, parserPreset],
    presets: allPresets,
  });

  // Install plugins
  await server.use(new DebugPlugin());
  await server.use(new ErrorHandlingPlugin());
  await server.use(new GracefulShutdownPlugin());
  await server.use(
    new RateLimiterPlugin({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
    }),
  );

  console.log(`
    🪄 Example Magik Server is running!

    Try these endpoints:
    - GET  http://localhost:3000/
    - GET  http://localhost:3000/health

    Press Ctrl+C to stop the server gracefully.
  `);
}

main().catch(console.error);
