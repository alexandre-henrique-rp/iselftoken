#!/usr/bin/env bash
# perf-scout.sh — Varredura read-only do codebase iSelfToken
# Coleta inventário de rotas, queries, caches e chunks para auditoria.
# Uso: bash perf-scout.sh [frontend|backend|full]
#      bash perf-scout.sh > docs/performance/<id>-scout.txt

set -uo pipefail

FRONTEND_DIR="${FRONTEND_DIR:-frontend}"
BACKEND_DIR="${BACKEND_DIR:-backendnode}"
SCOPE="${1:-full}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "=================================================="
echo "perf-scout — iSelfToken — ${TIMESTAMP}"
echo "Escopo: ${SCOPE}"
echo "=================================================="
echo

# -----------------------------------------------------------------------------
# FASE 1 — RECON: Rotas
# -----------------------------------------------------------------------------

echo "## 1. INVENTÁRIO DE ROTAS (frontend)"
echo

echo "### 1.1 Total de rotas"
total_routes=$(grep -cE '^\s*(index|route|layout|prefix)\(' "${FRONTEND_DIR}/app/routes.ts" 2>/dev/null || echo 0)
echo "Total declaradas em routes.ts: ${total_routes}"
echo

echo "### 1.2 Rotas privadas (gated pelo layout)"
grep -E 'route\(".*", "routes/private/' "${FRONTEND_DIR}/app/routes.ts" 2>/dev/null \
  | head -50 \
  | sed 's/.*route("\([^"]*\)".*/\1/' \
  | sort -u
echo

echo "### 1.3 Rotas BFF (/api/*)"
grep -E 'route\(".*", "routes/api/' "${FRONTEND_DIR}/app/routes.ts" 2>/dev/null \
  | sed 's/.*route("\([^"]*\)".*/\1/' \
  | sort -u \
  | head -100
echo

echo "### 1.4 Rotas públicas"
grep -E 'route\(".*", "routes/public/' "${FRONTEND_DIR}/app/routes.ts" 2>/dev/null \
  | sed 's/.*route("\([^"]*\)".*/\1/' \
  | sort -u
echo

# -----------------------------------------------------------------------------
# FASE 1.5 — Hidratação SSR
# -----------------------------------------------------------------------------

echo "## 2. AUDITORIA SSR (Hidratação)"
echo

echo "### 2.1 Rotas COM HydrationBoundary"
rg -l "HydrationBoundary" "${FRONTEND_DIR}/app/routes/" 2>/dev/null | wc -l
echo

echo "### 2.2 Rotas privadas SEM HydrationBoundary (suspeitas)"
for file in $(grep -lE 'export default function' "${FRONTEND_DIR}/app/routes/private/" -r 2>/dev/null); do
  if ! grep -q "HydrationBoundary" "${file}"; then
    echo "  SUSPEITO: ${file}"
  fi
done | head -30
echo

echo "### 2.3 Loaders que fazem fetch mas não usam setQueryData"
for file in $(grep -lE 'async function loader' "${FRONTEND_DIR}/app/routes/" -r 2>/dev/null); do
  if grep -q "await serverFetch\|await fetch" "${file}" && ! grep -q "setQueryData" "${file}"; then
    echo "  WATERFALL: ${file}"
  fi
done | head -30
echo

# -----------------------------------------------------------------------------
# FASE 1.7 — Anti-patterns
# -----------------------------------------------------------------------------

echo "## 3. ANTI-PATTERNS"
echo

echo "### 3.1 fetch solto em useEffect"
rg -B1 -A3 "useEffect" "${FRONTEND_DIR}/app/routes/" "${FRONTEND_DIR}/app/components/" 2>/dev/null \
  | grep -B1 'fetch(' \
  | head -20
echo

echo "### 3.2 BACKEND_URL usado em loaders (deveria passar por BFF)"
rg -n 'BACKEND_URL\|VITE_API_URL' "${FRONTEND_DIR}/app/routes/layout/" "${FRONTEND_DIR}/app/routes/private/" 2>/dev/null \
  | head -10
echo

echo "### 3.3 queryKey com string mágica (fora de lib/queries.ts)"
rg -n 'queryKey.*\["' "${FRONTEND_DIR}/app/routes/" "${FRONTEND_DIR}/app/hooks/" 2>/dev/null \
  | grep -v 'lib/queries.ts' \
  | head -20
echo

echo "### 3.4 refetch de /users/me ou /auth/status em rota filha"
rg -n 'fetch.*"/api/users/me"\|fetch.*"/api/auth/status"\|serverFetch.*"/api/users/me"\|serverFetch.*"/api/auth/status"' "${FRONTEND_DIR}/app/routes/private/" 2>/dev/null \
  | head -10
echo

# -----------------------------------------------------------------------------
# FASE 2 — Backend queries
# -----------------------------------------------------------------------------

if [[ "${SCOPE}" == "backend" || "${SCOPE}" == "full" ]]; then

echo "## 4. BACKEND — QUERIES PESADAS"
echo

echo "### 4.1 Top 20 services com mais queries Prisma"
rg -c "this\.prisma\." "${BACKEND_DIR}/src/api/" -g '*.service.ts' 2>/dev/null \
  | sort -t: -k2 -nr \
  | head -20
echo

