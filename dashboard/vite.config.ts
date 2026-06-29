import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      formats: ["iife"],
      name: "AgentOffice",
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        banner: `
var __SDK__ = window.__HERMES_PLUGIN_SDK__;
var React = __SDK__.React;
var ReactDOM = __SDK__.ReactDOM;
`,
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react/jsx-runtime": "React",
        },
        // Prevent Rollup from adding 'use strict' — the IIFE runs in browser
        strict: false,
      },
    },
    // Do not copy public/ dir or inject HTML
    copyPublicDir: false,
  },
});