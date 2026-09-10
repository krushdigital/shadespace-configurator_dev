import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const r = (p: string) => path.resolve(__dirname, p);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default defineConfig({
  plugins: [react() as any],
  resolve: {
    // Force a single copy of react/react-dom — shade_space's own node_modules.
    // This alias runs inside Vite's bundler pipeline (active when deps are inlined below).
    alias: {
      react: r('node_modules/react'),
      'react-dom': r('node_modules/react-dom'),
      'react-dom/client': r('node_modules/react-dom/client.js'),
    },
    dedupe: ['react', 'react-dom'],
  },
  define: {
    __BUILD_VERSION__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    css: false,
    // Inline these through Vite's bundler so the resolve.alias above
    // applies — otherwise Node resolves them from root node_modules
    // and react / react-dom end up as two separate singletons.
    server: {
      deps: {
        inline: ['react', 'react-dom', /@testing-library/],
      },
    },
  },
});
