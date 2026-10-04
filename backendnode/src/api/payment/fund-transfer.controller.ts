import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { ResponseDto } from 'src/common/dto/response.dto';
import { FundTransferService, RepasseStatus } from './fund-transfer.service';

/** Total de parcelas (constante do B12). */
const REPASSE_PARCELAS_TOTAL = 3;

/** Janela em ms considerada "recém-criado" para retornar 201 vs 200. */
const RECENTLY_CREATED_WINDOW_MS = 5_000;

/**
 * Controller de Repasse de Fundos para fundadores (B12).
 *
 * Endpoints:
 * - `POST /founder/startups/:id/repasse/initiate` — fundador dispara o fluxo
 *   (cria NF + 3 parcelas). Idempotente.
 * - `GET /founder/startups/:id/repasse` — consulta NF + status das parcelas.
 *
 * Ownership: o startup deve pertencer ao founder autenticado (ou ADMIN).
 */
@ApiTags('Repasse de Fundos')
@Controller('founder/startups')
@UseGuards(AuthGuard)
@ApiCookieAuth()
export class FundTransferController {
  constructor(private readonly fundTransferService: FundTransferService) {}

  /**
   * Inicia o processo de repasse para a campanha FUNDED da startup.
   *
   * Validações:
   * - Startup pertence ao founder autenticado
   * - Existe campanha com status FUNDED
   * - Repasse ainda não foi iniciado (idempotência: retorna existente se já)
   *
   * @param id - ID da startup
   * @param req - Request autenticado
   * @returns RepasseStatus com NF + 3 parcelas criadas (ou existentes)
   */
  @Post(':id/repasse/initiate')
  @ApiOperation({
    summary: 'Iniciar repasse de fundos para a startup',
    description:
      'Cria a NF + 3 parcelas (0/30/60 dias) para a campanha FUNDED da startup. ' +
      'Idempotente: se já iniciado, retorna o repasse existente com status 200.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da startup' })
  @ApiResponse({ status: 201, description: 'Repasse iniciado com sucesso' })
  @ApiResponse({
    status: 200,
    description: 'Repasse já estava iniciado (idempotente)',
  })
  @ApiResponse({
    status: 400,
    description: 'Campanha não está FUNDED ou sem investments',
  })
  @ApiResponse({ status: 403, description: 'Startup não pertence ao founder' })
  @ApiResponse({ status: 404, description: 'Startup não encontrada' })
  async initiateTransfer(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    const startupId = +id;
    try {
      const result = await this.fundTransferService.initiateTransfer(
        startupId,
        req.user.id,
        req.user.role,
      );

      // Idempotência: distingue criação nova vs retorno de existente
      // baseado na idade da NF (issuedAt). Se a NF foi emitida há menos
      // de 5s, considera-se recém-criada (201). Caso contrário, é o
      // retorno idempotente de um repasse já existente (200).
      const now = Date.now();
      const issuedAtMs = result.notafiscal?.issuedAt?.getTime() ?? 0;
      const isJustCreated =
        result.notafiscal &&
        now - issuedAtMs < RECENTLY_CREATED_WINDOW_MS &&
        result.transfers.length === REPASSE_PARCELAS_TOTAL;

      return ResponseDto.success(
        isJustCreated
          ? 'Repasse iniciado com sucesso'
          : 'Repasse já estava iniciado',
        isJustCreated ? HttpStatus.CREATED : HttpStatus.OK,
        result,
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        'Erro ao iniciar repasse',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Retorna o status completo do repasse de uma startup.
   *
   * @param id - ID da startup
   * @param req - Request autenticado
   * @returns RepasseStatus com NF + parcelas (ou vazio se não iniciado)
   */
  @Get(':id/repasse')
  @ApiOperation({
    summary: 'Consultar status do repasse de fundos',
    description:
      'Retorna NF + 3 parcelas com status atual. Se repasse não foi iniciado, ' +
      'retorna notafiscal=null e transfers=[]',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da startup' })
  @ApiResponse({ status: 200, description: 'Status do repasse' })
  @ApiResponse({ status: 403, description: 'Startup não pertence ao founder' })
  @ApiResponse({ status: 404, description: 'Startup não encontrada' })
  async getTransferStatus(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ): Promise<RepasseStatus> {
    const startupId = +id;
    try {
      return await this.fundTransferService.getTransferStatus(
        startupId,
        req.user.id,
        req.user.role,
      );
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        'Erro ao consultar status do repasse',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
