import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataChangeField, DataChangeStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';
import { EmailService } from 'src/email/email.service';

/** Campos bloqueados pós-rodada (B07) que admitem solicitação de alteração. */
const BLOCKED_FIELDS: DataChangeField[] = [
  DataChangeField.CNPJ,
  DataChangeField.RAZAO_SOCIAL,
  DataChangeField.PAIS,
];

/** Mapeamento campo → coluna na tabela Startup para atualização. */
const FIELD_TO_COLUMN: Record<DataChangeField, string> = {
  CNPJ: 'cnpj',
  RAZAO_SOCIAL: 'razao_social',
  PAIS: 'pais',
};

/** Label legível dos campos para mensagens de email/notificação. */
const FIELD_LABELS: Record<DataChangeField, string> = {
  CNPJ: 'CNPJ',
  RAZAO_SOCIAL: 'Razão Social',
  PAIS: 'País',
};

/**
 * Serviço de solicitação de alteração de dados bloqueados pós-rodada.
 *
 * Permite ao fundador solicitar alterações de campos bloqueados (CNPJ,
 * Razão Social, País) que são revisadas pela equipe de compliance.
 * Cada transição gera registro de auditoria e notificação por email.
 */
@Injectable()
export class DataChangeRequestService {
  private readonly logger = new Logger(DataChangeRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Cria uma solicitação de alteração de dado bloqueado.
   *
   * Valida que:
   * - A startup existe e pertence ao founder autenticado
   * - O campo é um dos bloqueados (CNPJ, RAZAO_SOCIAL, PAIS)
   * - O valor solicitado é diferente do valor atual
   *
   * @param startupId ID da startup
   * @param userId ID do fundador solicitante
   * @param field Campo bloqueado a alterar
   * @param requestedValue Novo valor desejado
   * @returns Solicitação criada com status PENDING
   * @throws NotFoundException se startup não encontrada
   * @throws ForbiddenException se startup não pertence ao founder
   * @throws BadRequestException se campo não bloqueado ou valor igual ao atual
   */
  async createRequest(
    startupId: number,
    userId: number,
    field: DataChangeField,
    requestedValue: string,
  ) {
    // 1. Validar campo bloqueado
    if (!BLOCKED_FIELDS.includes(field)) {
      throw new BadRequestException(
        `Campo '${field}' não é um campo bloqueado. Campos permitidos: ${BLOCKED_FIELDS.join(', ')}`,
      );
    }

    // 2. Buscar startup
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: {
        id: true,
        founderId: true,
        cnpj: true,
        razao_social: true,
        pais: true,
      },
    });

    if (!startup) {
      throw new NotFoundException(`Startup #${startupId} não encontrada`);
    }

