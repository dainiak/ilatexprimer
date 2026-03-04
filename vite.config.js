import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  publicDir: 'public',
  build: { outDir: 'dist', sourcemap: 'hidden' },
  optimizeDeps: { include: ['ace-builds'] },
  test: { environment: 'jsdom', setupFiles: ['js/__tests__/setup.js'] },
});
