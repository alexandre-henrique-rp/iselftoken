import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    // CRÍTICO (Sprint S34 — bug /admin/startups/:id/:phase 400):
    // Fixar `host: 'localhost'` garante que o header `Host` que chega no
    // React Router 7 SEMPRE será `localhost:5173`, casando com o `Origin`
    // que o browser envia ao acessar via `http://localhost:5173`.
    //
    // Sem isso, o Vite pode escolher `127.0.0.1` em algumas plataformas
    // (especialmente Windows) e o browser envia `localhost`, divergindo.
    // RR7 aborta actions (POST/PUT/PATCH/DELETE) com 400 Bad Request
    // quando Origin !== Host (ver react-router.config.ts).
    host: "localhost",
    port: 5173,
    // Não usar strictPort: deixar Vite pular para 5174/5175/etc se 5173
    // estiver ocupada. As portas alternativas estão listadas em
    // DEFAULT_ALLOWED_ORIGINS do react-router.config.ts.
  },
});