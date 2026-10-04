/**
 * Controller administrativo de uploads.
 *
 * Gerencia operacoes de exclusao de uploads por ADMIN e COMPLIANCE.
 * Todas as rotas exigem autenticacao e role adequada.
 *
 * @controller AdminUploadsController
 */
import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { UploadsService } from './uploads.service';
import { AuthGuard } from '../../auth/auth.guard';
import { ComplianceGuard } from '../../auth/compliance.guard';
import { DeleteUploadResponseDto } from './dto/upload-response.dto';

@ApiTags('Admin - Uploads')
@ApiBearerAuth()
@Controller('admin/uploads')
@UseGuards(AuthGuard, ComplianceGuard)
export class AdminUploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Remove um upload (ADMIN/COMPLIANCE).
   *
   * Exige role ADMIN ou COMPLIANCE. Operacao atomica:
   * soft-delete no banco, remocao de objetos sem referencia SHA-256,
   * invalidacao de cache Redis e registro de audit trail.
   *
   * @param id - ID numerico do upload
   * @param req - Request com usuario autenticado
   * @returns Sucesso da operacao
   * @throws {NotFoundException} Se upload nao encontrado
   * @throws {BadRequestException} Se erro na remocao
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard, AuthGuard, ComplianceGuard)
  @Throttle({ delete: { ttl: 3600000, limit: 10 } }) // 10 deletes por hora
  @ApiOperation({
    summary: 'Remove upload (ADMIN/COMPLIANCE)',
    description:
      'Remove upload do banco e storage. Exige role ADMIN ou COMPLIANCE. Rate limit: 10 por hora.',
  })
  @ApiParam({ name: 'id', description: 'ID numerico do upload' })
  @ApiResponse({
    status: 200,
    description: 'Upload removido com sucesso.',
    type: DeleteUploadResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Upload nao encontrado.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const user = (req as any).user as { id: number; role: string };

    if (!user || !['ADMIN', 'COMPLIANCE'].includes(user.role)) {
      throw new BadRequestException(
        'Acesso negado. Requer role ADMIN ou COMPLIANCE.',
      );
    }

    await this.uploadsService.remove(id, user);

    return { success: true };
  }
}
