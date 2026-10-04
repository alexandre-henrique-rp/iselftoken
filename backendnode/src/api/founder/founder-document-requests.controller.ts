import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { FounderDocumentRequestsService } from './founder-document-requests.service';
import { FulfillDocumentRequestDto } from './dto/founder-document-request.dto';

/**
 * Founder lista e atende requests de documento do compliance.
 * GET /founder/document-requests        — lista pendentes das minhas startups
 * POST /founder/document-requests/:id/fulfill — vincula StartupDocument
 */
@Controller('founder/document-requests')
@UseGuards(AuthGuard)
@ApiCookieAuth()
@ApiTags('Founder - Document Requests')
export class FounderDocumentRequestsController {
  constructor(private readonly service: FounderDocumentRequestsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar solicitações de documentos pendentes para minhas startups',
  })
  async listMine(@Req() req: any) {
    const result = await this.service.listMine(req.user.id);
    return { data: result.data };
  }

  @Post(':id/fulfill')
  @ApiOperation({
    summary: 'Atender solicitação vinculando um StartupDocument',
    description:
      'Marca a request como FULFILLED com referência ao documento enviado. ' +
      'Notifica o compliance em in-app.',
  })
  async fulfill(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FulfillDocumentRequestDto,
    @Req() req: any,
  ) {
    const result = await this.service.fulfill(
      id,
      req.user.id,
      dto.startupDocumentId,
    );
    return result.ok
      ? { data: result.data, message: 'Solicitação atendida.' }
      : { error: true, message: result.error };
  }
}
