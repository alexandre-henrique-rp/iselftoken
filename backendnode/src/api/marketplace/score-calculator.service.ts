/**
 * S2-T01 — ScoreCalculatorService
 *
 * Algoritmo de score 0..100 conforme PRD_MARKETPLACE_IMPL.md §5.
 * Calcula score + breakdown de 9 chaves para uma startup e persiste.
 *
 * Breakdown (max 100):
 *   kyc          (10)
 *   documents    (15)
 *   seals        (15)
 *   traction     (10)
 *   raised       (10)
 *   deadline     (5)
 *   category     (5)
 *   partnerships (10)
 *   activity     (20)
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';

export type ScoreBreakdownKey = {
  earned: number;
  max: number;
  count?: number;
};

export type ScoreBreakdown = {
  kyc: ScoreBreakdownKey;
  documents: ScoreBreakdownKey;
  seals: ScoreBreakdownKey;
  traction: ScoreBreakdownKey;
  raised: ScoreBreakdownKey;
  deadline: ScoreBreakdownKey;
  category: ScoreBreakdownKey;
  partnerships: ScoreBreakdownKey;
  activity: ScoreBreakdownKey;
};

export type ScoreResult = {
  score: number;
  breakdown: ScoreBreakdown;
};

const PRIME_CATEGORIES = new Set(['AI', 'SAAS', 'FINTECH']);
const MAX_TOTAL_SCORE = 100;

@Injectable()
export class ScoreCalculatorService {
  private readonly logger = new Logger(ScoreCalculatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Calcula score 0..100 com breakdown de 9 chaves para uma startup.
   * Persiste em Startup.score + Startup.scoreBreakdown + Startup.scoreLastCalculatedAt
   * e emite evento 'startup.scoreUpdated' para listeners invalidarem cache.
   */
  async calculateForStartup(startupId: number): Promise<ScoreResult> {
    const startup: any = await this.prisma.startup.findUnique({
      where: { id: startupId },
      include: {
        campaigns: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        seals: {
          where: { seal: { active: true } },
          include: { seal: true },
        },
      },
    });

    if (!startup) {
      throw new Error(`Startup ${startupId} not found`);
    }

    const investmentsCount = await this.countActiveInvestments(startupId);
    const documentsCount = await this.countApprovedDocuments(startupId);
    const kycStatus = await this.getKycStatus(startupId);

    const breakdown: ScoreBreakdown = {
      kyc: this.scoreKyc(kycStatus),
      documents: this.scoreDocuments(documentsCount),
      seals: this.scoreSeals(startup.seals?.length ?? 0),
      traction: this.scoreTraction(investmentsCount),
      raised: this.scoreRaised(startup.campaigns?.[0]),
      deadline: this.scoreDeadline(startup.campaigns?.[0]?.deadline),
      category: this.scoreCategory(
        startup.category as string | null | undefined,
      ),
      partnerships: this.scorePartnerships(
        (startup.seals ?? []).filter(
          (r: any) => r.seal.category === 'PARTNERSHIP',
        ).length,
      ),
      activity: this.scoreActivity(startup.updatedAt),
    };

    const score = Math.min(
      MAX_TOTAL_SCORE,
      Object.values(breakdown).reduce((sum, k) => sum + k.earned, 0),
    );

    await this.prisma.startup.update({
      where: { id: startupId },
      data: {
        score,
        scoreBreakdown: breakdown as any,
        scoreLastCalculatedAt: new Date(),
      },
    });

    this.events.emit('startup.scoreUpdated', { startupId, score, breakdown });

    return { score, breakdown };
  }

  private async countApprovedDocuments(startupId: number): Promise<number> {
    try {
      return await this.prisma.startupDocument.count({
        where: { startupId, reviewStatus: 'APPROVED' as any },
      });
    } catch {
      return 0;
    }
  }

  private async countActiveInvestments(startupId: number): Promise<number> {
    try {
      return await this.prisma.investment.count({
        where: { campaign: { startupId } },
      });
    } catch {
      return 0;
    }
  }

  private async getKycStatus(
    startupId: number,
  ): Promise<string | null | undefined> {
    try {
      const startup: any = await this.prisma.startup.findUnique({
        where: { id: startupId },
        select: { founderId: true },
      });
      if (!startup?.founderId) return null;

      const [comprovante, documento, biofacial] = await Promise.all([
        (this.prisma as any).kYCProfile
          .findFirst({
            where: { comprovante_user: { some: { id: startup.founderId } } },
            select: { status: true },
          })
          .catch(() => null),
        (this.prisma as any).kYCProfile
          .findFirst({
            where: { documento_user: { some: { id: startup.founderId } } },
            select: { status: true },
          })
          .catch(() => null),
        (this.prisma as any).kYCProfile
          .findFirst({
            where: { biofacial_user: { some: { id: startup.founderId } } },
            select: { status: true },
          })
          .catch(() => null),
      ]);

      const statuses = [
        comprovante?.status,
        documento?.status,
        biofacial?.status,
      ].filter(Boolean) as string[];
      if (statuses.length === 0) return null;
      if (statuses.every((s) => s === 'APPROVED')) return 'APPROVED';
      if (statuses.some((s) => s === 'REJECTED')) return 'REJECTED';
      if (statuses.some((s) => s === 'UNDER_REVIEW')) return 'UNDER_REVIEW';
      return 'PENDING';
    } catch {
      return null;
    }
  }

  /**
   * Recalcula score de todas as startups APPROVED. Usado pelo cron diario
   * (S2-T02) e por listeners de outliers. Emite 'marketplace.scoreOutlier'
   * para mudanças >= 30 pts (anti-burla).
   */
  async recalculateAll(): Promise<{
    total: number;
    outliers: number;
  }> {
    const startups: any[] = await this.prisma.startup.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, score: true },
    });
    let outliers = 0;
    for (const s of startups) {
      const before = s.score ?? 0;
      const { score: after } = await this.calculateForStartup(s.id);
      const delta = Math.abs(after - before);
      if (delta >= 30) {
        outliers += 1;
        this.events.emit('marketplace.scoreOutlier', {
          startupId: s.id,
          before,
          after,
          delta,
        });
      }
    }
    return { total: startups.length, outliers };
  }

  // ===========================================================================
  // Helpers (cada chave do breakdown)
  // ===========================================================================

  private scoreKyc(kycStatus: string | null | undefined): ScoreBreakdownKey {
    const earned = kycStatus === 'APPROVED' ? 10 : 0;
    return { earned, max: 10, count: kycStatus === 'APPROVED' ? 1 : 0 };
  }

  private scoreDocuments(readyCount: number): ScoreBreakdownKey {
    const earned = Math.min(15, readyCount * 3);
    return { earned, max: 15, count: readyCount };
  }

  private scoreSeals(activeSealCount: number): ScoreBreakdownKey {
    const earned = Math.min(15, activeSealCount * 3);
    return { earned, max: 15, count: activeSealCount };
  }

  private scoreTraction(investmentsCount: number): ScoreBreakdownKey {
    let earned = 0;
    if (investmentsCount > 5) earned = 10;
    else if (investmentsCount > 2) earned = 5;
    return { earned, max: 10, count: investmentsCount };
  }

  private scoreRaised(
    campaign:
      | {
          targetAmount: any;
          tokensSold: number;
          tokenPrice: any;
          tokenBaseValue?: any;
        }
      | undefined,
  ): ScoreBreakdownKey {
    if (!campaign) return { earned: 0, max: 10 };
    const target = Number(campaign.targetAmount ?? 0);
    if (target <= 0) return { earned: 0, max: 10 };
    // Captado para a startup = tokens vendidos x preco BASE (repasse), nao
    // o preco de venda (que inclui markup da plataforma).
    const raised =
      Number(campaign.tokensSold ?? 0) *
      Number(campaign.tokenBaseValue ?? campaign.tokenPrice ?? 0);
    const ratio = raised / target;
    let earned = 0;
    if (ratio >= 0.8) earned = 10;
    else if (ratio >= 0.5) earned = 5;
    else earned = Math.round(ratio * 10);
    return { earned, max: 10 };
  }

  private scoreDeadline(deadline: Date | null | undefined): ScoreBreakdownKey {
    if (!deadline) return { earned: 0, max: 5 };
    const daysLeft = Math.floor((deadline.getTime() - Date.now()) / 86400000);
    let earned = 0;
    if (daysLeft > 60) earned = 5;
    else if (daysLeft > 30) earned = 3;
    else if (daysLeft > 7) earned = 1;
    return { earned, max: 5 };
  }

  private scoreCategory(
    category: string | null | undefined,
  ): ScoreBreakdownKey {
    const earned = category && PRIME_CATEGORIES.has(category) ? 5 : 3;
    return { earned, max: 5, count: 1 };
  }

  private scorePartnerships(partnershipSealCount: number): ScoreBreakdownKey {
    const earned = Math.min(10, partnershipSealCount * 5);
    return { earned, max: 10, count: partnershipSealCount };
  }

  private scoreActivity(updatedAt: Date): ScoreBreakdownKey {
    const daysSince = Math.floor((Date.now() - updatedAt.getTime()) / 86400000);
    let earned = 0;
    if (daysSince <= 7) earned = 20;
    else if (daysSince <= 14) earned = 10;
    else if (daysSince <= 30) earned = 5;
    return { earned, max: 20 };
  }
}
