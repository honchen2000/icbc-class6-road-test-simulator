import { defineConfig } from 'vitest/config';

// Unit tests target the PURE evaluation engine, scoring, signal-timing logic and
// content integrity — no Cloudflare bindings — so a plain Node environment keeps
// the suite fast and free of the vitest-pool-workers/workerd version coupling.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: false,
    reporters: ['default'],
  },
});
