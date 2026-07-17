import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/shopify'),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    target: ['es2015', 'safari11', 'chrome64', 'firefox60', 'edge79'],
    lib: {
      entry: path.resolve(__dirname, 'src/shopify/my-designs-entry.tsx'),
      name: 'ShadeSpaceMyDesigns',
      formats: ['iife'],
      fileName: () => 'my-designs-bundle.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
