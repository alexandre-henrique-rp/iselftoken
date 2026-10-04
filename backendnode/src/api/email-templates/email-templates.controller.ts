import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { EmailTemplatesService } from './email-templates.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { PreviewDto } from './dto/preview.dto';
import { CreateTemplateDto } from './dto/create-template.dto';

/**
 * Admin-only endpoints for managing email templates.
 * All routes require AdminGuard (cookie session).
 */
@Controller('api/admin/email-templates')
@UseGuards(AuthGuard)
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get()
  async listAll() {
    const templates = await this.service.listAll();
    return { success: true, data: templates };
  }

  @Post()
  async createTemplate(@Body() dto: CreateTemplateDto, @Req() req: any) {
    const userId = req.user?.id;
    const template = await this.service.createTemplate(dto, userId);
    return { success: true, data: template };
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const template = await this.service.getBySlug(slug);
    return { success: true, data: template };
  }

  @Post(':slug/versions')
  async createDraft(
    @Param('slug') slug: string,
    @Body() dto: CreateVersionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    const version = await this.service.createDraft(slug, dto, userId);
    return { success: true, data: version };
  }

  @Patch(':slug/versions/:id')
  async updateDraft(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: UpdateVersionDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    const version = await this.service.updateDraft(slug, id, dto, userId);
    return { success: true, data: version };
  }

  @Post(':slug/versions/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishVersion(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    const version = await this.service.publishVersion(slug, id, userId);
    return { success: true, data: version };
  }

  @Post(':slug/versions/:id/preview')
  async previewVersion(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Body() dto: PreviewDto,
  ) {
    const rendered = await this.service.previewVersion(slug, id, dto.data);
    return { success: true, data: rendered };
  }
}
