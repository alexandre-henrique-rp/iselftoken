import { Test, TestingModule } from '@nestjs/testing';
import {
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';
import { GeralService } from './geral.service';

// Mock do fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('GeralService — lookupCnpj()', () => {
  let service: GeralService;
  let redisGet: jest.Mock;
  let redisSet: jest.Mock;
  let redisEval: jest.Mock;

  beforeEach(async () => {
    redisGet = jest.fn();
    redisSet = jest.fn();
    redisEval = jest.fn();

    const mockRedis = {
      get: redisGet,
      set: redisSet,
      eval: redisEval,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeralService,
        {
          provide: 'default_IORedisModuleConnectionToken',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<GeralService>(GeralService);

    // Default: no cache hit, slot available
    redisGet.mockResolvedValue(null);
    redisSet.mockResolvedValue('OK');
    redisEval.mockResolvedValue(1); // slot counter = 1 (available)
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bloqueio de CNPJ alfanumérico', () => {
    it('retorna 422 com msg PT-BR para CNPJ alfanumérico (não chama BrasilAPI)', async () => {
      await expect(service.lookupCnpj('12.ABC.345/01DE-35')).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.lookupCnpj('12.ABC.345/01DE-35')).rejects.toThrow(
        /Alfanumérico.*integração/i,
      );
      // Defesa em profundidade: não chama BrasilAPI
      expect(mockFetch).not.toHaveBeenCalled();
      expect(redisSet).not.toHaveBeenCalled();
    });

    it('rejeita CNPJ alfanumérico mixed-case (defesa em profundidade)', async () => {
      await expect(service.lookupCnpj('12.abc.345/01de-35')).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.lookupCnpj('12.abc.345/01de-35')).rejects.toThrow(
        /Alfanumérico/i,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejeita CNPJ alfanumérico mesmo com máscara', async () => {
      await expect(service.lookupCnpj('12.ABC.345/01DE-35')).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('CNPJ numérico', () => {
    it('retorna 404 se CNPJ não tem 14 dígitos', async () => {
      await expect(service.lookupCnpj('1234567890')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.lookupCnpj('1234567890')).rejects.toThrow(
        /14 dígitos/,
      );
    });

    it('retorna 404 se CNPJ tem 15 dígitos', async () => {
      await expect(service.lookupCnpj('123456789012345')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna dados do cache quando CNPJ está em cache Redis', async () => {
      const cachedData = {
        cnpj: '12345678000195',
        razaoSocial: 'Empresa Teste',
        nomeFantasia: 'Teste',
        anoFundacao: 2020,
        situacaoCadastral: 'ATIVA',
        ativa: true,
      };
      redisGet.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.lookupCnpj('12.345.678/0001-95');

      expect(result.cached).toBe(true);
      expect(result.razaoSocial).toBe('Empresa Teste');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('retorna 404 se BrasilAPI retorna 404 (cache negativo)', async () => {
      // Primeiro chama: cache miss
      redisGet.mockResolvedValueOnce(null);
      // Não seta cache de erro negativo no teste

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Map([['x-ratelimit-remaining', '100']]),
      });

      await expect(service.lookupCnpj('12.345.678/0001-95')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna dados da BrasilAPI em cache miss', async () => {
      redisGet.mockResolvedValueOnce(null); // cache miss

      const apiData = {
        cnpj: '12345678000195',
        razao_social: 'Tech Startup SA',
        nome_fantasia: 'Tech Startup',
        data_inicio_atividade: '20200101',
        descricao_situacao_cadastral: 'ATIVA',
        municipio: 'São Paulo',
        uf: 'SP',
        cep: '01234567',
        logradouro: 'Av. Paulista',
        numero: '1000',
        complemento: 'Andar 10',
        bairro: 'Bela Vista',
        cnae_fiscal_descricao: 'Desenvolvimento de software',
        porte: 'ME',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['x-ratelimit-remaining', '100']]),
        json: async () => apiData,
      });

      const result = await service.lookupCnpj('12.345.678/0001-95');

      expect(result.cached).toBe(false);
      expect(result.razaoSocial).toBe('Tech Startup SA');
      expect(result.nomeFantasia).toBe('Tech Startup');
      expect(result.ativa).toBe(true);
      expect(result.cep).toBe('01234567');
      // Verifica que salvou no cache
      expect(redisSet).toHaveBeenCalled();
    });

    it('aplica throttle e retorna 503 quando slot está esgotado', async () => {
      redisGet.mockResolvedValue(null);
      redisEval.mockResolvedValue(2); // slot counter > 1 → throttle

      await expect(service.lookupCnpj('12.345.678/0001-95')).rejects.toThrow(
        /Muitas consultas/i,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
