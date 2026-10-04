/**
 * Specs T034 (B07) - Bloqueio pos-rodada para campos criticos.
 * Testa StartupCrudService diretamente (onde a logica de update mora).
 */
import { Test, TestingModule } from '@nestjs/testing';
import { StartupCrudService } from './startup-crud.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionService } from 'src/auth/session/session.service';
import { ValidateFundador } from './validate.fundador';
import { AuditService } from 'src/common/audit/audit.service';

jest.mock('@sentry/nestjs', () => ({
  Sentry: { startSpan: jest.fn((_o: any, fn: any) => fn()) },
}));

describe('StartupCrudService.update (T034)', () => {
  let service: StartupCrudService;
  let prisma: {
    startup: { findUnique: jest.Mock; update: jest.Mock };
    campaign: { findFirst: jest.Mock };
    areaAtuacao: { findUnique: jest.Mock };
  };
  const FOUNDER = 42;
  const user = { id: FOUNDER, role: 'FOUNDER' } as any;

  beforeEach(async () => {
    prisma = {
      startup: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 1 }),
      },
      campaign: { findFirst: jest.fn() },
      areaAtuacao: {
        findUnique: jest.fn().mockResolvedValue({
          id: 5,
          categoryId: 1,
          category: { id: 1, nome: 'Fintech' },
        }),
      },
    };

    const m: TestingModule = await Test.createTestingModule({
      providers: [
        StartupCrudService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: SessionService,
          useValue: {
            deleteUserCache: jest.fn(),
            invalidateAllUserSessions: jest.fn(),
          },
        },
        { provide: ValidateFundador, useValue: { validateOrThrow: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    service = m.get(StartupCrudService);
  });

  it('1. sem campanha -> permite editar qualquer campo', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      founderId: FOUNDER,
    });
    prisma.campaign.findFirst.mockResolvedValueOnce(null);

    const r: any = await service.update(
      1,
      { cnpj: '11.111.111/0001-11' } as any,
      user,
    );
    expect(r.id).toBe(1);
    expect(prisma.startup.update).toHaveBeenCalled();
  });

  it('2. com campanha ACTIVE (nao CLOSED/FUNDED) -> permite editar', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      founderId: FOUNDER,
    });
    prisma.campaign.findFirst.mockResolvedValueOnce(null);

    const r: any = await service.update(
      1,
      { cnpj: '11.111.111/0001-11' } as any,
      user,
    );
    expect(r.id).toBe(1);
  });

  it('3. com campanha CLOSED -> bloqueia CNPJ com 403', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      founderId: FOUNDER,
    });
    prisma.campaign.findFirst.mockResolvedValueOnce({ id: 99 });

    const r: any = await service.update(
      1,
      { cnpj: '11.111.111/0001-11' } as any,
      user,
    );
    expect(r.codigo).toBe(403);
    expect(r.detalhe?.code).toBe('CAMPO_BLOQUEADO_POS_RODADA');
    expect(r.detalhe?.fields).toContain('cnpj');
  });

  it('4. com campanha FUNDED -> bloqueia razaoSocial + pais (cnpj nao enviado OK)', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      founderId: FOUNDER,
    });
    prisma.campaign.findFirst.mockResolvedValueOnce({ id: 99 });

    const r: any = await service.update(
      1,
      { razaoSocial: 'Nova Razao SA', pais: 'BRA' } as any,
      user,
    );
    expect(r.codigo).toBe(403);
    expect(r.detalhe?.code).toBe('CAMPO_BLOQUEADO_POS_RODADA');
    expect(r.detalhe?.fields).toEqual(
      expect.arrayContaining(['razaoSocial', 'pais']),
    );
  });

  it('5. endereco sempre livre (decisao do brief)', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      founderId: FOUNDER,
    });
    prisma.campaign.findFirst.mockResolvedValueOnce({ id: 99 });

    const r: any = await service.update(
      1,
      { endereco: 'Nova Rua 123' } as any,
      user,
    );
    expect(r.id).toBe(1);
    expect(prisma.startup.update).toHaveBeenCalled();
  });

  it('6. CNPJ eh mascarado nos logs (LGPD)', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      id: 1,
      founderId: FOUNDER,
    });
    prisma.campaign.findFirst.mockResolvedValueOnce(null);

    const spy = jest.spyOn((service as any).logger, 'log');
    await service.update(1, { cnpj: '11.222.333/0001-81' } as any, user);

    expect(spy).toHaveBeenCalledWith(
      'Update startup 1 cnpj=11.222.***-****-81',
    );
  });
});
