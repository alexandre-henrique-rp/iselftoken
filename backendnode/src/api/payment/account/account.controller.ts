import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { OpenAccountDto } from './dto/open-account.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { SkipSessionFilter } from 'src/common/decorators/skip-session-filter.decorator';

@Controller('payment/account')
@ApiTags('Account')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * POST /payment/account/open
   * Solicita abertura de conta digital EFI para o founder.
   * Retorna 202 ACCEPTED (abertura é assíncrona).
   */
  @Post('open')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Solicita abertura de conta digital EFI' })
  open(@Body() dto: OpenAccountDto, @Req() req: any) {
    return this.accountService.openAccount(dto, req.user.id);
  }

  /**
   * GET /payment/account
   * Lista todas as aberturas de conta do usuário logado.
   */
  @Get()
  @ApiOperation({ summary: 'Lista aberturas de conta do usuário' })
  list(@Req() req: any) {
    return this.accountService.listMine(req.user.id);
  }

  /**
   * POST /payment/account/webhook
   * Webhook EFI para atualização de status de conta (PENDING → APPROVED/REJECTED).
   * Sem AuthGuard — EFI chama diretamente com credenciais propias.
   */
  @Post('webhook')
  @SkipSessionFilter()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook EFI (account status update)' })
  webhook(@Body() payload: any) {
    return this.accountService.handleWebhook(payload);
  }
}
