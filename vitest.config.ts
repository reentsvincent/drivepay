import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packagesDir = fileURLToPath(new URL("./packages", import.meta.url));

export default defineConfig({
  resolve: {
    // Tests nutzen direkt den Quellcode der Workspace-Pakete, ohne vorherigen Build.
    alias: [{ find: /^@drivepay\/(.+)$/, replacement: `${packagesDir}/$1/src/index.ts` }],
  },
  test: {
    include: ["{apps,packages}/*/src/**/*.test.ts"],
  },
});
