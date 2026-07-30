import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { promptSpriterLibrary } from "./tools/vite-library-plugin.mjs";

export default defineConfig({
  plugins: [promptSpriterLibrary(), react()],
  server: {
    host: "127.0.0.1",
    port: 4173,
  },
  preview: {
    host: "127.0.0.1",
    port: 4174,
  },
});
