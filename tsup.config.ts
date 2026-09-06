import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  shims: true,
  sourcemap: true,
  target: 'node18'
});
