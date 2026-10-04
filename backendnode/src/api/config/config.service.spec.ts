import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Cobertura minima de S26 — fix do bug onde o endpoint publico
 * /config/fundraising lia da tabela legada `finance_config` em vez da
 * `config_parameter_values` (fonte em que o admin de fato grava).
 *
 * Garantia: cada chave `fundraising.<campo>` lida deve procurar a versao
 * vigente AGORA em `config_parameter_values`, nunca em `finance_config`.
 */

const CONFIG_KEYS = [
  'fundraising.authFeePerToken',
  'fundraising.minCampaign',
  'fundraising.maxCampaign',
  'fundraising.equityMin',
  'fundraising.equityMax',
  'fundraising.tokenPrice',
  'fundraising.fastTrackFee',
] as const;

describe('ConfigService — getPublicFundraisingConfig (S26 fix)', () => {
  let service: ConfigService;

  const financeConfigFindMany = jest.fn();
  const configParameterValueFindFirst = jest.fn();

  const prismaMock = {
    financeConfig: { findMany: financeConfigFindMany },
    configParameterValue: { findFirst: configParameterValueFindFirst },
  };

  beforeEach(async () => {
    financeConfigFindMany.mockReset();
    configParameterValueFindFirst.mockReset();
    financeConfigFindMany.mockResolvedValue([]);
    configParameterValueFindFirst.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ConfigService);
  });

  it('NUNCA consulta finance_config (fonte legada descontinuada em S26)', async () => {
    await service.getPublicFundraisingConfig();
    expect(financeConfigFindMany).not.toHaveBeenCalled();
  });

  it('cai no default hardcoded de CONFIG_PARAMETERS quando nao ha versao vigente', async () => {
    const result = await service.getPublicFundraisingConfig();
    expect(result.maxCampaign).toBe(12_000_000);
    expect(result.minCampaign).toBe(300_000);
    expect(result.equityMin).toBe(5);
    expect(result.equityMax).toBe(20);
    expect(result.tokenPrice).toBe(200);
    expect(result.authFeePerToken).toBe(1);
    expect(result.fastTrackFee).toBe(2_500);
  });

  it('usa o valor vigente de config_parameter_values quando existe', async () => {
    // Admin definiu maxCampaign = 50_000_000 — o wizard do founder tem
    // que enxergar 50_000_000, nao o default 12_000_000 (bug original).
    configParameterValueFindFirst.mockImplementation(({ where }) => {
      const key: string = where?.key ?? '';
      if (!CONFIG_KEYS.includes(key as (typeof CONFIG_KEYS)[number])) {
        return Promise.resolve(null);
      }
      const map: Record<string, number> = {
        'fundraising.authFeePerToken': 1,
        'fundraising.minCampaign': 300_000,
        'fundraising.maxCampaign': 50_000_000,
        'fundraising.equityMin': 5,
        'fundraising.equityMax': 20,
        'fundraising.tokenPrice': 200,
        'fundraising.fastTrackFee': 2_500,
      };
      const value = map[key];
      return Promise.resolve(
        value === undefined ? null : { key, value: String(value) },
      );
    });

    const result = await service.getPublicFundraisingConfig();
    expect(result.maxCampaign).toBe(50_000_000);
    expect(result.minCampaign).toBe(300_000);
  });

  it('fastTrackFee faz fallback para fastTrackReview quando o canonico esta zerado', async () => {
    configParameterValueFindFirst.mockImplementation(({ where }) => {
      const key: string = where?.key ?? '';
      if (key === 'fundraising.fastTrackFee') {
        return Promise.resolve(null); // admin nao gravou fastTrackFee
      }
      if (key === 'fundraising.fastTrackReview') {
        return Promise.resolve({
          key,
          value: String(3_000), // legado gravando como Review
        });
      }
      return Promise.resolve(null);
    });

    const result = await service.getPublicFundraisingConfig();
    expect(result.fastTrackFee).toBe(3_000);
  });

  it('filtra por effectiveFrom <= now (vigencia por data)', async () => {
    // Se o admin agendou para o futuro, nao pode vazar para o wizard
    // AGORA. O service.getEffective cuida do filtro — garantimos que o
    // metodo e chamado em todas as chaves operacionais.
    const seenKeys: string[] = [];
    configParameterValueFindFirst.mockImplementation(({ where }) => {
      const key: string = where?.key ?? '';
      const from = where?.effectiveFrom?.lte;
      seenKeys.push(key);
      expect(from).toBeInstanceOf(Date); // Prisma repassa o `Date` que passamos
      return Promise.resolve(null);
    });

    await service.getPublicFundraisingConfig();
    for (const key of CONFIG_KEYS) {
      expect(seenKeys).toContain(key);
    }
    // fastTrackFee + fastTrackReview sao ambos consultados (fallback chain)
    expect(seenKeys.filter((k) => k.includes('fastTrack')).length).toBe(2);
  });
});
