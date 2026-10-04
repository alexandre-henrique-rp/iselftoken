/**
 * Coupons Controller - 10 endpoints REST.
 *
 * Endpoints Admin (AUTH + consulta ADMIN/FINANCEIRO/COMPLIANCE; escrita ADMIN):
 * - POST /admin/coupons - create
 * - GET /admin/coupons - list (com filtros)
 * - GET /admin/coupons/:id - detail
 * - PATCH /admin/coupons/:id - update (desativar)
 * - DELETE /admin/coupons/:id - soft delete
 * - GET /admin/coupons/:id/usages - histórico
 * - POST /admin/coupons/bulk - bulk create
 *
 * Endpoints User (AUTH):
 * - GET /coupons/available - listar ativos não expirados
 * - POST /payment/checkout/apply-coupon - aplicar ao payment
 * - GET /user/coupons/usage - histórico pessoal
 *
 * @controller CouponsController
 */
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from 'src/auth/admin.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { SkipSessionFilter } from 'src/common/decorators/skip-session-filter.decorator';
import { PaymentService } from '../payment.service';
import { CouponManagementGuard } from './coupon-management.guard';
import { CouponService } from './coupon.service';
import { ApplyCouponDto, CreateCouponDto, UpdateCouponDto } from './dto';

/**
 * Response wrapper padrão.
 */
function ok<T>(data: T, message = 'OK', codigo: HttpStatus = HttpStatus.OK) {
  return { error: false, message, codigo, data };
}

@ApiTags('Admin Coupons')
@Controller('admin/coupons')
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminCouponsController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @UseGuards(CouponManagementGuard)
  @ApiOperation({ summary: 'Criar novo cupom de desconto' })
  @ApiResponse({ status: 201, description: 'Cupom criado com sucesso' })
  async create(@Body() dto: CreateCouponDto, @Req() req: any) {
    // userId virá do JWT token (implícito no AuthGuard)
    const userId = req.user.id;
    const coupon = await this.couponService.create(dto, userId);
    return ok(coupon, 'Cupom criado com sucesso', HttpStatus.CREATED);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os cupons (com filtros e paginação)' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'valid', required: false, type: Boolean })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'percent', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('active') active?: string,
    @Query('valid') valid?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('percent') percent?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.couponService.findAll({
      active: active === undefined ? undefined : active === 'true',
      valid: valid === undefined ? undefined : valid === 'true',
      status,
      search,
      percent: percent ? Number.parseInt(percent, 10) : undefined,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
    return ok(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de cupom pelo ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const coupon = await this.couponService.findById(id);
    return ok(coupon);
  }

  @Patch(':id')
  @UseGuards(CouponManagementGuard)
  @ApiOperation({ summary: 'Atualizar cupom (ex: desativar)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const coupon = await this.couponService.update(id, dto, userId);
    return ok(coupon, 'Cupom atualizado');
  }

  @Delete(':id')
  @UseGuards(CouponManagementGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete (desativar) cupom' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    await this.couponService.softDelete(id, userId);
    return;
  }

  @Get(':id/usages')
  @ApiOperation({ summary: 'Histórico de usos do cupom' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getUsageHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const result = await this.couponService.getUsageHistory(id, limit, offset);
    return ok(result);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Auditoria administrativa do cupom' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getAuditHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const result = await this.couponService.getAuditHistory(id, limit, offset);
    return ok(result);
  }

  @Post('bulk')
  @UseGuards(CouponManagementGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Criar múltiplos cupons de uma vez' })
  @ApiResponse({ status: 200, description: 'Resultado do bulk create' })
  async bulkCreate(
    @Body('coupons', new ParseArrayPipe({ items: CreateCouponDto }))
    coupons: CreateCouponDto[],
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const result = await this.couponService.bulkCreate(coupons, userId);
    return ok(result);
  }
}

@ApiTags('Coupons')
@Controller('coupons')
export class PublicCouponsController {
  constructor(private readonly couponService: CouponService) {}

  @Get('available')
  @ApiOperation({ summary: 'Listar cupons ativos e não expirados' })
  async findAvailable() {
    const coupons = await this.couponService.findAvailable();
    return ok(coupons);
  }
}

@ApiTags('Checkout')
@Controller('payment/checkout')
export class CheckoutCouponsController {
  constructor(
    private readonly couponService: CouponService,
    private readonly paymentService: PaymentService,
  ) {}

  @Post('apply-coupon')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 req/min
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aplicar cupom a um pagamento' })
  @ApiResponse({ status: 200, description: 'Cupom aplicado com sucesso' })
  @ApiResponse({ status: 422, description: 'Erro de validação do cupom' })
  async applyCoupon(@Body() dto: ApplyCouponDto, @Req() req: any) {
    const userId = req.user.id;
    const result = await this.couponService.apply(
      dto.couponCode,
      dto.paymentId,
      userId,
    );

    if (result.completion === 'COUPON_100') {
      const completion =
        await this.paymentService.finalizeCouponIntegralPayment(
          result.payment.id,
          userId,
        );
      return ok(
        {
          ...result,
          completion: {
            type: result.completion,
            effectsPending: completion.effectsPending,
          },
        },
        'Pagamento concluído com cupom integral',
      );
    }

    if (!result.pixReissueRequired) {
      return ok(result, 'Cupom aplicado com sucesso');
    }

    const pixReissue = await this.paymentService.generatePix(
      result.payment.id,
      userId,
    );

    // A aplicação do cupom já foi confirmada. Se a chamada de emissão falhar,
    // a ordem permanece sem QR antigo e o frontend poderá tentar gerar a nova
    // cobrança novamente sem reaplicar o cupom.
    return ok(
      {
        ...result,
        ...(result.pixReissueRequired
          ? {
              pix: pixReissue?.error ? null : (pixReissue?.data ?? null),
              pixReissuePending: Boolean(pixReissue?.error),
            }
          : {}),
      },
      pixReissue?.error
        ? 'Cupom aplicado. Gere uma nova cobrança PIX para continuar.'
        : 'Cupom aplicado e cobrança PIX atualizada',
    );
  }
}

@ApiTags('User Coupons')
@Controller('user/coupons')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UserCouponsController {
  constructor(private readonly couponService: CouponService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Histórico pessoal de cupons usados' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getUsageHistory(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    const userId = req.user.id;
    const result = await this.couponService.getUserUsageHistory(
      userId,
      limit,
      offset,
    );
    return ok(result);
  }
}
