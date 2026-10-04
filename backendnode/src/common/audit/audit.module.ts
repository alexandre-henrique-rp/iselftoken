import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditService } from './audit.service';

/**
 * Exporta o `AuditService` globalmente — outros módulos só precisam injetar
 * `AuditService` sem importar este módulo explicitamente.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
