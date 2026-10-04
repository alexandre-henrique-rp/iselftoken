#!/usr/bin/env node
/**
 * check-csrf-config.mjs
 *
 * Valida a configuração de `allowedActionOrigins` do React Router 7 contra
 * um conjunto de cenários comuns. Roda em build time (CI) e em runtime
 * para diagnóstico.
 *
 * Replica exatamente a lógica de matching do RR7 v7.14
 * (chunk-2UH5WJXA.mjs:matchWildcardDomain + isAllowedOrigin) para validar
 * a config antes do deploy.
 *
 * Uso:
 *   node scripts/check-csrf-config.mjs                          # usa defaults do config
 *   ALLOWED_ACTION_ORIGINS=... node scripts/check-csrf-config.mjs  # testa override
 *   node scripts/check-csrf-config.mjs --origin https://staging.iselftoken.com  # testa origin específica
 *
 * Exit code 0 = OK, 1 = algum cenário falha.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =============================================================================
// Replica EXATA da lógica de matching do React Router 7 v7.14
// (chunk-2UH5WJXA.mjs:matchWildcardDomain + isAllowedOrigin)
// =============================================================================

function matchWildcardDomain(domain, pattern) {
  const domainParts = domain.split(".");
  const patternParts = pattern.split(".");
  if (patternParts.length < 1) return false;
  if (domainParts.length < patternParts.length) return false;
  while (patternParts.length) {
    const patternPart = patternParts.pop();
    const domainPart = domainParts.pop();
    switch (patternPart) {
      case "":
        return false;
      case "*":
        if (domainPart) continue;
        else return false;
      case "**":
        if (patternParts.length > 0) return false;
        return domainPart !== void 0;
      case void 0:
      default:
        if (domainPart !== patternPart) return false;
    }
  }
  return domainParts.length === 0;
}

function isAllowedOrigin(originDomain, allowedActionOrigins = []) {
  return allowedActionOrigins.some(
    (allowedOrigin) =>
      allowedOrigin &&
      (allowedOrigin === originDomain ||
        matchWildcardDomain(originDomain, allowedOrigin)),
  );
}

// =============================================================================
// Parse da config (mesma lógica do react-router.config.ts)
// =============================================================================

const DEV_PORT_RANGE_START = 5173;
const DEV_PORT_RANGE_END = 5185;
const DEV_PREVIEW_PORT = 4173;

const DEFAULT_ALLOWED_ORIGINS = [
  ...Array.from(
    { length: DEV_PORT_RANGE_END - DEV_PORT_RANGE_START + 1 },
    (_, i) => `localhost:${DEV_PORT_RANGE_START + i}`,
  ),
  `localhost:${DEV_PREVIEW_PORT}`,
  `[::1]:${DEV_PORT_RANGE_START}`,
  "127.0.0.1:5173",
  "127.0.0.1:5174",
  "127.0.0.1:5175",
  "127.0.0.1:4173",
  "iselftoken.com",
  "www.iselftoken.com",
  "**.iselftoken.com",
];

function normalizeOrigin(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes("*")) return trimmed;
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).host;
  } catch {
    return null;
  }
}

function loadConfig() {
  const env = process.env.ALLOWED_ACTION_ORIGINS;
  const source = env ? "env:ALLOWED_ACTION_ORIGINS" : "DEFAULT_ALLOWED_ORIGINS";
  const raw = env ?? DEFAULT_ALLOWED_ORIGINS.join(",");
  const parsed = raw
    .split(",")
    .map((s) => normalizeOrigin(s) ?? s.trim())
    .filter(Boolean);
  return { source, allowed: parsed };
}

// =============================================================================
// Cenários padrão de teste
// =============================================================================

const DEFAULT_SCENARIOS = [
  // Dev local
  { origin: "http://localhost:5173", host: "localhost:5173", expect: true },
  { origin: "http://localhost:5174", host: "localhost:5174", expect: true },
  { origin: "http://localhost:5185", host: "localhost:5185", expect: true },
  { origin: "http://127.0.0.1:5173", host: "127.0.0.1:5173", expect: true },
  // Prod (HTTPS, sem porta)
  { origin: "https://iselftoken.com", host: "iselftoken.com", expect: true },
  { origin: "https://www.iselftoken.com", host: "www.iselftoken.com", expect: true },
  // Subdomínios
  {
    origin: "https://staging.iselftoken.com",
    host: "staging.iselftoken.com",
    expect: true,
  },
  {
    origin: "https://app.staging.iselftoken.com",
    host: "app.staging.iselftoken.com",
    expect: true,
  },
  // Edge cases comuns que DEVEM falhar (origens hostis tentando CSRF).
  // NOTA: RR7 sempre permite quando Origin === Host (exato match),
  // independente da lista. Então o cenário realista de CSRF tem
  // Origin divergente de Host. Aqui simulamos: Origin de domínio
  // hostil, mas Host do nosso domínio (cenário de DNS rebinding /
  // host header injection).
  {
    origin: "https://evil.example.com",
    host: "iselftoken.com",
    expect: false,
  },
  {
    origin: "https://iselftoken.com.evil.com",
    host: "iselftoken.com",
    expect: false,
  },
  {
    origin: "https://phishing.iselftoken.com.attacker.com",
    host: "iselftoken.com",
    expect: false,
  },
];

// =============================================================================
// CLI
// =============================================================================

const args = process.argv.slice(2);
const customOriginIdx = args.indexOf("--origin");
const customHostIdx = args.indexOf("--host");
const customOrigin =
  customOriginIdx !== -1 ? args[customOriginIdx + 1] : null;
const customHost = customHostIdx !== -1 ? args[customHostIdx + 1] : null;

const { source, allowed } = loadConfig();

console.log("━".repeat(70));
console.log(`[check-csrf-config] Source: ${source}`);
console.log(
  `[check-csrf-config] Allowed (${allowed.length}):`,
  allowed,
);
console.log("━".repeat(70));

let scenarios = DEFAULT_SCENARIOS;
if (customOrigin && customHost) {
  scenarios = [{ origin: customOrigin, host: customHost, expect: true }];
}

let pass = 0;
let fail = 0;

for (const scenario of scenarios) {
  let originDomain;
  try {
    originDomain = new URL(scenario.origin).host;
  } catch {
    console.error(
      `[check-csrf-config] SKIP — Origin inválida: ${scenario.origin}`,
    );
    fail++;
    continue;
  }

  const allowed1 = isAllowedOrigin(originDomain, allowed);
  const exact = originDomain === scenario.host;
  const finalAllow = exact || allowed1;
  const ok = finalAllow === scenario.expect;

  const tag = ok ? "✓" : "✗";
  const detail =
    scenario.expect === true
      ? `esperado: ALLOW, exato: ${exact}, lista: ${allowed1}`
      : `esperado: DENY, exato: ${exact}, lista: ${allowed1}`;

  console.log(
    `${tag} origin=${scenario.origin.padEnd(40)} host=${scenario.host.padEnd(35)} ${detail}`,
  );

  if (ok) pass++;
  else fail++;
}

console.log("━".repeat(70));
console.log(`[check-csrf-config] ${pass} passed, ${fail} failed`);

if (fail > 0) {
  console.error(
    "\n[check-csrf-config] ERRO: a config atual NÃO cobre todos os cenários.",
  );
  console.error(
    "  → Ajuste `react-router.config.ts` (DEFAULT_ALLOWED_ORIGINS) ou defina",
  );
  console.error(
    "    env ALLOWED_ACTION_ORIGINS com os domínios necessários.",
  );
  process.exit(1);
}

console.log("[check-csrf-config] OK");
process.exit(0);