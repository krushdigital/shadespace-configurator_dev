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
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const buildVersion = new Date().toISOString().replace(/[-:T]/g, "").split(".")[0];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  build: {
    outDir: "../public/shadespace/",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    target: ["es2015", "safari11", "chrome64", "firefox60", "edge79"],
    rollupOptions: {
      input: path.resolve(__dirname, "src/main.tsx"),
      output: {
        inlineDynamicImports: false,
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei"],
        },
        entryFileNames: "bundle.js",
        chunkFileNames: "[name].js",
        assetFileNames: "bundle.[ext]",
      },
    },
  },
  optimizeDeps: {
    include: ["three", "@react-three/fiber", "@react-three/drei"],
    exclude: ["lucide-react"],
  },
});

