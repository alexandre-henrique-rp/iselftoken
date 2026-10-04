import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * Interface para dados do usuario no contexto de requisicao.
 */
interface RequestUser {
  id: number;
  publicId: string;
  role: string;
}

/**
 * Interface para resultado da exclusao.
 */
interface DeleteStartupResult {
  logId: string;
  startupId: string;
  snapshotSha256: string;
}

@Injectable()
export class ComplianceDeleteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa HARD DELETE de startup com log de auditoria imutavel.
   *
   * Pipeline atomico (Prisma transaction):
   * 1. Buscar startup completo + relacoes (rodadas, investments, payments, documentos)
   * 2. Montar snapshot JSON e calcular SHA-256
   * 3. Inserir registro em StartupDeleteAuditLog
   * 4. Executar delete em cascata
   *
   * Se qualquer step falhar, o ROLLBACK ocorre automaticamente.
   *
   * @param adminUser - Usuario compliance logado (do JWT/request)
   * @param startupId - ID da startup a ser excluida
   * @param reason - Motivo da exclusao (obrigatorio, min 10 chars)
   * @param ipAddress - IP do request (opcional)
   * @param userAgent - User-Agent do browser (opcional)
   * @returns Resultado com logId e hash do snapshot
   * @throws NotFoundException se startup nao existir
   */
  async deleteStartup(
    adminUser: RequestUser,
    startupId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DeleteStartupResult> {
    const startupIdNum = parseInt(startupId, 10);
    if (isNaN(startupIdNum)) {
      throw new NotFoundException('ID de startup invalido');
    }

    // 1. Buscar startup com todas as relacoes (nested includes)
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupIdNum },
      include: {
        campaigns: {
          include: {
            investments: {
              include: {
                user: { select: { id: true, email: true, nome: true } },
                payment: true,
              },
            },
            tokens: {
              include: {
                user: { select: { id: true, email: true, nome: true } },
              },
            },
          },
        },
        issuedTokens: {
          include: {
            user: { select: { id: true, email: true, nome: true } },
          },
        },
        withdrawals: true,
        seals: true,
        opinions: true,
        curatedPicks: true,
        documents: true,
        uploads: true,
        founder: {
          select: { id: true, email: true, nome: true, publicId: true },
        },
        logo: true,
        cover: true,
        mie: true,
        contrato_social: true,
        cnpj_document: true,
        balanco_atual: true,
        declaracao_veracidade: true,
        ata_eleicao: true,
        balanco_anterior: true,
        procuracao: true,
        cv_socios: true,
        pitch_deck: true,
        projecoes: true,
        modelo_contrato_oferta: true,
        comprovante_endereco: true,
        declaracao_receita: true,
      },
    });

    if (!startup) {
      throw new NotFoundException('Startup nao encontrada');
    }

    // 2. Montar snapshots JSON
    const startupSnapshot = JSON.stringify(startup, null, 2);

    // Encontrar rodada ativa (se houver)
    const activeRodada = startup.campaigns.find(
      (c) => c.status === 'OPEN' || c.status === 'FUNDED',
    );
    const rodadaSnapshot = activeRodada
      ? JSON.stringify(activeRodada, null, 2)
      : null;

    // Investments atraves das campanhas
    const allInvestments = startup.campaigns.flatMap((c) => c.investments);
    const activeInvestments = allInvestments.filter(
      (i) => i.status === 'CONFIRMED',
    );
    const investmentsSnapshot =
      activeInvestments.length > 0
        ? JSON.stringify(activeInvestments, null, 2)
        : null;

    // Payments relacionados aos investments
    const paymentsData = activeInvestments
      .filter((i) => i.payment)
      .map((i) => i.payment);
    const paymentsSnapshot =
      paymentsData.length > 0 ? JSON.stringify(paymentsData, null, 2) : null;

    // Documentos da startup
    const documentsSnapshot =
      startup.documents.length > 0
        ? JSON.stringify(startup.documents, null, 2)
        : null;

    // SignedDocs (S18) - placeholder ate o model existir
    const signedDocsSnapshot = null;

    // 3. Calcular SHA-256 do snapshot
    const snapshotSha256 = crypto
      .createHash('sha256')
      .update(startupSnapshot)
      .digest('hex');

    // 4. Calcular retentionUntil (7 anos)
    const deletedAt = new Date();
    const retentionUntil = new Date(deletedAt);
    retentionUntil.setFullYear(retentionUntil.getFullYear() + 7);

    // 5. Executar transacao atomica
    const result = await this.prisma.$transaction(async (tx) => {
      // Inserir log de auditoria ANTES do delete
      const auditLog = await tx.startupDeleteAuditLog.create({
        data: {
          startupId: startup.id.toString(),
          startupSnapshot,
          rodadaSnapshot,
          investmentsSnapshot,
          paymentsSnapshot,
          documentsSnapshot,
          signedDocsSnapshot,
          deletedByUserId: adminUser.publicId,
          deletedByRole: adminUser.role,
          deletedAt,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          reason: reason || null,
          retentionUntil,
        },
      });

      // Delete em cascata - na ordem correta based on FK dependencies

      // Deletar tokens primeiro (tem FK para startup e user)
      await tx.token.deleteMany({ where: { startupId: startup.id } });

      // Deletar campaigns (possui investments e tokens)
      await tx.campaign.deleteMany({ where: { startupId: startup.id } });

      // Investments - ja foram deletados via cascade da campaign

      // Withdrawals
      await tx.withdrawal.deleteMany({ where: { startupId: startup.id } });

      // StartupSeal
      await tx.startupSeal.deleteMany({ where: { startupId: startup.id } });

      // StartupOpinion
      await tx.startupOpinion.deleteMany({ where: { startupId: startup.id } });

      // CuratedPick
      await tx.curatedPick.deleteMany({ where: { startupId: startup.id } });

      // Uploads
      await tx.upload.deleteMany({ where: { startupId: startup.id } });

      // StartupDocument
      await tx.startupDocument.deleteMany({ where: { startupId: startup.id } });

      // Finalmente, deletar a startup
      await tx.startup.delete({ where: { id: startup.id } });

      return auditLog;
    });

    return {
      logId: result.id,
      startupId: startup.id.toString(),
      snapshotSha256,
    };
  }

  /**
   * Lista logs de auditoria de delete com CNPJ mascarado.
   *
   * @param page - Numero da pagina (default 1)
   * @param limit - Itens por pagina (default 25)
   * @returns Lista paginada com logs e CNPJs mascarados
   */
  async listAuditLogs(page: number = 1, limit: number = 25) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.startupDeleteAuditLog.findMany({
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
      }),
      this.prisma.startupDeleteAuditLog.count(),
    ]);

    // Mascarar CNPJ em cada log
    const maskedLogs = logs.map((log) => {
      let maskedStartupSnapshot = log.startupSnapshot;

      // Extrair e mascarar CNPJ do snapshot JSON
      try {
        const snapshot = JSON.parse(log.startupSnapshot);
        if (snapshot.cnpj) {
          // Formato: 12.345.***/****-00
          const cnpj = snapshot.cnpj;
          const cleanCnpj = cnpj.replace(/\D/g, '');
          if (cleanCnpj.length === 14) {
            const masked =
              cleanCnpj.slice(0, 2) +
              '.' +
              cleanCnpj.slice(2, 5) +
              '.***/****-' +
              cleanCnpj.slice(12, 14);
            maskedStartupSnapshot = log.startupSnapshot.replace(cnpj, masked);
          }
        }
      } catch {
        // Se falhar parse, manter original
      }

      return {
        ...log,
        startupSnapshot: maskedStartupSnapshot,
        // Nao expor campos internos
        ipAddress: log.ipAddress ? '[REDATADO]' : null,
        userAgent: log.userAgent ? '[REDATADO]' : null,
      };
    });

    return {
      data: maskedLogs,
      pagina: page,
      totalPaginas: Math.ceil(total / limit),
      total,
      porPagina: limit,
    };
  }
}