echo "### 4.2 Promise.all com > 5 agregados (candidatos a cache)"
for file in $(rg -l "Promise.all" "${BACKEND_DIR}/src/api/" -g '*.service.ts' 2>/dev/null); do
  count=$(grep -c "this\.prisma\." "${file}" 2>/dev/null || true)
  count="${count:-0}"
  if [[ "${count}" =~ ^[0-9]+$ ]] && [[ "${count}" -gt 20 ]]; then
    echo "  PESADO: ${file} (${count} queries Prisma)"
  fi
done | head -20
echo

echo "### 4.3 findMany SEM take explícito (risco OOM)"
for file in $(rg -l "findMany" "${BACKEND_DIR}/src/api/" -g '*.service.ts' 2>/dev/null); do
  matches=$(rg -A8 "findMany" "${file}" 2>/dev/null | grep -c "orderBy:" 2>/dev/null || true)
  matches="${matches:-0}"
  takes=$(rg -A8 "findMany" "${file}" 2>/dev/null | grep -c "take:" 2>/dev/null || true)
  takes="${takes:-0}"
  if [[ "${matches}" =~ ^[0-9]+$ ]] && [[ "${takes}" =~ ^[0-9]+$ ]] && [[ "${matches}" -gt "${takes}" ]]; then
    echo "  SEM TAKE: ${file} (orderBy: ${matches}x, take: ${takes}x)"
  fi
done | head -20
echo

echo "### 4.4 Endpoints com @InjectRedis (cache presente)"
rg -l "@InjectRedis" "${BACKEND_DIR}/src/" 2>/dev/null
echo

echo "### 4.5 Endpoints com findMany agregado em controllers (admin)"
rg -l "Promise.all" "${BACKEND_DIR}/src/api/admin/" "${BACKEND_DIR}/src/api/financeiro/" "${BACKEND_DIR}/src/api/compliance/" 2>/dev/null
echo

fi

# -----------------------------------------------------------------------------
# FASE 3 — Índices
# -----------------------------------------------------------------------------

if [[ "${SCOPE}" == "backend" || "${SCOPE}" == "full" ]]; then

echo "## 5. ÍNDICES PRISMA"
echo

echo "### 5.1 Total de índices declarados"
total_indexes=$(grep -cE '@@index|@@unique' "${BACKEND_DIR}/prisma/schema.sqlite.prisma" 2>/dev/null || echo 0)
echo "Total: ${total_indexes}"
echo

echo "### 5.2 Índices compostos (candidatos a otimização)"
grep -E '@@index\(\[' "${BACKEND_DIR}/prisma/schema.sqlite.prisma" 2>/dev/null \
  | head -20
echo

echo "### 5.3 Lacunas conhecidas (queries comuns sem índice composto)"
echo "  - Payment(userId, createdAt) — verificar em schema"
echo "  - Investment.allocatedAt — verificar em schema"
echo "  - WebhookLog[eventType, receivedAt] — verificar em schema"
echo

fi

# -----------------------------------------------------------------------------
# FASE 4 — PKI / Crons
# -----------------------------------------------------------------------------

if [[ "${SCOPE}" == "backend" || "${SCOPE}" == "full" ]]; then

echo "## 6. PKI E CRONS"
echo

echo "### 6.1 node-forge síncrono"
rg -n "node-forge\|pkcs12" "${BACKEND_DIR}/src/signature/" 2>/dev/null | head -10
echo

echo "### 6.2 Crons ativos (@Cron)"
rg -B1 -A2 "@Cron\(" "${BACKEND_DIR}/src/" 2>/dev/null | head -40
echo

fi

# -----------------------------------------------------------------------------
# FASE 5 — Build artifacts
# -----------------------------------------------------------------------------

echo "## 7. BUILD ARTIFACTS"
echo

if [[ -d "${FRONTEND_DIR}/build/client/assets" ]]; then
  echo "### 7.1 Total de chunks JS"
  ls "${FRONTEND_DIR}/build/client/assets/"*.js 2>/dev/null | wc -l
  echo

  echo "### 7.2 Top 10 chunks por tamanho (gzip)"
  for f in "${FRONTEND_DIR}/build/client/assets/"*.js; do
    size=$(gzip -c "${f}" 2>/dev/null | wc -c)
    echo "${size} ${f##*/}"
  done 2>/dev/null | sort -nr | head -10
  echo

  echo "### 7.3 Top 10 chunks por tamanho (raw)"
  ls -la "${FRONTEND_DIR}/build/client/assets/"*.js 2>/dev/null \
    | awk '{print $5, $9}' \
    | sort -nr \
    | head -10
else
  echo "### 7.1 Build não encontrado em ${FRONTEND_DIR}/build/"
  echo "Execute: cd ${FRONTEND_DIR} && pnpm build"
fi
echo

# -----------------------------------------------------------------------------
# Resumo
# -----------------------------------------------------------------------------

echo "=================================================="
echo "FIM — perf-scout ${TIMESTAMP}"
echo "Próximos passos:"
echo "  1. Revisar seções 2-7 acima"
echo "  2. Para top-15 páginas, rodar k6:"
echo "     k6 run .opencode/skills/performance-tuning/templates/k6-script.js"
echo "  3. Gerar relatório Markdown:"
echo "     cp .opencode/skills/performance-tuning/templates/report.md docs/performance/<id>.md"
echo "=================================================="
