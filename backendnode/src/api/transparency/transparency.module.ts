import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { TransparencyController } from './transparency.controller';
import { TransparencyService } from './transparency.service';
import { TokenGateGuard } from './guards/token-gate.guard';

/**
 * Modulo de Transparencia.
 *
 * Endpoints:
 * - POST/GET   /transparency/startups/:startupId/posts
 * - GET/PATCH/DELETE /transparency/posts/:postId
 *
 * Auth: AuthGuard global + TokenGateGuard por rota (gating por token).
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TransparencyController],
  providers: [TransparencyService, TokenGateGuard],
  exports: [TransparencyService],
})
export class TransparencyModule {}
