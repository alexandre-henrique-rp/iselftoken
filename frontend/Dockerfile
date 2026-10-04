# ============================================================
# Dockerfile — IselfToken Frontend (React Router 7 SSR + Vite)
# Multi-stage: dev-deps → prod-deps → build → runner
# Stack: node:22-alpine + pnpm (corepack)
# pnpm 11+ requer Node >= 22.13; bump de node:20 -> node:22 alinha com
# backendnode/Dockerfile.prod e libera pnpm@latest via corepack.
# ============================================================

# ----------------------------------------------------------------------------
# Stage 1: production dependencies (apenas deps de runtime)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS production-dependencies-env

# Corepack habilita pnpm sem instalar manualmente (mesma versão que o dev usa)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copia SOMENTE o manifesto + lockfile para cachear a layer de deps
COPY ./package.json pnpm-lock.yaml pnpm-workspace.yaml .dockerignore ./

# --frozen-lockfile: falha se package.json != pnpm-lock.yaml (mesma filosofia do npm ci)
# frozen-lockfile retorna exit 1 quando há drift — comportamento desejado
# --config.dangerouslyAllowAllBuilds=true: pnpm 11+ bloqueia build scripts por
# padrão; esbuild precisa rodar postinstall para baixar o binário da plataforma.
# Configuramos o whitelist em frontend/package.json (pnpm.onlyBuiltDependencies),
# mas em pnpm 11 o lockfile precisa estar em sync com essa config — como o
# lockfile é gerado por outro agente, usamos o toggle global para destravar
# sem regenerar o lockfile.
#
# pnpm 11+ blocks esbuild postinstall (ERR_PNPM_IGNORED_BUILDS) unless
# the package is in the approval state. The reliable cross-version fix
# is to pin pnpm@10 in the Docker build (which still respects
# allowBuilds in pnpm-workspace.yaml) while pnpm@11 stays for local dev.
# See: https://github.com/orgs/pnpm/discussions/...
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
# Instala prod deps (10.x respeita allowBuilds do pnpm-workspace.yaml).
RUN pnpm install --frozen-lockfile --prod

# ----------------------------------------------------------------------------
# Stage 2: development dependencies (todas as deps, incluindo dev/build)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS development-dependencies-env

RUN corepack enable && corepack prepare pnpm@10.15.0 --activate

WORKDIR /app

COPY ./package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ----------------------------------------------------------------------------
# Stage 3: build (gera o bundle SSR via react-router build)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS build-env

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Reaproveita node_modules já instalado (evita reinstalar)
COPY --from=development-dependencies-env /app/node_modules /app/node_modules
# IMPORTANTE: copiar o .env EXPLICITAMENTE garante que o Vite lê as
# VITE_* no build-time. Sem essa linha, o cache do Docker pode reusar
# uma versão antiga do .env e as env vars não são embutidas no bundle.
COPY .env ./
COPY . .

# Build de produção do React Router 7
RUN pnpm run build

# ----------------------------------------------------------------------------
# Stage 4: runner (imagem final, sem dev-deps nem build tools)
# ----------------------------------------------------------------------------
FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# node_modules enxuto (apenas deps de runtime)
COPY --from=production-dependencies-env /app/node_modules /app/node_modules
# Bundle gerado no build-env
COPY --from=build-env /app/build /app/build
# Manifestos (necessários caso o app leia package.json em runtime)
COPY package.json pnpm-lock.yaml ./

ENV NODE_ENV=production

# react-router-serve escuta em 0.0.0.0:3000 por default;
# o nginx (definido no user-data) faz reverse proxy para a 3000.
EXPOSE 3000

CMD ["pnpm", "run", "start"]
