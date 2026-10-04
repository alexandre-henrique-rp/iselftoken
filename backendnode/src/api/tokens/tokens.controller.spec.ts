import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from 'src/auth/auth.guard';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';

describe('TokensController — ownership (F-10)', () => {
  let controller: TokensController;
  let service: {
    getUserTokens: jest.Mock;
    getTokenById: jest.Mock;
    getCertificateUrl: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getUserTokens: jest.fn(),
      getTokenById: jest.fn(),
      getCertificateUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokensController],
      providers: [{ provide: TokensService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TokensController>(TokensController);
  });

  afterEach(() => jest.clearAllMocks());

  it('protege todas as rotas privadas com AuthGuard', () => {
    expect(Reflect.getMetadata('__guards__', TokensController)).toEqual([
      AuthGuard,
    ]);
  });

  it('encaminha o userId da sessão no detalhe do token', async () => {
    const response = { error: false, codigo: 200, data: { id: 'token-owner' } };
    service.getTokenById.mockResolvedValue(response);

    const result = await controller.detail('token-owner', {
      user: { id: 20, role: 'USER' },
    });

    expect(result).toBe(response);
    expect(service.getTokenById).toHaveBeenCalledWith('token-owner', 20);
  });

  it('encaminha a role da sessão somente para a regra do certificado', async () => {
    service.getCertificateUrl.mockResolvedValue({ error: false, codigo: 200 });

    await controller.certificate('token-owner', {
      user: { id: 99, role: 'ADMIN' },
    });

    expect(service.getCertificateUrl).toHaveBeenCalledWith(
      'token-owner',
      99,
      'ADMIN',
    );
  });
});
