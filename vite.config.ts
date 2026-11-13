import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    // Fix Radix/Dialog "useRef of null" by ensuring a single React instance is used
    // across the entire dependency graph.
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        /**
         * Only the spreadsheet parser is isolated: it is large and is reached
         * exclusively from lazily-loaded dashboard pages.
         *
         * Everything else stays on Rollup's natural graph. Splitting React and
         * the chart library into separate vendor chunks used to create a cycle
         * — vendor-react imported a shared CJS helper from vendor-charts while
         * vendor-charts read `React` at module scope — which threw
         * "Cannot access 'React' before initialization" and left the app blank.
         */
        manualChunks(id) {
          if (id.includes("node_modules") && id.includes("xlsx")) return "vendor-xlsx";
          return undefined;
        },
      },
    },
  },
}));
