import { ApiProperty } from '@nestjs/swagger';

/**
 * Token individual dentro de um ativo da wallet.
 * `shortCode` = últimos 8 caracteres do hash (amigável para UI).
 */
export class WalletAssetTokenDto {
  @ApiProperty({ example: 'token-uuid-1', description: 'ID único do token (UUID)' })
  id: string;

  @ApiProperty({ example: '76543210', description: 'Código curto derivado do hash' })
  shortCode: string;

  @ApiProperty({ example: 1, description: 'Quantidade por registro (default 1 = 1 token)' })
  quantity: number;

  @ApiProperty({ example: 240, description: 'Preço de compra do token (R$)' })
  purchaseVal: number;

  @ApiProperty({ example: 240, description: 'Valor atual do token (R$)' })
  currentVal: number;

  @ApiProperty({ example: '2026-10-04T12:00:00.000Z', description: 'Data de aquisição' })
  acquiredAt: Date;

  @ApiProperty({ example: 42, nullable: true, description: 'ID do Investment que originou este token' })
  investmentId: number | null;
}

/**
 * Ativo agrupado por startup na wallet do investidor.
 * Cada item representa uma startup investida com seus N tokens.
 */
export class WalletAssetDto {
  @ApiProperty({ example: 42, description: 'ID do Investment (último aporte confirmado)' })
  investmentId: number;

  @ApiProperty({ example: 15, description: 'ID da startup' })
  startupId: number;

  @ApiProperty({ example: 'Acme LTDA', description: 'Nome da startup' })
  startupName: string;

  @ApiProperty({ example: 'acme', description: 'Slug da startup (URL pública)' })
  startupSlug: string;

  @ApiProperty({ example: 'https://cdn/...', nullable: true, description: 'URL do logo (sm)' })
  startupLogoUrl: string | null;

  @ApiProperty({ example: 'Tecnologia', nullable: true })
  startupCategory: string | null;

  @ApiProperty({ example: 'Rodada Série A', description: 'Título da campanha' })
  campaignTitle: string;

  @ApiProperty({ example: 'OPEN', description: 'Status atual da campanha' })
  campaignStatus: string;

  @ApiProperty({ example: 5, description: 'Quantidade de tokens emitidos para este aporte' })
  tokensCount: number;

  @ApiProperty({ type: [WalletAssetTokenDto], description: 'Lista de token IDs com hash curto' })
  tokens: WalletAssetTokenDto[];

  @ApiProperty({ example: 1200, description: 'Subtotal investido (qty × preço de venda)' })
  investedAmount: number;

  @ApiProperty({ example: 60, description: 'Taxa da plataforma (Modelo B)' })
  platformFeeAmount: number | null;

  @ApiProperty({ example: 1260, description: 'Total cobrado (subtotal + taxa) — espelha Payment.amount' })
  totalCharged: number;

  @ApiProperty({ example: 1200, description: 'Valor atual agregado dos tokens (qty × currentVal)' })
  currentValue: number;

  @ApiProperty({ example: 'CONFIRMED' })
  investmentStatus: string;

  @ApiProperty({ example: '2026-10-04T12:00:00.000Z' })
  acquiredAt: Date;
}

export class WalletAssetsResponseDto {
  @ApiProperty({ type: [WalletAssetDto] })
  assets: WalletAssetDto[];

  @ApiProperty({ example: 2, description: 'Quantidade de startups com tokens' })
  startupsCount: number;

  @ApiProperty({ example: 7, description: 'Quantidade total de tokens emitidos' })
  tokensCount: number;

  @ApiProperty({ example: 0, description: 'ROI agregado em % (current vs invested)' })
  averageRoi: number;
}