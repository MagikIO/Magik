import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'decorators/index': 'src/decorators/index.ts',
    'factories/index': 'src/factories/index.ts',
    'plugins/index': 'src/plugins/index.ts',
    'types/index': 'src/types/index.ts',
    'engines/index': 'src/engines/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['express', 'zod'],
});
