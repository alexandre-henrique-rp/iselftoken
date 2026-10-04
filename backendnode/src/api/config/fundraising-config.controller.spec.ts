import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/auth/auth.guard';
import { ConfigService } from './config.service';
import { FundraisingConfigController } from './fundraising-config.controller';

const PUBLIC_CONFIG = {
  authFeePerToken: 1,
  minCampaign: 300_000,
  maxCampaign: 12_000_000,
  equityMin: 5,
  equityMax: 20,
  tokenPrice: 200,
  fastTrackFee: 2_500,
};

describe('FundraisingConfigController', () => {
  let controller: FundraisingConfigController;
  const configService = {
    getPublicFundraisingConfig: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundraisingConfigController],
      providers: [{ provide: ConfigService, useValue: configService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(FundraisingConfigController);
  });

  it('retorna somente a configuração operacional do cadastro', async () => {
    configService.getPublicFundraisingConfig.mockResolvedValue(PUBLIC_CONFIG);

    const result = await controller.getFundraisingConfig();

    expect(result).toEqual({
      error: false,
      message: 'Parâmetros operacionais de fundraising',
      codigo: 200,
      data: PUBLIC_CONFIG,
    });
    expect(result.data).not.toHaveProperty('platformFee');
    expect(result.data).not.toHaveProperty('complianceFee');
    expect(result.data).not.toHaveProperty('history');
  });
});
