import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** Valida a relação legada de uma única área com a categoria. */
export async function validateCategoryAreaCoherence(
  categoryId: number,
  areaAtuacaoId: number,
  prisma: PrismaService,
): Promise<void> {
  const area = await prisma.areaAtuacao.findUnique({
    where: { id: areaAtuacaoId },
    include: { category: { select: { id: true, nome: true } } },
  });

  if (!area) {
    throw new NotFoundException('Área de atuação não encontrada.');
  }

  if (area.categoryId !== categoryId) {
    throw new BadRequestException(
      `A Área de Atuação '${area.nome}' não pertence à Categoria '${area.category.nome}'.`,
    );
  }
}

/** Valida uma seleção multiárea e retorna as áreas em ordem de entrada. */
export async function validateCategoryAreasCoherence(
  categoryId: number,
  areaAtuacaoIds: number[],
  prisma: PrismaService,
) {
  const ids = [...new Set(areaAtuacaoIds)];
  if (ids.length === 0) {
    throw new BadRequestException('Selecione pelo menos uma área de atuação.');
  }

  const areas = await prisma.areaAtuacao.findMany({
    where: { id: { in: ids }, ativo: true },
    select: {
      id: true,
      slug: true,
      nome: true,
      descricao: true,
      ordem: true,
      categoryId: true,
    },
  });
  const byId = new Map(areas.map((area) => [area.id, area]));

  for (const id of ids) {
    const area = byId.get(id);
    if (!area) {
      throw new NotFoundException(
        `Área de atuação ${id} não encontrada ou inativa.`,
      );
    }
    if (area.categoryId !== categoryId) {
      throw new BadRequestException(
        `A Área de Atuação '${area.nome}' não pertence à Categoria selecionada.`,
      );
    }
  }

  return ids.map((id) => byId.get(id)!);
}
