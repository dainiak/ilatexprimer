import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: { outDir: 'dist' },
  optimizeDeps: { include: ['ace-builds'] }
});
