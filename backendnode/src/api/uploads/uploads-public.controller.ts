/**
 * Controller publico de uploads.
 *
 * Rotas publicas para leitura de uploads sem autenticacao.
 * Rate limited a 100 req/IP/min via ThrottlerGuard.
 *
 * @controller UploadsPublicController
 */
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { UploadsService } from './uploads.service';
import {
  FindAllUploadsQueryDto,
  UploadResponseDto,
} from './dto/upload-response.dto';

@ApiTags('Uploads - Publico')
@Controller('uploads')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 3600000, limit: 200 } }) // 200 requests per hour
export class UploadsPublicController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Retorna detalhes de um upload pelo ID.
   *
   * Inclui variants e metadados completos.
   * Acesso publico, rate limited a 100 req/IP/min.
   *
   * @param id - ID numerico do upload
   * @returns Detalhes do upload
   * @throws {BadRequestException} Se upload nao encontrado
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Detalhes de upload por ID',
    description:
      'Retorna detalhes completos incluindo variants. Acesso publico.',
  })
  @ApiParam({ name: 'id', description: 'ID numerico do upload' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do upload.',
    type: UploadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Upload nao encontrado.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean; data: any }> {
    const upload = await this.uploadsService.findOne(id);

    if (!upload) {
      throw new BadRequestException('Upload nao encontrado');
    }

    return {
      success: true,
      data: upload,
    };
  }

  /**
   * Lista uploads com paginacao.
   *
   * Rotas publicas, rate limited a 100 req/IP/min.
   *
   * @param query - Parametros de paginacao e filtro
   * @returns Lista paginada de uploads
   */
  @Get()
  @ApiOperation({
    summary: 'Lista uploads (paginado)',
    description:
      'Retorna lista paginada de uploads com filtros opcionais. Acesso publico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de uploads.',
  })
  async findAll(@Query() query: FindAllUploadsQueryDto): Promise<{
    success: boolean;
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const result = await this.uploadsService.findAll({
      page,
      limit,
      status: query.status,
      type: query.type,
    });

    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Lista uploads de um usuario.
   *
   * Acesso publico, rate limited a 100 req/IP/min.
   *
   * @param userId - ID numerico do usuario
   * @returns Lista de uploads do usuario
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Lista uploads por usuario',
    description:
      'Retorna todos os uploads associados a um usuario. Acesso publico.',
  })
  @ApiParam({ name: 'userId', description: 'ID numerico do usuario' })
  @ApiResponse({ status: 200, description: 'Lista de uploads do usuario.' })
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ success: boolean; data: any[] }> {
    const uploads = await this.uploadsService.findByUser(userId);

    return {
      success: true,
      data: uploads,
    };
  }

  /**
   * Lista uploads de uma startup.
   *
   * Acesso publico, rate limited a 100 req/IP/min.
   *
   * @param startupId - ID numerico da startup
   * @returns Lista de uploads da startup
   */
  @Get('startup/:startupId')
  @ApiOperation({
    summary: 'Lista uploads por startup',
    description:
      'Retorna todos os uploads associados a uma startup. Acesso publico.',
  })
  @ApiParam({ name: 'startupId', description: 'ID numerico da startup' })
  @ApiResponse({ status: 200, description: 'Lista de uploads da startup.' })
  async findByStartup(
    @Param('startupId', ParseIntPipe) startupId: number,
  ): Promise<{ success: boolean; data: any[] }> {
    const uploads = await this.uploadsService.findByStartup(startupId);

    return {
      success: true,
      data: uploads,
    };
  }
}
