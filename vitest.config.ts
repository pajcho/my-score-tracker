import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
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
