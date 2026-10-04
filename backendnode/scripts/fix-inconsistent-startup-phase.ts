/**
 * Script de migração: corrige startups que ficaram em estado inconsistente
 * pelo bug `openCampaignOnApproval` chamado em Fase 1/2 (antes da correção
 * do gate por fase no AdminService).
 *
 * Cenário alvo (ex.: startup 24):
 *  - Admin aprovou Fase 1 → backend SEMPRE chamava `openCampaignOnApproval`
 *    → campanha DRAFT (mesmo vazia) virou OPEN.
 *  - O founder agora vê "Startup Aprovada / Captação Aberta" sem ter
 *    preenchido os parâmetros de captação.
 *  - O botão "Editar Captação" só aparece em DRAFT (CASE.md [Painel do
 *    Fundador]) → founder travado.
 *
 * Este script:
 *  1. Mostra o estado atual da startup (status, campanhas, decisões,
 *     payments COMPLIANCE_FEE).
 *  2. Detecta campanhas OPEN vazias (targetAmount/valuation/tokenPrice/
 *     totalTokens zerados) → marca como "precisa reversão".
 *  3. Reverte a campanha OPEN → DRAFT (com auditoria).
 *  4. (Opcional) Reverte uma campanha já revertida para `dataLancamentoRodada`
 *     se existir, para o founder preencher via /founder/startups/:id/captacao.
 *
 * Uso:
 *   # Inspeção (somente leitura)
 *   npx tsx scripts/fix-inconsistent-startup-phase.ts 24 --dry-run
 *
 *   # Reverter estado
 *   npx tsx scripts/fix-inconsistent-startup-phase.ts 24 --fix
 *
 *   # Reverter sem checagem de pagamento (forçar)
 *   npx tsx scripts/fix-inconsistent-startup-phase.ts 24 --fix --force
 */
import 'dotenv/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

const STARTUP_ID = Number(process.argv[2] ?? 0);
const DRY_RUN = process.argv.includes('--dry-run');
const FIX = process.argv.includes('--fix');
const FORCE = process.argv.includes('--force');

if (!STARTUP_ID) {
  console.error(
    'Uso: npx tsx scripts/fix-inconsistent-startup-phase.ts <startupId> [--dry-run | --fix] [--force]',
  );
  process.exit(1);
}

interface CampaignSnapshot {
  id: number;
  status: string;
  targetAmount: unknown;
  valuation: unknown;
  tokenPrice: unknown;
  totalTokens: number | null;
  dataLancamentoRodada: Date | null;
  deadline: Date | null;
}

interface PaymentSnapshot {
  id: number;
  purpose: string;
  status: string;
  paidAt: Date | null;
}

