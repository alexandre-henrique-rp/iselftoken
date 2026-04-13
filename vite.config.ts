import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./app"),
      },
    },
    define: {
      "process.env.API_URL": JSON.stringify(env.API_URL),
      "process.env.COOKIE_SECRET": JSON.stringify(env.COOKIE_SECRET),
    },
  };
});
