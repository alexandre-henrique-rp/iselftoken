import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { InvestmentsService } from './investments.service';

@Controller('investments')
@ApiTags('Investimentos')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @ApiOperation({ summary: 'POST /investments - Cria Investment (PENDING)' })
  create(@Body() createDto: CreateInvestmentDto, @Req() req: any) {
    const userId = req.user.id;
    return this.investmentsService.create(userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista investimentos do usuário' })
  findByUser(@Req() req: any) {
    const userId = req.user.id;
    return this.investmentsService.findByUser(userId);
  }

  @Get('my-startups')
  @ApiOperation({
    summary:
      'Startups em que o usuário logado investiu (agregado por startup + tokens atuais)',
  })
  findMyInvestedStartups(@Req() req: any) {
    const userId = req.user.id;
    return this.investmentsService.findMyInvestedStartups(userId);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirma investimento após pagamento' })
  @ApiParam({ name: 'id', type: Number })
  confirm(@Param('id') id: string, @Req() req: any) {
    return this.investmentsService.confirmInvestment(+id, req.user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancela a ordem de investimento e libera a reserva',
  })
  @ApiParam({ name: 'id', type: Number })
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.investmentsService.cancelInvestment(+id, req.user.id);
  }

  @Get(':id/confirmation')
  @ApiOperation({ summary: 'Retorna a confirmação após emissão dos tokens' })
  @ApiParam({ name: 'id', type: Number })
  confirmation(@Param('id') id: string, @Req() req: any) {
    return this.investmentsService.getConfirmation(+id, req.user.id);
  }
}
