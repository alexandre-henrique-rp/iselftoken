import type { Config } from "@react-router/dev/config";

/**
 * Origens permitidas para actions (POST/PUT/PATCH/DELETE) em rotas UI.
 *
 * Regra CRÍTICA (Sprint S34 — bug `/admin/startups/:id/:phase` retornando 400):
 * O React Router 7, em `singleFetchAction`, valida CSRF comparando o header
 * `Origin` com o `Host` do request (via `new URL(origin).host` vs `headers.host`).
 * Quando divergem (ex.: dev com `127.0.0.1` mas browser mandando `localhost`,
 * proxy/CDN reescrevendo Host, ou porta diferente do default), o request é
 * abortado com 400 "Bad Request" ANTES do action executar — mesmo para admins
 * autenticados. Sem `allowedActionOrigins`, só passam requests onde
 * Origin === Host (frágil em dev/staging).
 *
 * IMPORTANTE — headers avaliados (chunk-2UH5WJXA.mjs do RR7 7.14):
 *   1. `Origin`         → `new URL(originHeader).host`  (porta inclusa se houver)
 *   2. `X-Forwarded-Host` (preferido sobre `Host` se presente)
 *   3. `Host`           (fallback)
 *
 * A comparação é `originDomain === host.value` se nenhum estiver na lista
 * `allowedActionOrigins`. Caso contrário, testa match exato OU wildcards:
 *   - `*`   = um único segmento DNS não-vazio (ex.: `app.*.iselftoken.com` não
 *             é suportado — wildcard só casa segmentos literais ou curingas
 *             no INÍCIO do pattern, ex.: `**.iselftoken.com`)
 *   - `**`  = um ou mais segmentos DNS no INÍCIO do pattern (ex.:
 *             `**.iselftoken.com` casa `app.iselftoken.com`,
 *             `staging.app.iselftoken.com`; NÃO casa `iselftoken.com` —
 *             domínio raiz deve ser listado separadamente)
 *
* Lista default:
 *   - dev local: `localhost:5173-5185` (Vite dev/preview; range cobre
 *                cenários onde 5173 está ocupada), `[::1]:5173`, mirror em
 *                `127.0.0.1:5173-5175`
 *   - prod/staging: `iselftoken.com`, `www.iselftoken.com`, `**.iselftoken.com`
 *
 * Para domínios custom (preview deploys, staging adicional, outra porta dev,
 * CDN com X-Forwarded-Host divergente), sobrescreva via env
 * `ALLOWED_ACTION_ORIGINS` (CSV). Wildcards conforme acima.
 *
 * Veja docs em:
 *   https://reactrouter.com/api/framework-conventions/allowedActionOrigins
 *
 * Como diagnosticar 400 "Bad Request":
 *   1. `curl -v -X POST https://iselftoken.com/admin/startups/3/1.data \
 *        -H "Origin: https://iselftoken.com" \
 *        -d "intent=approve-startup&startupId=3&phase=1" 2>&1 \
 *        | grep -iE "^> (Host|Origin|X-Forwarded)"`
 *   2. Compare o `Origin` enviado pelo browser com o `Host` /
 *      `X-Forwarded-Host` que chega no RR7.
 *   3. Se `Host` chega com porta (ex.: `iselftoken.com:443`) mas a lista
 *      não contém `iselftoken.com:443`, adicione via env.
 *   4. Se houver Cloudflare/CloudFront e ele adicionar `X-Forwarded-Host`
 *      divergente, ajuste o CDN para preservar o host original OU adicione
 *      o domínio correto via env.
 *   5. Rode `node scripts/check-csrf-config.mjs` para validar a config antes
 *      do deploy.
 */
const DEV_PORT_RANGE_START = 5173;
const DEV_PORT_RANGE_END = 5185;
const DEV_PREVIEW_PORT = 4173;

const DEFAULT_ALLOWED_ORIGINS = [
  // Dev local — Vite dev server (5173-5185 cobre cenários onde 5173 está
  // ocupada e Vite pula para a próxima livre). Vite.config.ts fixa
  // host: 'localhost' para casar com o Origin do browser.
  ...Array.from(
    { length: DEV_PORT_RANGE_END - DEV_PORT_RANGE_START + 1 },
    (_, i) => `localhost:${DEV_PORT_RANGE_START + i}`,
  ),
  // Vite preview server (build local)
  `localhost:${DEV_PREVIEW_PORT}`,
  // IPv6 loopback (algumas plataformas; matching exato, sem wildcard de porta)
  `[::1]:${DEV_PORT_RANGE_START}`,
  // Mirror em 127.0.0.1 — alguns browsers/configs usam 127.0.0.1 em vez de
  // localhost; mantido para compatibilidade. Em produção, vite.config.ts
  // fixa host: 'localhost' então 127.0.0.1 raramente aparece.
  "127.0.0.1:5173",
  "127.0.0.1:5174",
  "127.0.0.1:5175",
  "127.0.0.1:4173",
  // Prod / staging — iselftoken.com (HTTPS porta 443; host sem porta)
  "iselftoken.com",
  "www.iselftoken.com",
  // Wildcard para subdomínios (staging, app, admin, api, etc.)
  "**.iselftoken.com",
];

/**
 * Normaliza uma origem removendo protocolo e path. Aceita formas como:
 *   - "iselftoken.com"          → "iselftoken.com"
 *   - "https://iselftoken.com"  → "iselftoken.com"
 *   - "iselftoken.com:3000"     → "iselftoken.com:3000" (porta preservada)
 *   - "https://iselftoken.com:8080/admin" → "iselftoken.com:8080"
 *   - "**.iselftoken.com"       → "**.iselftoken.com" (wildcard preservado)
 */
function normalizeOrigin(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Wildcards são preservados como string literal
  if (trimmed.includes("*")) {
    return trimmed;
  }

  // Se já é host:porta sem protocolo, devolve como está (URL parser
  // omitiria porta 443 em https://, perdendo a info do usuário).
  if (
    !/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) &&
    /^[a-z0-9.-]+:\d+$/i.test(trimmed)
  ) {
    return trimmed.toLowerCase();
  }

  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).host;
  } catch {
    return null;
  }
}

const allowedActionOrigins = (
  process.env.ALLOWED_ACTION_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(",")
)
  .split(",")
  .map((s) => normalizeOrigin(s) ?? s.trim())
  .filter((s): s is string => Boolean(s));

// Log da config em build/dev (RR7 lê esta constante em BUILD TIME, então
// este console aparece na saída do `pnpm run build` E do `pnpm run dev`).
// Útil para validar no CI que o override de env pegou E que o dev server
// tem a config esperada após `git pull`.
//
// IMPORTANTE: mudanças em react-router.config.ts NÃO são recarregadas via
// HMR do Vite — é um arquivo de config. Após `git pull`, REINICIE o
// dev server (`Ctrl+C` + `pnpm run dev`) para garantir que esta constante
// seja reavaliada.
if (typeof process !== "undefined" && process.env) {
  const source = process.env.ALLOWED_ACTION_ORIGINS
    ? "env:ALLOWED_ACTION_ORIGINS"
    : "DEFAULT_ALLOWED_ORIGINS";
  // eslint-disable-next-line no-console
  console.log(
    `[react-router.config] allowedActionOrigins (${allowedActionOrigins.length}, source=${source}):`,
    allowedActionOrigins,
  );
}

export default {
  ssr: true,
  allowedActionOrigins,
} satisfies Config;