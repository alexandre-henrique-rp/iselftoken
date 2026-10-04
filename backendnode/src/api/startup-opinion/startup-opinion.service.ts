import { Injectable, Logger } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStartupOpinionDto } from './dto/create-startup-opinion.dto';
import { UpdateStartupOpinionDto } from './dto/update-startup-opinion.dto';

@Injectable()
export class StartupOpinionService {
  private readonly logger = new Logger(StartupOpinionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @name create
   * @description Cria uma nova opinião/review para uma startup
   * @param data Dados da opinião
   * @returns ResponseDto com opinião criada
   */
  async create(data: CreateStartupOpinionDto) {
    try {
      const startupId = parseInt(data.startupId, 10);

      // Valida se a startup existe
      const startup = await this.prisma.startup.findUnique({
        where: { id: startupId },
        select: { id: true, nome: true },
      });

      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }

      const opinion = await this.prisma.startupOpinion.create({
        data: {
          startupId: startupId,
          mensagem: data.mensagem,
          autor: data.autor,
          cargos: data.cargos ? data.cargos : undefined,
          youtube: data.youtube || undefined,
          site: data.site || undefined,
          linkedin: data.linkedin || undefined,
          instagram: data.instagram || undefined,
          facebook: data.facebook || undefined,
        },
      });

      this.logger.log(
        `Opinião criada para startup ${startupId} por ${data.autor}`,
      );
      return ResponseDto.success('Opinião criada com sucesso', 201, opinion);
    } catch (error) {
      this.logger.error(`Erro ao criar opinião: ${error.message}`);
      return ResponseDto.error('Erro ao criar opinião', 500, error);
    }
  }

  /**
   * @name findAllGeneral
   * @description Retorna todas as opiniões ativas com limite configurável
   * @param limit Limite de registros (padrão 6)
   * @returns ResponseDto com lista de opiniões
   */
  async findAllGeneral(limit: number = 6) {
    try {
      // Limite máximo de 100 para evitar abuso
      const safeLimit = Math.min(Math.max(1, limit), 100);

      const opinions = await this.prisma.startupOpinion.findMany({
        where: {
          isActive: true,
        },
        include: {
          startup: {
            select: {
              id: true,
              nome: true,
              logo: {
                select: {
                  url_sm: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      });

      return ResponseDto.success(
        `Opiniões retornadas (limite: ${safeLimit})`,
        200,
        opinions,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar opiniões: ${error.message}`);
      return ResponseDto.error('Erro ao buscar opiniões', 500, error);
    }
  }

  /**
   * @name findAll
   * @description Retorna todas as opiniões de uma startup
   * @param startupId ID da startup
   * @returns ResponseDto com lista de opiniões
   */
  async findAll(startupId: string) {
    try {
      const id = parseInt(startupId, 10);

      const opinions = await this.prisma.startupOpinion.findMany({
        where: {
          startupId: id,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return ResponseDto.success(
        'Opiniões retornadas com sucesso',
        200,
        opinions,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar opiniões: ${error.message}`);
      return ResponseDto.error('Erro ao buscar opiniões', 500, error);
    }
  }

  /**
   * @name findOne
   * @description Retorna uma opinião específica
   * @param id ID da opinião
   * @returns ResponseDto com opinião
   */
  async findOne(id: number) {
    try {
      const opinion = await this.prisma.startupOpinion.findUnique({
        where: { id },
        include: {
          startup: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      });

      if (!opinion) {
        return ResponseDto.error('Opinião não encontrada', 404);
      }

      return ResponseDto.success('Opinião retornada com sucesso', 200, opinion);
    } catch (error) {
      this.logger.error(`Erro ao buscar opinião: ${error.message}`);
      return ResponseDto.error('Erro ao buscar opinião', 500, error);
    }
  }

  /**
   * @name update
   * @description Atualiza uma opinião existente
   * @param id ID da opinião
   * @param data Dados atualizados
   * @returns ResponseDto com opinião atualizada
   */
  async update(id: number, data: UpdateStartupOpinionDto) {
    try {
      const existing = await this.prisma.startupOpinion.findUnique({
        where: { id },
      });

      if (!existing) {
        return ResponseDto.error('Opinião não encontrada', 404);
      }

      const opinion = await this.prisma.startupOpinion.update({
        where: { id },
        data: {
          mensagem: data.mensagem ?? existing.mensagem,
          autor: data.autor ?? existing.autor,
          cargos:
            data.cargos !== undefined
              ? data.cargos
              : (existing.cargos ?? undefined),
          youtube: data.youtube !== undefined ? data.youtube : existing.youtube,
          site: data.site !== undefined ? data.site : existing.site,
          linkedin:
            data.linkedin !== undefined ? data.linkedin : existing.linkedin,
          instagram:
            data.instagram !== undefined ? data.instagram : existing.instagram,
          facebook:
            data.facebook !== undefined ? data.facebook : existing.facebook,
        },
      });

      this.logger.log(`Opinião ${id} atualizada`);
      return ResponseDto.success(
        'Opinião atualizada com sucesso',
        200,
        opinion,
      );
    } catch (error) {
      this.logger.error(`Erro ao atualizar opinião: ${error.message}`);
      return ResponseDto.error('Erro ao atualizar opinião', 500, error);
    }
  }

  /**
   * @name remove
   * @description Remove (soft delete) uma opinião
   * @param id ID da opinião
   * @returns ResponseDto com confirmação
   */
  async remove(id: number) {
    try {
      const existing = await this.prisma.startupOpinion.findUnique({
        where: { id },
      });

      if (!existing) {
        return ResponseDto.error('Opinião não encontrada', 404);
      }

      // Soft delete - desativa ao invés de deletar
      await this.prisma.startupOpinion.update({
        where: { id },
        data: { isActive: false },
      });

      this.logger.log(`Opinião ${id} removida (soft delete)`);
      return ResponseDto.success('Opinião removida com sucesso', 200);
    } catch (error) {
      this.logger.error(`Erro ao remover opinião: ${error.message}`);
      return ResponseDto.error('Erro ao remover opinião', 500, error);
    }
  }
}
