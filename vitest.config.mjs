import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    environment: "node",
    fileParallelism: false,
    env: {
      GEMINI_API_KEY: "",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./node_modules/server-only/empty.js"),
    },
  },
});
