import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: { outDir: 'dist', sourcemap: 'hidden' },
  optimizeDeps: { include: ['ace-builds'] }
});
