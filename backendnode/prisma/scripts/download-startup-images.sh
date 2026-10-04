#!/usr/bin/env bash
# Baixa imagens (cover, logo, thumb) das 20 startups da seed via Picsum.
# Idempotente: pula arquivos já existentes.
#
# Uso:
#   bash prisma/scripts/download-startup-images.sh
#
# Saída em: backend/uploads/startups/<slug>/{cover,logo,thumb}.jpg

set -euo pipefail

# Resolve caminho do backend independente de onde for chamado
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UPLOADS_DIR="${BACKEND_DIR}/uploads/startups"

SLUGS=(
  neuralforge payswift medicoreflex edusphere biogenix cloudpilot tokenvault
  greenfleet aurorasaas brainpath clinilink learnflow agroseed retailops
  pixglobal datavision safehome logixchain vibedeck nestopay
)

download_one() {
  local url="$1"
  local out="$2"
  if [ -f "$out" ] && [ -s "$out" ]; then
    return 0
  fi
  for attempt in 1 2 3; do
    if curl -sSL --max-time 30 -o "$out" "$url"; then
      return 0
    fi
    sleep $((attempt * 2))
  done
  echo "❌ Falha após 3 tentativas: $url" >&2
  return 1
}

main() {
  local total=${#SLUGS[@]}
  local idx=1
  for slug in "${SLUGS[@]}"; do
    local dir="${UPLOADS_DIR}/${slug}"
    mkdir -p "$dir"
    download_one "https://picsum.photos/seed/${slug}-cover/1200/630" "${dir}/cover.jpg"
    download_one "https://picsum.photos/seed/${slug}-logo/400/400" "${dir}/logo.jpg"
    download_one "https://picsum.photos/seed/${slug}-thumb/200/200" "${dir}/thumb.jpg"
    printf "[%2d/%2d] %-15s ✓\n" "$idx" "$total" "$slug"
    idx=$((idx + 1))
  done
  echo ""
  echo "✅ ${total} startups com imagens baixadas em ${UPLOADS_DIR}"
}

main
