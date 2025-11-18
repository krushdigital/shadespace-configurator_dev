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
    outDir: "dist",
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
        manualChunks: {
          vendor: ['react', 'react-dom'],
          pdf: ['html2canvas', 'jspdf']
        }
      }
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
