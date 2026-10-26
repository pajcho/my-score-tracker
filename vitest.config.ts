import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import packageJson from "./package.json" with { type: "json" };

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "virtual:pwa-register/react": path.resolve(import.meta.dirname, "./src/test/pwaRegisterStub.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.tsx",
    globals: false,
    coverage: {
      reporter: ["text", "html"],
      include: [
        "src/App.tsx",
        "src/main.tsx",
        "src/routerBase.ts",
        "src/routes/**/*.tsx",
        "src/pages/**/*.tsx",
        "src/components/Layout.tsx",
        "src/components/Navigation.tsx",
        "src/components/auth/**/*.ts",
        "src/components/auth/**/*.tsx",
        "src/components/pages/**/*.tsx",
        "src/hooks/**/*.ts",
        "src/hooks/**/*.tsx",
        "src/lib/**/*.ts",
      ],
      exclude: ["src/test/**", "**/*.test.ts", "**/*.test.tsx"],
    },
  },
});
