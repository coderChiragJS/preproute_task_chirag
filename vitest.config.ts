import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Integration tests hit the live staging API and share created fixtures,
    // so they must run sequentially within each file.
    sequence: { concurrent: false },
  },
});
