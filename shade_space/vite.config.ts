// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   build: {
//     watch: {},
//     outDir: "../public/shadespace/",
//     // input: "/src/main.jsx",
//     rollupOptions: {
//       output: {
//         manualChunks: {
//           vendor: ['react', 'react-dom'],
//           pdf: ['html2canvas', 'jspdf']
//         }
//       }
//     },
//     sourcemap: false,
//     minify: 'terser',
//     terserOptions: {
//       compress: {
//         drop_console: true,
//         drop_debugger: true
//       }
//     }
//   },
//   optimizeDeps: {
//     exclude: ['lucide-react'],
//   },
// });

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../public/shadespace/",
    watch: {},
    emptyOutDir: true,
    sourcemap: false,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        manualChunks: undefined,
        entryFileNames: "bundle.js",
        chunkFileNames: "bundle.js",
        assetFileNames: "bundle.[ext]",
      },
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
