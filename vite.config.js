import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, cpSync } from "fs";

function copyExtensionFiles() {
  return {
    name: "copy-extension-files",
    closeBundle() {
      // manifest
      mkdirSync("dist", { recursive: true });
      copyFileSync("public/manifest.json", "dist/manifest.json");

      // sidebar html — copy from src to dist/sidebar/
      mkdirSync("dist/sidebar", { recursive: true });
      copyFileSync("src/sidebar/index.html", "dist/sidebar/index.html");

      console.log("✓ manifest.json + sidebar/index.html copied to dist/");
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // Sidebar React bundle
        sidebar: resolve(__dirname, "src/sidebar/main.jsx"),
        // Content script
        content: resolve(__dirname, "src/content/index.js"),
        // Service worker
        "service-worker": resolve(__dirname, "src/background/service-worker.js"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "service-worker") return "background/service-worker.js";
          if (chunk.name === "content") return "content/index.js";
          if (chunk.name === "sidebar") return "sidebar/main.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    target: "esnext",
  },
  optimizeDeps: {
    exclude: ["@xenova/transformers"],
  },
  worker: {
    format: "es",
  },
});
