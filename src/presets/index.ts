import type { MiddlewarePreset } from '../types/middleware';
import { parserPreset } from './parserPreset';
import { securityPreset } from './securityPreset';

export { parserPreset } from './parserPreset';
export { securityPreset } from './securityPreset';

/**
 * All built-in middleware presets
 *
 * These presets are automatically loaded when MiddlewareEngine is initialized.
 */
export const allPresets: MiddlewarePreset[] = [
  securityPreset,
  parserPreset,
];
