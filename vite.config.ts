import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: {
      entry: "server",
    },
  },

  vite: {
    server: {
      allowedHosts: ["brainrotmarket.duckdns.org"],
    },

    preview: {
      allowedHosts: ["brainrotmarket.duckdns.org"],
    },
  },
});