    // 3. Verificar ownership
    if (startup.founderId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para solicitar alterações nesta startup',
      );
    }

    // 4. Obter valor atual do campo
    const currentValue = this.getCurrentValue(startup, field);

    // 5. Validar que valor solicitado é diferente
    const currentStr =
      typeof currentValue === 'string'
        ? currentValue
        : JSON.stringify(currentValue);
    if (currentStr === requestedValue) {
      throw new BadRequestException(
        'O valor solicitado é igual ao valor atual. Nenhuma alteração necessária.',
      );
    }

    // 6. Criar solicitação
    const request = await this.prisma.dataChangeRequest.create({
      data: {
        startupId,
        requestedByUserId: userId,
        field,
        currentValue: currentStr,
        requestedValue,
        status: DataChangeStatus.PENDING,
      },
    });

    // 7. Audit log
    await this.auditService.log({
      userId,
      action: 'DATA_CHANGE_REQUESTED',
      entity: 'DataChangeRequest',
      entityId: request.id,
      newValue: {
        startupId,
        field,
        currentValue: currentStr,
        requestedValue,
      } as Prisma.InputJsonValue,
    });

    this.logger.log(
      `Solicitação de alteração criada: #${request.id} (startup=${startupId}, campo=${field})`,
    );

    return request;
  }

  /**
   * Lista solicitações de alteração de um fundador específico.
   *
   * @param startupId ID da startup
   * @param userId ID do fundador (para filtrar apenas suas solicitações)
   * @returns Lista de solicitações ordenadas por data de criação (desc)
   */
  async listByStartup(startupId: number, userId: number) {
    return this.prisma.dataChangeRequest.findMany({
      where: {
        startupId,
        requestedByUserId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista todas as solicitações com status PENDING (para compliance).
   *
   * @returns Lista de solicitações pendentes com dados da startup e solicitante
   */
  async listPending() {
    return this.prisma.dataChangeRequest.findMany({
      where: { status: DataChangeStatus.PENDING },
      include: {
        startup: { select: { id: true, nome: true, cnpj: true, slug: true } },
        requestedBy: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Revisa uma solicitação de alteração (aprovar ou rejeitar).
   *
   * Se APROVED: atualiza o campo na Startup e registra audit log.
   * Se REJECTED: apenas registra audit log.
   * Em ambos os casos: envia email de notificação ao fundador.
   *
   * @param requestId ID da solicitação
   * @param reviewerId ID do revisor (compliance)
   * @param decision APPROVED ou REJECTED
   * @param reviewNote Nota do revisor (mínimo 10 caracteres)
   * @returns Solicitação atualizada
   * @throws NotFoundException se solicitação não encontrada
   * @throws BadRequestException se solicitação não está PENDING
   */
  async review(
    requestId: number,
    reviewerId: number,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote: string,
  ) {
    // 1. Validar reviewNote
    if (!reviewNote || reviewNote.length < 10) {
      throw new BadRequestException(
        'reviewNote é obrigatório e deve ter no mínimo 10 caracteres',
      );
    }

    // 2. Buscar solicitação
    const request = await this.prisma.dataChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        startup: true,
        requestedBy: { select: { id: true, nome: true, email: true } },
      },
    });

    if (!request) {
      throw new NotFoundException(`Solicitação #${requestId} não encontrada`);
    }

    // 3. Validar que está PENDING
    if (request.status !== DataChangeStatus.PENDING) {
      throw new BadRequestException(
        `Solicitação #${requestId} já foi ${request.status.toLowerCase()}. Apenas solicitações pendentes podem ser revisadas.`,
      );
    }

    const newStatus =
      decision === 'APPROVED'
        ? DataChangeStatus.APPROVED
        : DataChangeStatus.REJECTED;

    // 4. Se APROVED: atualizar campo na Startup
    if (decision === 'APPROVED') {
      const columnName = FIELD_TO_COLUMN[request.field];
      const updateData: Record<string, unknown> = {};

      // PAIS é JSON no banco
      if (request.field === DataChangeField.PAIS) {
        try {
          updateData[columnName] = JSON.parse(request.requestedValue);
        } catch {
          updateData[columnName] = request.requestedValue;
        }
      } else {
        updateData[columnName] = request.requestedValue;
      }

      await this.prisma.startup.update({
        where: { id: request.startupId },
        data: updateData,
      });

      this.logger.log(
        `Campo ${request.field} da startup #${request.startupId} atualizado via compliance review`,
      );
    }

    // 5. Atualizar status da solicitação
    const updated = await this.prisma.dataChangeRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewedByUserId: reviewerId,
        reviewNote,
        reviewedAt: new Date(),
      },
    });

    // 6. Audit log
    await this.auditService.log({
      userId: reviewerId,
      action:
        decision === 'APPROVED'
          ? 'DATA_CHANGE_APPROVED'
          : 'DATA_CHANGE_REJECTED',
      entity: 'DataChangeRequest',
      entityId: requestId,
      oldValue: { status: DataChangeStatus.PENDING } as Prisma.InputJsonValue,
      newValue: {
        status: newStatus,
        reviewNote,
        field: request.field,
        startupId: request.startupId,
      } as Prisma.InputJsonValue,
    });

    // 7. Email de notificação ao fundador
    await this.sendReviewNotification(
      request.requestedBy.email,
      request.requestedBy.nome,
      request.startup.nome,
      request.field,
      decision,
      reviewNote,
    );

    return updated;
  }

  /**
   * Obtém o valor atual de um campo bloqueado na startup.
   *
   * @param startup Dados da startup
   * @param field Campo a consultar
   * @returns Valor atual do campo
   */
  private getCurrentValue(
    startup: {
      cnpj: string;
      razao_social: string | null;
      pais: Prisma.JsonValue | null;
    },
    field: DataChangeField,
  ): string | Prisma.JsonValue {
    switch (field) {
      case DataChangeField.CNPJ:
        return startup.cnpj;
      case DataChangeField.RAZAO_SOCIAL:
        return startup.razao_social ?? '';
      case DataChangeField.PAIS:
        return startup.pais;
      default:
        throw new BadRequestException(`Campo '${field}' não suportado`);
    }
  }

  /**
   * Envia email de notificação ao fundador sobre decisão da solicitação.
   *
   * @param email Email do fundador
   * @param founderName Nome do fundador
   * @param startupName Nome da startup
   * @param field Campo alterado
   * @param decision APPROVED ou REJECTED
   * @param reviewNote Nota do revisor
   */
  private async sendReviewNotification(
    email: string,
    founderName: string,
    startupName: string,
    field: DataChangeField,
    decision: 'APPROVED' | 'REJECTED',
    reviewNote: string,
  ): Promise<void> {
    const fieldLabel = FIELD_LABELS[field] ?? field;
    const statusLabel = decision === 'APPROVED' ? 'APROVADA' : 'REJEITADA';
    const subject = `Solicitação de alteração de ${fieldLabel} — ${statusLabel}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${decision === 'APPROVED' ? '#22c55e' : '#ef4444'};">
          Solicitação ${statusLabel}
        </h2>
        <p>Olá <strong>${founderName}</strong>,</p>
        <p>
          Sua solicitação de alteração do campo <strong>${fieldLabel}</strong>
          da startup <strong>${startupName}</strong> foi
          <strong>${statusLabel.toLowerCase()}</strong> pela equipe de compliance.
        </p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Nota do revisor:</strong></p>
          <p style="margin: 4px 0; color: #374151;">${reviewNote}</p>
        </div>
        <p style="color: #6b7280; font-size: 12px;">
          Este é um email automático. Não responda diretamente.
        </p>
      </div>
    `.trim();

    try {
      await this.emailService.sendEmail({
        to: email,
        subject,
        type: 'html',
        text: html,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar email de notificação para ${email}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
