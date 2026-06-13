import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Fully static, offline SPA. `base: './'` makes asset URLs relative so the build
// works from any host path — GitHub Pages project sites, sub-folders, even
// file:// — which pairs with the app's HashRouter. The SPA root is src/client;
// the static site builds to ./dist.
export default defineConfig({
  root: path.resolve(import.meta.dirname, 'src/client'),
  base: './',
  plugins: [react()],
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    sourcemap: false,
  },
});
