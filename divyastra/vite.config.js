import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }
        }
      }
    }
  }
});

