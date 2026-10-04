import { Controller, Get, HttpCode, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@Controller('categories')
@ApiTags('Categorias')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Listar categorias ativas',
    description:
      'Retorna todas as categorias ativas ordenadas por campo `ordem`. Usado no dropdown de filtro do marketplace e no cadastro de startups.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias retornada com sucesso.',
  })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':categoryId/areas')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Listar áreas de atuação de uma categoria',
    description:
      'Retorna as áreas de atuação ativas pertencentes a uma categoria específica (dropdown em cascata).',
  })
  @ApiParam({
    name: 'categoryId',
    description: 'ID da categoria',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de áreas de atuação retornada com sucesso.',
  })
  findAreasByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.categoriesService.findAreasByCategory(categoryId);
  }
}
