import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { BackupProcess } from './backup.service';
import { Observable } from 'rxjs';
import { BackupService } from './backup.service';

@Injectable()
export class BackupInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BackupInterceptor.name);

  constructor(private readonly backupService: BackupService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Verifica se é uma rota de usuário e se o método é PATCH/PUT/DELETE
    const isUserRoute =
      request.route?.path?.includes('/users/') ||
      request.url?.includes('/users/');
    const hasUserId =
      request.params?.id || request.body?.userId || request.user?.id;

    if (
      isUserRoute &&
      hasUserId &&
      ['PATCH', 'PUT', 'DELETE'].includes(method)
    ) {
      const userId = parseInt(
        request.params?.id || request.body?.userId || request.user?.id,
      );

      if (userId && !isNaN(userId)) {
        try {
          // Determina o tipo de processo
          let process: BackupProcess = BackupProcess.UPDATE;
          if (method === 'DELETE') {
            process = BackupProcess.DELETE;
          }

          // Executa o backup antes da operação
          this.logger.log(
            'Criando backup automático do usuário ' +
              userId +
              ' antes de ' +
              method,
          );
          await this.backupService.userBackup(userId);

          // Adiciona info do backup no request para possível uso posterior
          request.backupCreated = {
            userId,
            process,
            timestamp: new Date(),
          };
        } catch (error) {
          this.logger.error('Erro ao criar backup automático: ' + error);
          // Não impede a execução, apenas loga o erro
        }
      }
    }

    return next.handle();
  }
}
