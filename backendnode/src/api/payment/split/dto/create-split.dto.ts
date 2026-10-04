export class CreateSplitDto {
  name: string;

  /** Percentual do platform (0-100). */
  platformPercent: number;

  /** Percentual do founder (0-100). */
  founderPercent: number;

  /** Percentual de cashback para investidor (0-100). Opcional. */
  investorCashbackPercent?: number;

  /** Se ativo por padrão. Default: true. */
  isActive?: boolean;
}
