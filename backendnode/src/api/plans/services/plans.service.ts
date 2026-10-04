import { HttpException, Injectable } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @name create
   * @description Cria um novo plano no sistema.
   * @param {CreatePlanDto} createPlanDto - Dados do plano a ser criado
   * @returns {ResponseDto} Resposta padrão com o plano criado
   * @example // Retorno positivo
   * // { error: false, message: 'Plano criado com sucesso', codigo: 200, data: { ... } }
   * @throws {HttpException} Lança erro quando não é possível criar o plano
   * @example // Retorno negativo
   * // HttpException: Error ao salvar plano
   *
   * 1. Recebe os dados do plano.
   * 2. Persiste o plano no banco via Prisma.
   * 3. Retorna resposta de sucesso padronizada.
   */
  async create(createPlanDto: CreatePlanDto): Promise<ResponseDto> {
    try {
      // 1. Salva o plano no banco usando os dados recebidos
      const create = await this.prisma.plan.create({ data: createPlanDto });
      // 2. Retorna resposta de sucesso com o plano criado
      return ResponseDto.success('Plano criado com sucesso', 200, create);
    } catch (error) {
      // 3. Em caso de erro, lança exceção com resposta padronizada
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Error ao salvar plano',
          error.code || 500,
          error,
        ),
        error.code || 500,
      );
    }
  }

  /**
   * @name findAll
   * @description Busca todos os planos ativos.
   * @returns {ResponseDto} Resposta padrão com lista de planos
   * @example // Retorno positivo
   * // { error: false, message: 'Planos encontrados com sucesso', codigo: 200, data: [] }
   * @throws {HttpException} Lança erro quando não é possível buscar os planos
   * @example // Retorno negativo
   * // HttpException: Error ao buscar planos
   *
   * 1. Filtra planos ativos.
   * 2. Retorna a lista encontrada.
   */
  async findAll(query?: { page?: number; limit?: number; search?: string }) {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 25;
      const search = query?.search?.trim();

      const where: any = { isActive: true };

      if (search) {
        where.OR = [
          { nome: { contains: search } },
          { slug: { contains: search } },
        ];
      }

      const [find, total] = await Promise.all([
        this.prisma.plan.findMany({
          where,
          take: limit,
          skip: (page - 1) * limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.plan.count({ where }),
      ]);

      if (find.length == 0) {
        throw new HttpException(
          ResponseDto.error(
            'Planos não encontrados',
            400,
            'Nenhum plano encontrado',
          ),
          400,
        );
      }

      return ResponseDto.success(
        'Planos encontrados com sucesso',
        200,
        find,
        total,
        page,
      );
    } catch (error) {
      // 3. Em caso de erro, lança exceção com resposta padronizada
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Error ao buscar planos',
          error.code || 500,
          error,
        ),
        error.code || 500,
      );
    }
  }

  /**
   * @name findOne
   * @description Busca um plano específico pelo ID.
   * @param {number} id - Identificador do plano
   * @returns {ResponseDto} Resposta padrão com o plano encontrado
   * @example // Retorno positivo
   * // { error: false, message: 'Plano encontrado com sucesso', codigo: 200, data: { ... } }
   * @throws {HttpException} Lança erro quando não é possível buscar o plano
   * @example // Retorno negativo
   * // HttpException: Error ao buscar plano
   *
   * 1. Busca o plano pelo ID.
   * 2. Retorna resposta de sucesso com o plano.
   */
  async findOne(id: number): Promise<ResponseDto> {
    try {
      // 1. Busca o plano pelo ID informado
      const find = await this.prisma.plan.findUnique({ where: { id } });

      // Validação de resultado => garante que o plano existe
      if (!find) {
        throw new HttpException(
          ResponseDto.error(
            'Plano não encontrado',
            400,
            'Esse id não existe na base de dados',
          ),
          400,
        );
      }
      // 2. Retorna o preco persistido na tabela `plans` (editavel via /admin/plans).
      return ResponseDto.success('Plano encontrado com sucesso', 200, find);
    } catch (error) {
      // 3. Em caso de erro, lança exceção com resposta padronizada
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Error ao buscar plano',
          error.code || 500,
          error,
        ),
        error.code || 500,
      );
    }
  }

  /**
   * @name update
   * @description Atualiza um plano existente.
   * @param {number} id - Identificador do plano
   * @param {UpdatePlanDto} updatePlanDto - Dados de atualização do plano
   * @returns {ResponseDto} Resposta padrão com o plano atualizado
   * @example // Retorno positivo
   * // { error: false, message: 'Plano atualizado com sucesso', codigo: 200, data: { ... } }
   * @throws {HttpException} Lança erro quando não é possível atualizar o plano
   * @example // Retorno negativo
   * // HttpException: Error ao atualizar plano
   *
   * 1. Atualiza o plano pelo ID.
   * 2. Retorna resposta com o plano atualizado.
   */
  async update(id: number, updatePlanDto: UpdatePlanDto): Promise<ResponseDto> {
    try {
      // 1. Atualiza o plano usando o ID e os novos dados
      const update = await this.prisma.plan.update({
        where: { id },
        data: updatePlanDto,
      });
      // 2. Retorna resposta de sucesso com o plano atualizado
      return ResponseDto.success('Plano atualizado com sucesso', 200, update);
    } catch (error) {
      // 3. Em caso de erro, lança exceção com resposta padronizada
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Error ao atualizar plano',
          error.code || 500,
          error,
        ),
        error.code || 500,
      );
    }
  }

  /**
   * @name findAllForAdmin
   * @description Lista TODOS os planos (ativos e inativos) para painel admin.
   * Inclui contagem de assinantes ativos por plano.
   */
  async findAllForAdmin(query?: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = query?.page || 1;
    const limit = query?.limit || 25;
    const search = query?.search?.trim();
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { nome: { contains: search } },
        { slug: { contains: search } },
      ];
    }
    const [plans, total] = await Promise.all([
      this.prisma.plan.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.plan.count({ where }),
    ]);
    const counts = await this.prisma.subscription.groupBy({
      by: ['planId'],
      where: { status: 'ACTIVE' },
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.planId, c._count._all]));
    const data = plans.map((p) => ({
      ...p,
      activeSubscribers: countMap.get(p.id) ?? 0,
    }));
    return ResponseDto.success(
      'Planos listados (admin)',
      200,
      data,
      total,
      page,
    );
  }

  /**
   * Estatísticas de um plano específico:
   * - activeSubscribers: count de subscriptions ACTIVE
   * - totalRevenue: soma dos preços das subscriptions já pagas (Pago/Ativa)
   * - mrr: totalRevenue / periodoMeses (aproximado)
   */
  async getStats(id: number) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new HttpException(
        ResponseDto.error('Plano não encontrado', 400, 'Esse id não existe'),
        400,
      );
    }
    const [activeCount, paidAgg] = await Promise.all([
      this.prisma.subscription.count({
        where: { planId: id, status: 'ACTIVE' },
      }),
      this.prisma.payment.aggregate({
        where: {
          purpose: 'SUBSCRIPTION',
          status: 'PAID',
          subscription: { planId: id },
        },
        _sum: { amount: true },
      }),
    ]);
    const totalRevenue = paidAgg._sum.amount ?? 0;
    const mrr =
      plan.periodoMeses > 0 ? Number(totalRevenue) / plan.periodoMeses : 0;
    return ResponseDto.success('Estatísticas do plano', 200, {
      planId: id,
      activeSubscribers: activeCount,
      totalRevenue: Number(totalRevenue),
      mrr,
    });
  }

  /**
   * @name remove
   * @description Desativa um plano (soft delete).
   * @param {number} id - Identificador do plano
   * @returns {ResponseDto} Resposta padrão de sucesso
   * @example // Retorno positivo
   * // { error: false, message: 'Plano deletado com sucesso', 200 }
   * @throws {HttpException} Lança erro quando não é possível desativar um plano
   * @example // Retorno negativo
   * // HttpException: Error ao deletar plano
   *
   * 1. Marca o plano como inativo.
   * 2. Retorna confirmação de exclusão.
   */
  async remove(id: number): Promise<ResponseDto> {
    try {
      // 1. Atualiza o plano para inativo (soft delete)
      await this.prisma.plan.update({
        where: { id },
        data: { isActive: false },
      });
      // 2. Retorna resposta de sucesso
      return ResponseDto.success('Plano deletado com sucesso');
    } catch (error) {
      // 3. Em caso de erro, lança exceção com resposta padronizada
      throw new HttpException(
        ResponseDto.error(
          error.message || 'Error ao deletar plano',
          error.code || 500,
          error,
        ),
        error.code || 500,
      );
    }
  }
}
