import { Test, TestingModule } from '@nestjs/testing';
import { StartupNotificationService } from './startup-notification.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { NotificationsService } from 'src/api/notifications/notifications.service';
import { NotificationType } from 'src/api/notifications/dto/query-notifications.dto';

describe('StartupNotificationService (S1-T09)', () => {
  let service: StartupNotificationService;
  let prisma: { startup: { findUnique: jest.Mock } };
  let notifications: { create: jest.Mock };
  let email: { sendTemplateBySlug: jest.Mock };

  const startupRow = {
    nome: 'Acme Tech',
    founderId: 42,
    founder: { nome: 'Maria Souza', email: 'founder@example.com' },
  };

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn().mockResolvedValue(startupRow) },
    };
    notifications = { create: jest.fn().mockResolvedValue({ id: 1 }) };
    email = {
      sendTemplateBySlug: jest
        .fn()
        .mockResolvedValue({ success: true, message: 'ok' }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StartupNotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(StartupNotificationService);
  });

  it('stage1: dispara 3 notificações in-app + e-mail', async () => {
    await service.onStage1Completed({ startupId: 1 });
    expect(notifications.create).toHaveBeenCalledTimes(3);
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      expect.any(String),
      expect.any(String),
      NotificationType.GENERAL,
    );
    expect(email.sendTemplateBySlug).toHaveBeenCalledWith(
      'founder@example.com',
      'startup-etapa1-concluida',
      expect.objectContaining({ startupName: 'Acme Tech' }),
    );
  });

  it('stage2: dispara apenas a notificação de conclusão (NÃO pendência de compliance)', async () => {
    // BUG-FT-003 (B2): a pendência da Taxa de Compliance migrou para a Fase 3.
    await service.onStage2Completed({ startupId: 1 });
    // Apenas 1 notificação ("Fase 2 concluída: cadastro enviado").
    // A pendência financeira NUNCA deve aparecer aqui.
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).not.toHaveBeenCalledWith(
      42,
      expect.stringContaining('Pendência financeira'),
      expect.anything(),
      expect.anything(),
    );
    expect(email.sendTemplateBySlug).toHaveBeenCalledWith(
      'founder@example.com',
      'startup-etapa2-concluida',
      expect.any(Object),
    );
  });

  it('stage3: 2 notificações (validação + pendência compliance) + e-mail pagamento-confirmado com purposeLabel', async () => {
    // BUG-FT-003 (B2 + Bug B3): na conclusão da Fase 3 dispara a notificação
    // de validação ("Quase lá"), a pendência da Taxa de Compliance E o e-mail
    // de pagamento confirmado. O e-mail deve usar `purposeLabel` (não `purpose`)
    // para evitar o bug "undefined" no template.
    await service.onStage3Completed({ startupId: 1 });
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      expect.stringContaining('Pendência financeira'),
      expect.stringContaining('Taxa de Compliance'),
      NotificationType.GENERAL,
    );
    expect(email.sendTemplateBySlug).toHaveBeenCalledWith(
      'founder@example.com',
      'startup-pagamento-confirmado',
      expect.objectContaining({
        startupName: 'Acme Tech',
        purposeLabel: expect.stringContaining('Taxa de Compliance'),
      }),
    );
    // Não deve passar `purpose` (legado bug do REST).
    expect(email.sendTemplateBySlug).not.toHaveBeenCalledWith(
      expect.anything(),
      'startup-pagamento-confirmado',
      expect.objectContaining({ purpose: expect.anything() }),
    );
  });

  it('payment.confirmed: rótulo por purpose', async () => {
    await service.onPaymentConfirmed({
      startupId: 1,
      purpose: 'COMPLIANCE_FEE',
    });
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      'Pagamento confirmado!',
      expect.stringContaining('Taxa de Compliance'),
      NotificationType.GENERAL,
    );
  });

  it('payment.confirmed: e-mail usa purposeLabel (não purpose) — Bug B3', async () => {
    // O template startupPagamentoConfirmadoTemplate + mapDataForDbTemplate
    // esperam `purposeLabel`. Se o listener mandar `purpose`, o template
    // renderiza `undefined` no corpo do e-mail (escapeHtml(undefined) === 'undefined').
    await service.onPaymentConfirmed({
      startupId: 1,
      purpose: 'TOKEN_RESERVATION',
    });
    expect(email.sendTemplateBySlug).toHaveBeenCalledWith(
      'founder@example.com',
      'startup-pagamento-confirmado',
      expect.objectContaining({
        startupName: 'Acme Tech',
        purposeLabel: expect.stringContaining('reserva do token'),
      }),
    );
    // Não pode passar `purpose` no payload do e-mail — o template espera `purposeLabel`.
    const emailCall = email.sendTemplateBySlug.mock.calls[0][2] as Record<
      string,
      unknown
    >;
    expect(emailCall).not.toHaveProperty('purpose');
  });

  it('approved: usa NotificationType.STARTUP_APPROVED', async () => {
    await service.onStartupApproved({ startupId: 1 });
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      'Startup aprovada!',
      expect.any(String),
      NotificationType.STARTUP_APPROVED,
    );
    expect(email.sendTemplateBySlug).toHaveBeenCalledWith(
      'founder@example.com',
      'startup-aprovada',
      expect.objectContaining({
        founderName: 'Maria Souza',
        startupName: 'Acme Tech',
      }),
    );
  });

  it('rejected: inclui motivo e usa STARTUP_REJECTED', async () => {
    await service.onStartupRejected({
      startupId: 1,
      reason: 'Documento X ilegível',
    });
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      'Ajustes solicitados pelo Compliance',
      expect.stringContaining('Documento X ilegível'),
      NotificationType.STARTUP_REJECTED,
    );
    expect(email.sendTemplateBySlug).toHaveBeenCalledWith(
      'founder@example.com',
      'startup-rejeitada',
      expect.objectContaining({
        founderName: 'Maria Souza',
        startupName: 'Acme Tech',
        reason: 'Documento X ilegível',
      }),
    );
  });

  it('document.rejected: notifica founder com nome do doc + motivo (STARTUP_REJECTED)', async () => {
    await service.onDocumentRejected({
      startupId: 1,
      documentName: 'contrato-social.pdf',
      reason: 'Documento ilegível',
    });
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      'Documento rejeitado',
      expect.stringContaining('contrato-social.pdf'),
      NotificationType.STARTUP_REJECTED,
    );
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      'Documento rejeitado',
      expect.stringContaining('Documento ilegível'),
      NotificationType.STARTUP_REJECTED,
    );
    expect(email.sendTemplateBySlug).toHaveBeenCalledWith(
      'founder@example.com',
      'startup-documento-rejeitado',
      expect.objectContaining({
        founderName: 'Maria Souza',
        startupName: 'Acme Tech',
        documentName: 'contrato-social.pdf',
      }),
    );
  });

  it('document.rejected: fallback quando documentName/reason ausentes', async () => {
    await service.onDocumentRejected({ startupId: 1 });
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      'Documento rejeitado',
      expect.stringContaining('Acme Tech'),
      NotificationType.STARTUP_REJECTED,
    );
  });

  it('document.rejected: startup inexistente não dispara nada', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce(null);
    await service.onDocumentRejected({ startupId: 999 });
    expect(notifications.create).not.toHaveBeenCalled();
    expect(email.sendTemplateBySlug).not.toHaveBeenCalled();
  });

  it('startup inexistente: não dispara nada', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce(null);
    await service.onStage1Completed({ startupId: 999 });
    expect(notifications.create).not.toHaveBeenCalled();
    expect(email.sendTemplateBySlug).not.toHaveBeenCalled();
  });

  it('founder sem e-mail: in-app ainda dispara, e-mail é pulado', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      ...startupRow,
      founder: { email: null },
    });
    await service.onStage3Completed({ startupId: 1 });
    // BUG-FT-004 (B2): Fase 3 agora dispara 2 notificações (validação + pendência).
    expect(notifications.create).toHaveBeenCalledTimes(2);
    expect(email.sendTemplateBySlug).not.toHaveBeenCalled();
  });

  it('founder sem nome: e-mail usa fallback via founderName vazio (não "undefined")', async () => {
    prisma.startup.findUnique.mockResolvedValueOnce({
      ...startupRow,
      founder: { nome: '   ', email: 'founder@example.com' },
    });
    await service.onStartupApproved({ startupId: 1 });
    // loadStartup normaliza nome vazio para o fallback 'fundador(a)'.
    expect(email.sendTemplateBySlug).toHaveBeenCalledWith(
      'founder@example.com',
      'startup-aprovada',
      expect.objectContaining({ founderName: 'fundador(a)' }),
    );
  });

  it('textos visíveis usam "Fase" (não "Etapa") — terminologia canônica (Bug B4)', async () => {
    // CASE.md padronizou "Fase" (1/2/3) e o frontend já usa esse termo.
    // O backend enviava "Etapa" — corrigido para "Fase".
    await service.onStage2Completed({ startupId: 1 });
    const calls = notifications.create.mock.calls;
    const title = calls[0][1] as string;
    const description = calls[0][2] as string;
    expect(title).toContain('Fase 2');
    expect(title).not.toContain('Etapa 2');
    expect(description).toContain('Fase 3');
    expect(description).not.toContain('Etapa 3');

    notifications.create.mockClear();
    await service.onStage3Completed({ startupId: 1 });
    const stage3Calls = notifications.create.mock.calls;
    const allTexts = stage3Calls.map((c) => `${c[1]} ${c[2]}`).join(' ');
    // stage3 não deveria ter "Etapa X concluída" — apenas "Quase lá" + "Pendência"
    expect(allTexts).not.toMatch(/Etapa \d+ concluída/);
  });

  it('ordem: notificação in-app é concluída ANTES do disparo do e-mail', async () => {
    const callOrder: string[] = [];
    notifications.create.mockImplementationOnce(async () => {
      callOrder.push('in-app');
      return { id: 1 };
    });
    email.sendTemplateBySlug.mockImplementationOnce(async () => {
      callOrder.push('email');
      return { success: true, message: 'ok' };
    });

    await service.onStartupApproved({ startupId: 1 });

    expect(callOrder[0]).toBe('in-app');
    expect(callOrder).toContain('email');
    expect(callOrder.indexOf('in-app')).toBeLessThan(
      callOrder.indexOf('email'),
    );
  });

  it('e-mail fire-and-forget: rejeição do envio não quebra o handler', async () => {
    email.sendTemplateBySlug.mockRejectedValueOnce(new Error('smtp timeout'));
    await expect(
      service.onStartupRejected({ startupId: 1, reason: 'ajuste' }),
    ).resolves.not.toThrow();
    // In-app foi criada mesmo com o e-mail falhando.
    expect(notifications.create).toHaveBeenCalledWith(
      42,
      'Ajustes solicitados pelo Compliance',
      expect.any(String),
      NotificationType.STARTUP_REJECTED,
    );
  });

  it('falha no e-mail não propaga (best-effort)', async () => {
    email.sendTemplateBySlug.mockResolvedValueOnce({
      success: false,
      message: 'smtp down',
    });
    await expect(
      service.onStartupApproved({ startupId: 1 }),
    ).resolves.not.toThrow();
    expect(notifications.create).toHaveBeenCalled();
  });
});
