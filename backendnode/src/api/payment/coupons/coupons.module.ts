/**
 * Coupons Module - Gestão de cupons de desconto.
 *
 * Endpoints Admin (AUTH + consulta ADMIN/FINANCEIRO/COMPLIANCE; escrita ADMIN):
 * - POST /admin/coupons - criar cupom
 * - GET /admin/coupons - listar (com filtros)
 * - GET /admin/coupons/:id - detalhe
 * - PATCH /admin/coupons/:id - atualizar
 * - DELETE /admin/coupons/:id - soft delete
 * - GET /admin/coupons/:id/usages - histórico
 * - POST /admin/coupons/bulk - criação em massa
 *
 * Endpoints User (AUTH):
 * - GET /coupons/available - listar ativos
 * - POST /payment/checkout/apply-coupon - aplicar cupom
 * - GET /user/coupons/usage - histórico pessoal
 *
 * @module CouponsModule
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PaymentModule } from '../payment.module';
import { CouponManagementGuard } from './coupon-management.guard';
import { CouponService } from './coupon.service';
import {
  AdminCouponsController,
  CheckoutCouponsController,
  PublicCouponsController,
  UserCouponsController,
} from './coupons.controller';

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [
    AdminCouponsController,
    PublicCouponsController,
    CheckoutCouponsController,
    UserCouponsController,
  ],
  providers: [CouponService, CouponManagementGuard],
  exports: [CouponService],
})
export class CouponsModule {}
