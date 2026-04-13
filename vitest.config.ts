import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '~/': resolve(__dirname, './app/'),
    },
  },
});