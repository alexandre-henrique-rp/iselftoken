import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { CreateTransparencyPostDto } from './dto/create-transparency-post.dto';
import { ListTransparencyPostsQueryDto } from './dto/list-posts-query.dto';
import { UpdateTransparencyPostDto } from './dto/update-transparency-post.dto';
import { TokenGateGuard } from './guards/token-gate.guard';
import { TransparencyService } from './transparency.service';

/**
 * Controller de Transparencia.
 *
 * Rotas:
 * - POST   /transparency/startups/:startupId/posts  - criar (founder only)
 * - GET    /transparency/startups/:startupId/posts  - listar (founder + token-holder)
 * - GET    /transparency/posts/:postId              - detalhe (founder + token-holder)
 * - PATCH  /transparency/posts/:postId              - editar (autor + ADMIN)
 * - DELETE /transparency/posts/:postId              - soft delete (autor + ADMIN)
 *
 * Auth: cookie de sessao via AuthGuard.
 * Gating de leitura: TokenGateGuard (founder OR token-holder).
 *
 * Referencia: scripts/PRD_PAGINA_TRANSPARENCIA.md §5.3
 */
@ApiTags('Transparency')
@ApiBearerAuth()
@Controller('transparency')
@UseGuards(AuthGuard)
export class TransparencyController {
  constructor(private readonly service: TransparencyService) {}

  /**
   * Cria um post de transparencia.
   * Apenas o founder da startup (ou ADMIN) pode criar.
   * A validacao de "founder da startup" ja foi feita implicitamente pelo
   * TokenGateGuard (founder passa o gate), mas validacao explicita no
   * service via authorId evita ambiguidade.
   */
  @Post('startups/:startupId/posts')
  @UseGuards(TokenGateGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria post de transparencia (founder ou ADMIN)',
    description:
      'Acessivel apenas ao founder da startup ou ADMIN. Body: title, content (markdown), type, periodMonth, periodYear, attachmentIds (opcional).',
  })
  @ApiResponse({ status: 201, description: 'Post criado.' })
  @ApiResponse({ status: 400, description: 'Dados invalidos.' })
  @ApiResponse({ status: 401, description: 'Nao autenticado.' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissao (nao e founder nem ADMIN).',
  })
  async create(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Req() req: any,
    @Body() dto: CreateTransparencyPostDto,
  ) {
    const userId = req.user.id;
    const result = await this.service.create(startupId, userId, dto);
    return { success: true, data: result };
  }

  /**
   * Lista posts paginados de uma startup.
   * Acessivel ao founder e a qualquer token-holder.
   */
  @Get('startups/:startupId/posts')
  @UseGuards(TokenGateGuard)
  @ApiOperation({
    summary: 'Lista posts de transparencia da startup',
    description:
      'Acessivel ao founder da startup e a qualquer investidor com token ativo. Suporta filtros via query: type, year, month, page, limit.',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de posts.' })
  @ApiResponse({ status: 403, description: 'Sem token da startup.' })
  async list(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Query() query: ListTransparencyPostsQueryDto,
  ) {
    return this.service.list(startupId, query);
  }

  /**
   * Detalhe de um post especifico.
   * Acessivel ao founder e a token-holders.
   */
  @Get('posts/:postId')
  @UseGuards(TokenGateGuard)
  @ApiOperation({ summary: 'Detalhe de um post' })
  @ApiResponse({ status: 200, description: 'Detalhe do post.' })
  @ApiResponse({ status: 404, description: 'Post nao encontrado.' })
  async findOne(@Param('postId', ParseIntPipe) postId: number) {
    const result = await this.service.findOne(postId);
    if (!result) {
      return { success: false, message: 'Post nao encontrado' };
    }
    return { success: true, data: result };
  }

  /**
   * Edita um post. Apenas o autor ou ADMIN.
   * Note: TokenGateGuard valida que user tem acesso a startup do post.
   * Service valida especificamente que user e o autor.
   */
  @Patch('posts/:postId')
  @UseGuards(TokenGateGuard)
  @ApiOperation({ summary: 'Edita post (autor ou ADMIN)' })
  @ApiResponse({ status: 200, description: 'Post atualizado.' })
  @ApiResponse({ status: 403, description: 'Nao e autor nem ADMIN.' })
  @ApiResponse({ status: 404, description: 'Post nao encontrado.' })
  async update(
    @Param('postId', ParseIntPipe) postId: number,
    @Req() req: any,
    @Body() dto: UpdateTransparencyPostDto,
  ) {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    const result = await this.service.update(postId, userId, isAdmin, dto);
    return { success: true, data: result };
  }

  /**
   * Soft delete do post. Apenas o autor ou ADMIN.
   */
  @Delete('posts/:postId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TokenGateGuard)
  @ApiOperation({ summary: 'Soft delete de post (autor ou ADMIN)' })
  @ApiResponse({ status: 200, description: 'Post deletado.' })
  @ApiResponse({ status: 403, description: 'Nao e autor nem ADMIN.' })
  @ApiResponse({ status: 404, description: 'Post nao encontrado.' })
  async remove(@Param('postId', ParseIntPipe) postId: number, @Req() req: any) {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';
    await this.service.remove(postId, userId, isAdmin);
    return { success: true };
  }
}
