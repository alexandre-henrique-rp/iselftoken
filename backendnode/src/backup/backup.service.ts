import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export enum BackupProcess {
  ADMIN = 'ADMIN',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Injectable()
export class BackupService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger(BackupService.name, { timestamp: true });

  async userBackup(id: number, process: BackupProcess = BackupProcess.ADMIN) {
    try {
      const user: any = await this.prisma.user.findUnique({
        where: {
          id,
        },
        include: {
          avatar: true,
          auditLogs: true,
          payments: true,
          biofacial: true,
          comprovante: true,
          documento: true,
          investments: true,
          startups: true,
          subscriptions: true,
          tokenHistory: true,
          tokens: true,
          wallet: true,
        },
      });

      if (!user || !user.id) {
        this.logger.error(`usuário id: ${id} nao encontrado`);
        return null;
      }

      // Remove a senha do backup
      const { senha, ...userWithoutPassword } = user;

      await this.prisma.backupUser.create({
        data: {
          data: userWithoutPassword,
          process: process,
          userId: user.id,
        },
      });

      this.logger.log(
        `Backup criado para usuário ${id} - Processo: ${process}`,
      );
      return { id: user.id, backupProcess: process };
    } catch (error) {
      this.logger.error(
        'erro no backup do usuário',
        JSON.stringify(error, null, 2),
      );
      throw error;
    }
  }
}
