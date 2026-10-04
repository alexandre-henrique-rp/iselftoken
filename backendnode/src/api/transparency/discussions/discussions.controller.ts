import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../../auth/auth.guard';
import { TokenGateGuard } from '../guards/token-gate.guard';
import { CanEditDiscussionGuard } from './guards/can-edit-discussion.guard';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ForceDeleteDto } from './dto/force-delete.dto';
import { ListDiscussionsQueryDto } from './dto/list-discussions-query.dto';
import { DiscussionsService } from './discussions.service';

/**
 * Controller de Discussao da area de Transparencia (TRANSP-03 / TRANSP-05).
 *
 * Auth: AuthGuard global + TokenGateGuard + CanEditDiscussionGuard (este ultimo
 * apenas em PATCH/DELETE de thread/reply).
 *
 * Rotas:
 *  GET    /transparency/startups/:startupId/discussions
 *  POST   /transparency/startups/:startupId/discussions
 *  GET    /transparency/discussions/:discussionId
 *  PATCH  /transparency/discussions/:discussionId
 *  DELETE /transparency/discussions/:discussionId
 *  POST   /transparency/discussions/:discussionId/upvote
 *  DELETE /transparency/discussions/:discussionId/upvote
 *  POST   /transparency/discussions/:discussionId/pin
 *  DELETE /transparency/discussions/:discussionId/pin
 *  POST   /transparency/discussions/:discussionId/replies
 *  DELETE /transparency/replies/:replyId
 */
@ApiTags('Transparency — Discussions')
@ApiBearerAuth()
@Controller('transparency')
@UseGuards(AuthGuard)
export class DiscussionsController {
  constructor(private readonly service: DiscussionsService) {}

  @Get('startups/:startupId/discussions')
  @UseGuards(TokenGateGuard)
  @ApiOperation({
    summary: 'Lista threads de Discussao da startup',
    description:
      'Query: q (busca), category (taxonomia), sort (recent|oldest|top), page, limit. Pinned sempre separado no topo.',
  })
  async list(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Query() query: ListDiscussionsQueryDto,
  ) {
    return this.service.list(startupId, query);
  }

  @Post('startups/:startupId/discussions')
  @UseGuards(TokenGateGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria nova thread de Discussao' })
  async create(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Req() req: any,
    @Body() dto: CreateDiscussionDto,
  ) {
    const userId = req.user.id as number;
    return this.service.create(startupId, userId, dto);
  }

  @Get('discussions/:discussionId')
  @UseGuards(TokenGateGuard)
  @ApiOperation({
    summary: 'Detalhe de uma thread (com replies paginadas)',
  })
  async findOne(@Param('discussionId') discussionId: string, @Req() req: any) {
    const userId = req.user.id as number;
    return this.service.findOne(discussionId, userId);
  }

  @Patch('discussions/:discussionId')
  @UseGuards(CanEditDiscussionGuard)
  @ApiOperation({
    summary: 'Edita thread (autor ate 24h, ou ADMIN)',
  })
  async update(
    @Param('discussionId') discussionId: string,
    @Req() req: any,
    @Body() dto: UpdateDiscussionDto,
  ) {
    const userId = req.user.id as number;
    const isAdmin = req.user.role === 'ADMIN';
    return this.service.update(discussionId, userId, isAdmin, dto);
  }

  @Delete('discussions/:discussionId')
  @UseGuards(CanEditDiscussionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft delete de thread. force=true obrigatorio se houver replies.',
  })
  async remove(
    @Param('discussionId') discussionId: string,
    @Req() req: any,
    @Body() body: ForceDeleteDto,
  ) {
    const userId = req.user.id as number;
    const isAdmin = req.user.role === 'ADMIN';
    await this.service.remove(
      discussionId,
      userId,
      isAdmin,
      body.force ?? false,
    );
    return { success: true };
  }

  /**
   * Toggle upvote: POST idempotente. DELETE aceito como alias (remove tambem).
   */
  @Post('discussions/:discussionId/upvote')
  @ApiOperation({
    summary:
      'Toggle upvote (idempotente): upvote se nao votou, desupvote se ja votou.',
  })
  async upvote(@Param('discussionId') discussionId: string, @Req() req: any) {
    const userId = req.user.id as number;
    return this.service.toggleUpvote(discussionId, userId);
  }

  @Delete('discussions/:discussionId/upvote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Alias para remover upvote (toggle off).' })
  async unvote(@Param('discussionId') discussionId: string, @Req() req: any) {
    const userId = req.user.id as number;
    return this.service.toggleUpvote(discussionId, userId);
  }

  @Post('discussions/:discussionId/pin')
  @UseGuards(TokenGateGuard)
  @ApiOperation({
    summary: 'Fixar thread (founder/admin). Atomicidade 1 pinned/startup.',
  })
  async pin(@Param('discussionId') discussionId: string, @Req() req: any) {
    const userId = req.user.id as number;
    const isAdmin = req.user.role === 'ADMIN';
    return this.service.pin(discussionId, userId, isAdmin);
  }

  @Delete('discussions/:discussionId/pin')
  @UseGuards(TokenGateGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desfixar thread (founder/admin).' })
  async unpin(@Param('discussionId') discussionId: string, @Req() req: any) {
    const userId = req.user.id as number;
    const isAdmin = req.user.role === 'ADMIN';
    return this.service.unpin(discussionId, userId, isAdmin);
  }

  @Post('discussions/:discussionId/replies')
  @UseGuards(TokenGateGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria reply em uma thread.' })
  async createReply(
    @Param('discussionId') discussionId: string,
    @Req() req: any,
    @Body() dto: CreateReplyDto,
  ) {
    const userId = req.user.id as number;
    return this.service.createReply(discussionId, userId, dto);
  }

  @Delete('replies/:replyId')
  @UseGuards(CanEditDiscussionGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete de reply (autor <24h ou ADMIN).' })
  async removeReply(@Param('replyId') replyId: string, @Req() req: any) {
    const userId = req.user.id as number;
    const isAdmin = req.user.role === 'ADMIN';
    await this.service.removeReply(replyId, userId, isAdmin);
    return { success: true };
  }
}