async function loadState(startupId: number) {
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: {
      id: true,
      nome: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      founder: { select: { id: true, nome: true, email: true } },
      campaigns: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          targetAmount: true,
          valuation: true,
          tokenPrice: true,
          totalTokens: true,
          dataLancamentoRodada: true,
          deadline: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!startup) {
    throw new Error(`Startup ${startupId} não encontrada.`);
  }

  const decisions = await prisma.startupReviewDecision.findMany({
    where: { startupId },
    orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      phase: true,
      decision: true,
      justification: true,
      adminName: true,
      createdAt: true,
    },
  });

  const payments = await prisma.payment.findMany({
    where: { campaignId: { in: startup.campaigns.map((c) => c.id) } },
    select: {
      id: true,
      purpose: true,
      status: true,
      paidAt: true,
      campaignId: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const audits = await prisma.auditLog.findMany({
    where: {
      entity: 'Campaign',
      entityId: {
        in: startup.campaigns.map((c) => String(c.id)),
      },
      action: 'CAMPAIGN_OPENED_ON_APPROVAL',
    },
    orderBy: { createdAt: 'desc' },
  });

  return { startup, decisions, payments, audits };
}

function isCampaignEmpty(c: CampaignSnapshot): boolean {
  const targetAmount = c.targetAmount ? Number(c.targetAmount) : 0;
  const valuation = c.valuation ? Number(c.valuation) : 0;
  const tokenPrice = c.tokenPrice ? Number(c.tokenPrice) : 0;
  const totalTokens = c.totalTokens ?? 0;
  return (
    targetAmount <= 0 || valuation <= 0 || tokenPrice <= 0 || totalTokens <= 0
  );
}

function printState(state: Awaited<ReturnType<typeof loadState>>) {
  const { startup, decisions, payments, audits } = state;

  console.log('\n========== ESTADO DA STARTUP ==========');
  console.log(`ID:           ${startup.id}`);
  console.log(`Nome:         ${startup.nome}`);
  console.log(`Status:       ${startup.status}`);
  console.log(
    `Fundador:     ${startup.founder?.nome} (${startup.founder?.email})`,
  );
  console.log(`Criada em:    ${startup.createdAt.toISOString()}`);

  console.log('\n----- Campanhas -----');
  if (startup.campaigns.length === 0) {
    console.log('  (nenhuma)');
  }
  for (const c of startup.campaigns) {
    const empty = isCampaignEmpty(c);
    const tag = empty ? '⚠️  VAZIA' : '✅  preenchida';
    console.log(
      `  #${c.id} status=${c.status.padEnd(10)} totalTokens=${String(c.totalTokens ?? '-').padEnd(6)} ` +
        `targetAmount=${String(c.targetAmount ?? '-').padEnd(10)} ${tag}`,
    );
    if (c.dataLancamentoRodada) {
      console.log(
        `     dataLancamentoRodada: ${c.dataLancamentoRodada.toISOString()}`,
      );
    }
  }

  console.log('\n----- Decisões de revisão (audit) -----');
  if (decisions.length === 0) {
    console.log('  (nenhuma)');
  }
  for (const d of decisions) {
    console.log(
      `  Fase ${d.phase} → ${d.decision} por ${d.adminName ?? '?'} em ${d.createdAt.toISOString()}`,
    );
  }

  console.log('\n----- Payments -----');
  const byPurpose = new Map<string, PaymentSnapshot>();
  for (const p of payments) {
    const key = `${p.purpose}`;
    if (!byPurpose.has(key)) byPurpose.set(key, p);
  }
  if (byPurpose.size === 0) {
    console.log('  (nenhum)');
  }
  for (const [purpose, p] of Array.from(byPurpose)) {
    console.log(
      `  ${purpose.padEnd(20)} → status=${p.status}${p.paidAt ? ` (pago em ${p.paidAt.toISOString()})` : ''}`,
    );
  }

  console.log('\n----- Auditorias CAMPAIGN_OPENED_ON_APPROVAL -----');
  if (audits.length === 0) {
    console.log('  (nenhuma — a campanha nunca foi aberta por este script)');
  } else {
    for (const a of audits) {
      console.log(`  Campaign #${a.entityId} em ${a.createdAt.toISOString()}`);
    }
  }
  console.log('========================================\n');
}

async function main() {
  console.log(
    `Carregando estado da startup ${STARTUP_ID} (modo: ${
      DRY_RUN ? 'DRY-RUN' : FIX ? 'FIX' : 'INSPECAO'
    })...`,
  );
  const state = await loadState(STARTUP_ID);
  printState(state);

  // Com `--force`, considera TODAS as campanhas OPEN (mesmo preenchidas);
  // sem `--force`, só considera as vazias (reversão segura por padrão).
  const candidateCampaigns = FORCE
    ? state.startup.campaigns.filter((c) => c.status === 'OPEN')
    : state.startup.campaigns.filter(
        (c) => c.status === 'OPEN' && isCampaignEmpty(c),
      );

  if (candidateCampaigns.length === 0) {
    console.log(
      '✓ Nenhuma campanha OPEN vazia encontrada. Estado consistente.',
    );
    if (!FORCE) {
      console.log(
        '  Dica: use --force para reverter mesmo campanhas OPEN com dados preenchidos.',
      );
    }
    return;
  }

  console.log(
    `⚠️  Encontradas ${candidateCampaigns.length} campanha(s) OPEN ` +
      `${FORCE ? '(forçando reversão)' : 'vazia(s) — provável bug pré-fix'}.`,
  );

  if (!FIX) {
    console.log(
      '  Use --fix para reverter para DRAFT. Use --force para reverter mesmo se a campanha não estiver vazia.',
    );
    if (DRY_RUN) return;
    process.exit(0);
  }

  for (const campaign of candidateCampaigns) {
    if (!isCampaignEmpty(campaign) && !FORCE) {
      console.log(
        `  ⏭️  Pulando campanha #${campaign.id} — não está vazia. Use --force para reverter mesmo assim.`,
      );
      continue;
    }

    console.log(
      `  → Revertendo campanha #${campaign.id}: OPEN → DRAFT (dataLancamentoRodada removida).`,
    );
    if (DRY_RUN) continue;

    await prisma.$transaction(async (tx) => {
      await tx.campaign.update({
        where: { id: campaign.id },
        data: {
          status: 'DRAFT',
          dataLancamentoRodada: null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: state.startup.founder?.id ?? null,
          action: 'CAMPAIGN_REVERTED_FROM_OPEN_TO_DRAFT',
          entity: 'Campaign',
          entityId: String(campaign.id),
          oldValue: {
            status: 'OPEN',
            dataLancamentoRodada:
              campaign.dataLancamentoRodada?.toISOString() ?? null,
          },
          newValue: {
            status: 'DRAFT',
            dataLancamentoRodada: null,
            reason:
              'Migração: campanha foi aberta indevidamente em Fase 1/2 antes do fix do gate openCampaignOnApproval. CASE.md [Aprovação por Fases].',
          },
        },
      });
    });
    console.log(`    ✓ Campanha #${campaign.id} revertida para DRAFT.`);
  }

  if (!DRY_RUN) {
    console.log('\n=== ESTADO APÓS MIGRAÇÃO ===');
    const finalState = await loadState(STARTUP_ID);
    printState(finalState);
    console.log(
      '\n→ Próximo passo: founder deve acessar /founder/startups/' +
        STARTUP_ID +
        '/captacao para preencher os parâmetros e re-submeter para análise da Fase 3.',
    );
  }
}

main()
  .catch((err) => {
    console.error('Erro:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
