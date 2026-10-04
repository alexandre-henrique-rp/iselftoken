import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export class ConfigureRepasseDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valorParcela!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valorUltimaParcela?: number;

  @IsInt()
  @Min(15)
  @Max(60)
  intervaloDias!: number;

  /**
   * Intervalo entre a data de configuracao e a PRIMEIRA parcela (em dias).
   * Opcional; quando omitido, assume o mesmo `intervaloDias` (regra antiga).
   *
   * Use cases:
   * - Configurar repasse 7 dias apos o founder receber o captado para "warm-up".
   * - Padrao de "primeira em 7d, demais a cada 30d" sem repetir 7 em todos os
   *   meses.
   *
   * Restricoes (defense-in-depth): 1..120 dias. 1 dia e o minimo absoluto
   * para evitar fraude (founder nao pode sacar no mesmo dia da captacao).
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  primeiraParcelaDias?: number;
}
