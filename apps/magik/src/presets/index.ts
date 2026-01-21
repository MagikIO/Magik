import type { MiddlewarePreset } from '@magik_io/magik-types';
import { parserPreset } from './parserPreset.js';
import { securityPreset } from './securityPreset.js';

export { parserPreset } from './parserPreset.js';
export { securityPreset } from './securityPreset.js';

/**
 * All built-in middleware presets.
 *
 * These presets are available for opt-in usage. They are NOT automatically
 * loaded - you must explicitly pass them in your MagikServerConfig.presets.
 *
 * @example
 * ```typescript
 * import { allPresets, securityPreset, parserPreset } from 'magik/presets';
 *
 * // Use all presets
 * const server = await MagikServer.init({
 *   name: 'my-api',
 *   presets: allPresets,
 * });
 *
 * // Or pick specific ones
 * const server = await MagikServer.init({
 *   name: 'my-api',
 *   presets: [securityPreset, parserPreset],
 * });
 * ```
 */
export const allPresets: MiddlewarePreset[] = [
  securityPreset,
  parserPreset,
];
