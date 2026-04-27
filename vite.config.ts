import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import webExtension from "vite-plugin-web-extension";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    webExtension({
      manifest: "manifest.json",
    }),
  ],
  test: {
    environment: "node",
  },
});
