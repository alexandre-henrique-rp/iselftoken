import { PrismaService } from 'src/prisma/prisma.service';

/** Returns emails of active users with FINANCEIRO role. */
export async function getFinanceiroEmails(
  prisma: PrismaService,
): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { role: 'FINANCEIRO', isActive: true },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

/** Returns the founder's email for a given startup. */
export async function getFounderEmailByStartup(
  prisma: PrismaService,
  startupId: number,
): Promise<string> {
  const startup = await prisma.startup.findUnique({
    where: { id: startupId },
    select: { founder: { select: { email: true } } },
  });
  if (!startup?.founder?.email) {
    throw new Error(`Startup ${startupId} not found or founder has no email`);
  }
  return startup.founder.email;
}

export interface InstallmentContext {
  installmentId: number;
  startupId: number;
  startupName: string;
  founderName: string;
  founderEmail: string;
  installmentNumber: number;
  totalInstallments: number;
  valor: string;
  scheduledDate?: string;
  paidAt?: string;
  txidC6?: string;
  allocationPercents?: string;
  rejectionReason?: string;
  campaignName: string;
  dashboardUrl: string;
  reviewUrl: string;
  resubmitUrl: string;
  comprovanteUrl: string;
}

export interface RepasseContext {
  repasseId: number;
  startupId: number;
  startupName: string;
  founderName: string;
  founderEmail: string;
  valorParcela: string;
  intervaloDias: number;
  numeroParcelas: number;
  valorTotalPago: string;
  campaignName: string;
  dashboardUrl: string;
}

/** Builds the full context for an installment email. */
export async function buildInstallmentContext(
  prisma: PrismaService,
  installmentId: number,
): Promise<InstallmentContext> {
  // Fetch minimal data needed with separate queries to avoid deep nesting issues
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: {
      request: { select: { allocationPercents: true, txidC6: true } },
    },
  });

  if (!installment) {
    throw new Error(`Installment ${installmentId} not found`);
  }

  const repasse = await prisma.repasse.findUnique({
    where: { id: installment.repasseId },
    include: {
      campaign: {
        include: {
          startup: {
            include: { founder: true },
          },
        },
      },
    },
  });

  if (!repasse) {
    throw new Error(`Repasse for installment ${installmentId} not found`);
  }

  const { campaign } = repasse;
  const { startup } = campaign;
  const { request } = installment;
  const installmentNum = installment.numero;
  const total = repasse.numeroParcelas;
  const valor = Number(installment.valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const BASE_URL = process.env['APP_URL'] || 'https://iselftoken.com';

  return {
    installmentId,
    startupId: startup.id,
    startupName: startup.nome,
    founderName: startup.founder.nome,
    founderEmail: startup.founder.email,
    installmentNumber: installmentNum,
    totalInstallments: total,
    valor,
    scheduledDate: installment.scheduledDate?.toLocaleDateString('pt-BR'),
    paidAt: installment.paidAt?.toLocaleDateString('pt-BR'),
    txidC6: request?.txidC6 ?? undefined,
    allocationPercents: formatAllocationPercents(request?.allocationPercents),
    rejectionReason: undefined,
    campaignName: campaign.title,
    dashboardUrl: `${BASE_URL}/dashboard/repasses`,
    reviewUrl: `${BASE_URL}/admin/repasses/installments/${installmentId}/review`,
    resubmitUrl: `${BASE_URL}/founder/startups/${startup.id}/repasse/installments/${installmentId}/resubmit`,
    comprovanteUrl: `${BASE_URL}/founder/startups/${startup.id}/repasse/comprovante/${installmentId}`,
  };
}

/** Builds the full context for a repasse email. */
export async function buildRepasseContext(
  prisma: PrismaService,
  repasseId: number,
): Promise<RepasseContext> {
  const repasse = await prisma.repasse.findUnique({
    where: { id: repasseId },
    include: {
      campaign: {
        include: {
          startup: {
            include: { founder: true },
          },
        },
      },
      installments: { where: { status: 'COMPLETED' } },
    },
  });

  if (!repasse) {
    throw new Error(`Repasse ${repasseId} not found`);
  }

  const { campaign, installments } = repasse;
  const { startup } = campaign;
  const BASE_URL = process.env['APP_URL'] || 'https://iselftoken.com';

  const valorTotalPago = installments
    .reduce((sum, i) => sum + Number(i.valor), 0)
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return {
    repasseId,
    startupId: startup.id,
    startupName: startup.nome,
    founderName: startup.founder.nome,
    founderEmail: startup.founder.email,
    valorParcela: Number(repasse.valorParcela).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }),
    intervaloDias: repasse.intervaloDias,
    numeroParcelas: repasse.numeroParcelas,
    valorTotalPago,
    campaignName: campaign.title,
    dashboardUrl: `${BASE_URL}/dashboard/repasses`,
  };
}

function formatAllocationPercents(allocation: unknown): string {
  if (!allocation) return '';
  const entries = Object.entries(allocation as Record<string, number>)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}: ${v}%`);
  return entries.join(', ');
}
