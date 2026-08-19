import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: {
      entry: "server",
    },
  },

  server: {
    allowedHosts: ["brainrotmarket.duckdns.org"],
  },

  preview: {
    allowedHosts: ["brainrotmarket.duckdns.org"],
  },
});
