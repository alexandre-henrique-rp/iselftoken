import { HttpException, Injectable } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todas as categorias ativas ordenadas por `ordem`.
   */
  async findAll() {
    try {
      const categories = await this.prisma.category.findMany({
        where: { ativo: true },
        select: {
          id: true,
          slug: true,
          nome: true,
          descricao: true,
          ordem: true,
        },
        orderBy: { ordem: 'asc' },
      });

      return ResponseDto.success(
        'Lista de categorias retornada com sucesso',
        200,
        categories,
      );
    } catch (error) {
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Erro ao buscar categorias',
          error.status || 500,
          error,
        ),
        error.status || 500,
      );
    }
  }

  /**
   * Lista áreas de atuação ativas de uma categoria específica.
   */
  async findAreasByCategory(categoryId: number) {
    try {
      const areas = await this.prisma.areaAtuacao.findMany({
        where: {
          categoryId,
          ativo: true,
        },
        select: {
          id: true,
          slug: true,
          nome: true,
          descricao: true,
          ordem: true,
        },
        orderBy: { ordem: 'asc' },
      });

      return ResponseDto.success(
        'Lista de áreas de atuação retornada com sucesso',
        200,
        areas,
      );
    } catch (error) {
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Erro ao buscar áreas de atuação',
          error.status || 500,
          error,
        ),
        error.status || 500,
      );
    }
  }
}
