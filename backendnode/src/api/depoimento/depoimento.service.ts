import { Injectable, Logger } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDepoimentoDto } from './dto/create-depoimento.dto';
import { UpdateDepoimentoDto } from './dto/update-depoimento.dto';

@Injectable()
export class DepoimentoService {
  private readonly logger = new Logger(DepoimentoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @name create
   * @description Cria um novo depoimento
   * @param data Dados do depoimento
   * @returns ResponseDto com depoimento criado
   */
  async create(data: CreateDepoimentoDto) {
    try {
      const depoimento = await this.prisma.depoimento.create({
        data: {
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

      this.logger.log(`Depoimento criado por ${data.autor}`);
      return ResponseDto.success(
        'Depoimento criado com sucesso',
        201,
        depoimento,
      );
    } catch (error) {
      this.logger.error(`Erro ao criar depoimento: ${error.message}`);
      return ResponseDto.error('Erro ao criar depoimento', 500, error);
    }
  }

  /**
   * @name findAllGeneral
   * @description Retorna todos os depoimentos ativos com limite configurável
   * @param limit Limite de registros (padrão 6)
   * @returns ResponseDto com lista de depoimentos
   */
  async findAllGeneral(limit: number = 6) {
    try {
      // Limite máximo de 100 para evitar abuso
      const safeLimit = Math.min(Math.max(1, limit), 100);

      const depoimentos = await this.prisma.depoimento.findMany({
        where: {
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
      });

      return ResponseDto.success(
        `Depoimentos retornados (limite: ${safeLimit})`,
        200,
        depoimentos,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar depoimentos: ${error.message}`);
      return ResponseDto.error('Erro ao buscar depoimentos', 500, error);
    }
  }

  /**
   * @name findOne
   * @description Retorna um depoimento específico
   * @param id ID do depoimento
   * @returns ResponseDto com depoimento
   */
  async findOne(id: number) {
    try {
      const depoimento = await this.prisma.depoimento.findUnique({
        where: { id },
      });

      if (!depoimento) {
        return ResponseDto.error('Depoimento não encontrado', 404);
      }

      return ResponseDto.success(
        'Depoimento retornado com sucesso',
        200,
        depoimento,
      );
    } catch (error) {
      this.logger.error(`Erro ao buscar depoimento: ${error.message}`);
      return ResponseDto.error('Erro ao buscar depoimento', 500, error);
    }
  }

  /**
   * @name update
   * @description Atualiza um depoimento existente
   * @param id ID do depoimento
   * @param data Dados atualizados
   * @returns ResponseDto com depoimento atualizado
   */
  async update(id: number, data: UpdateDepoimentoDto) {
    try {
      const existing = await this.prisma.depoimento.findUnique({
        where: { id },
      });

      if (!existing) {
        return ResponseDto.error('Depoimento não encontrado', 404);
      }

      const depoimento = await this.prisma.depoimento.update({
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

      this.logger.log(`Depoimento ${id} atualizado`);
      return ResponseDto.success(
        'Depoimento atualizado com sucesso',
        200,
        depoimento,
      );
    } catch (error) {
      this.logger.error(`Erro ao atualizar depoimento: ${error.message}`);
      return ResponseDto.error('Erro ao atualizar depoimento', 500, error);
    }
  }

  /**
   * @name remove
   * @description Remove (soft delete) um depoimento
   * @param id ID do depoimento
   * @returns ResponseDto com confirmação
   */
  async remove(id: number) {
    try {
      const existing = await this.prisma.depoimento.findUnique({
        where: { id },
      });

      if (!existing) {
        return ResponseDto.error('Depoimento não encontrado', 404);
      }

      // Soft delete - desativa ao invés de deletar
      await this.prisma.depoimento.update({
        where: { id },
        data: { isActive: false },
      });

      this.logger.log(`Depoimento ${id} removido (soft delete)`);
      return ResponseDto.success('Depoimento removido com sucesso', 200);
    } catch (error) {
      this.logger.error(`Erro ao remover depoimento: ${error.message}`);
      return ResponseDto.error('Erro ao remover depoimento', 500, error);
    }
  }
}
