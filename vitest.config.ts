import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    pool: 'forks',
    fileParallelism: false, // one shared DB container across files
    testTimeout: 30_000,
    hookTimeout: 120_000,
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/server.ts', 'src/config/**', 'src/docs/**', 'src/**/*.routes.ts'],
    },
  },
});
