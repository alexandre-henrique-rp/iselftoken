import {
  Injectable,
  Logger,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpenAccountDto } from './dto/open-account.dto';
import { EfiAccountAdapter } from '../efi/adapters/efi-account.adapter';
import { FeatureFlagsService } from 'src/common/feature-flags/feature-flags.service';
import { AuditService } from 'src/common/audit/audit.service';

export type EfiAccountOpeningStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface EfiAccountOpeningRecord {
  id: string;
  userId: number;
  holderDocument: string;
  holderName: string;
  holderEmail: string;
  holderPhone?: string;
  efiRegistrationId: string;
  status: EfiAccountOpeningStatus;
  statusUpdatedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EfiAccountOpeningResponse {
  id: string;
  userId: number;
  holderDocument: string;
  holderName: string;
  holderEmail: string;
  holderPhone?: string;
  efiRegistrationId: string;
  status: EfiAccountOpeningStatus;
  statusUpdatedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EfiAccountWebhookPayload {
  accountId: string;
  status: EfiAccountOpeningStatus;
  rejectionReason?: string;
}

/** Map userId → EfiAccountOpeningRecord[] (in-memory, replica do Prisma) */
const accountStore = new Map<number, EfiAccountOpeningRecord[]>();

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly efiAccountAdapter: EfiAccountAdapter,
    private readonly ff: FeatureFlagsService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * @description Abre conta digital EFI para o founder da startup.
   * @param dto Dados do titular (CPF/CNPJ, nome, email)
   * @param userId ID do usuário solicitante
   * @returns Registro de abertura de conta com status PENDING
   */
  async openAccount(
    dto: OpenAccountDto,
    userId: number,
  ): Promise<EfiAccountOpeningResponse> {
    // 1. Verifica se o user já tem conta ativa
    const existing = this.findByUserId(userId).find(
      (a) => a.status === 'APPROVED',
    );
    if (existing) {
      throw new ConflictException({
        code: 'account_already_open',
        message: 'User já possui conta EFI ativa',
      });
    }

    // 2. Mock ou real — usa EfiAccountAdapter via Inject
    if (this.ff.efiEnabled) {
      // Determina tipo PF/PJ pela quantidade de dígitos do documento
      const tipo = dto.holderDocument.length === 11 ? 'PF' : 'PJ';
      const cpfCnpjField = tipo === 'PF' ? 'cpfCnpj' : 'cpfCnpj';

      const result = await this.efiAccountAdapter.openAccount({
        holder: {
          tipo,
          nome: dto.holderName,
          email: dto.holderEmail,
          phone: dto.holderPhone ?? '',
          [cpfCnpjField]: dto.holderDocument,
        },
        // TODO: obter dados bancários reais da startup (T044-follow-up)
        bank: {
          bankCode: '000',
          agency: '0001',
          account: '00000000',
          accountType: 'checking',
        },
      });

      // 3. Persistir (in-memory — usar Prisma quando EfiAccountOpening for adicionado ao schema.prisma)
      const opening: EfiAccountOpeningRecord = {
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        holderDocument: dto.holderDocument,
        holderName: dto.holderName,
        holderEmail: dto.holderEmail,
        holderPhone: dto.holderPhone,
        efiRegistrationId: result.id,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const userAccounts = accountStore.get(userId) ?? [];
      userAccounts.push(opening);
      accountStore.set(userId, userAccounts);

      this.logger.log(
        `Conta EFI aberta: userId=${userId} efiId=${result.id} status=PENDING`,
      );

      return this.toResponse(opening);
    }

    throw new ServiceUnavailableException(
      'EFI_ENABLED=false — abertura de conta desabilitada',
    );
  }

  /**
   * @description Webhook handler — EFI envia status update.
   * @param payload Payload do webhook EFI
   * @returns Ack sempre { received: true }
   */
  async handleWebhook(
    payload: EfiAccountWebhookPayload,
  ): Promise<{ received: true }> {
    // Validate HMAC se aplicável (TODO)
    const allAccounts = Array.from(accountStore.values()).flat();
    const opening = allAccounts.find(
      (a) => a.efiRegistrationId === payload.accountId,
    );

    if (!opening) {
      this.logger.warn(
        `Webhook conta EFI não encontrada: ${payload.accountId}`,
      );
      return { received: true }; // ack anyway
    }

    const oldStatus = opening.status;
    opening.status = payload.status;
    opening.statusUpdatedAt = new Date();
    opening.updatedAt = new Date();
    if (payload.status === 'REJECTED' && payload.rejectionReason) {
      opening.rejectionReason = payload.rejectionReason;
    }

    // AuditLog
    await this.auditService.log({
      userId: null,
      action: 'EFI_ACCOUNT_STATUS_CHANGED',
      entity: 'EfiAccountOpening',
      entityId: opening.id,
      oldValue: { status: oldStatus },
      newValue: { status: payload.status },
    });

    this.logger.log(
      `Webhook EFI: accountId=${payload.accountId} ${oldStatus} → ${payload.status}`,
    );

    return { received: true };
  }

  /**
   * @description Lista aberturas de conta do usuário logado.
   * @param userId ID do usuário
   * @returns Lista de registros de abertura de conta
   */
  async listMine(userId: number): Promise<EfiAccountOpeningResponse[]> {
    return this.findByUserId(userId).map((a) => this.toResponse(a));
  }

  /** Retorna todos os registros de conta de um userId (in-memory). */
  private findByUserId(userId: number): EfiAccountOpeningRecord[] {
    return accountStore.get(userId) ?? [];
  }

  /** Converte record interno para response DTO. */
  private toResponse(r: EfiAccountOpeningRecord): EfiAccountOpeningResponse {
    return { ...r };
  }
}
