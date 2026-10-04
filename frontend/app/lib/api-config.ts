/**
 * URL base do backend NestJS para chamadas server-side a partir de loaders/actions
 * em `app/routes/api/`. Resolvida em build time via Vite (`import.meta.env.VITE_API_URL`).
 *
 * Configuração: definir `VITE_API_URL` no `.env` do frontend antes do build/dev.
 * Fallback de desenvolvimento: `http://localhost:7077`.
 */
export const BACKEND_URL =
  import.meta.env.VITE_API_URL || "http://localhost:7077";
