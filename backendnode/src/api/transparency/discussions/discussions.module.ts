import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../../../auth/auth.module';
import { TokenGateGuard } from '../guards/token-gate.guard';
import { AuditModule } from '../../../common/audit/audit.module';
import { DiscussionsController } from './discussions.controller';
import { DiscussionsService } from './discussions.service';
import { CanEditDiscussionGuard } from './guards/can-edit-discussion.guard';

/**
 * Modulo de Discussao da area de Transparencia (TRANSP-03 / TRANSP-05).
 *
 * Endpoints:
 *  GET    /transparency/startups/:startupId/discussions
 *  POST   /transparency/startups/:startupId/discussions
 *  GET    /transparency/discussions/:discussionId
 *  PATCH  /transparency/discussions/:discussionId
 *  DELETE /transparency/discussions/:discussionId
 *  POST   /transparency/discussions/:discussionId/upvote  (toggle idempotente)
 *  DELETE /transparency/discussions/:discussionId/upvote
 *  POST   /transparency/discussions/:discussionId/pin
 *  DELETE /transparency/discussions/:discussionId/pin
 *  POST   /transparency/discussions/:discussionId/replies
 *  DELETE /transparency/replies/:replyId
 *
 * Auth: AuthGuard global + TokenGateGuard por rota + CanEditDiscussionGuard
 * (PATCH/DELETE de thread/reply).
 */
@Module({
  imports: [PrismaModule, AuthModule, AuditModule],
  controllers: [DiscussionsController],
  providers: [DiscussionsService, TokenGateGuard, CanEditDiscussionGuard],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
