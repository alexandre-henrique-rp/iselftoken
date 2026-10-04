import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  let send: jest.Mock;
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    send = jest.fn().mockResolvedValue({ messageId: 'message-id' });
    (service as any).transporter = { sendMail: send };
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registra tentativa e conclusão SMTP sem registrar o destinatário', async () => {
    const logSpy = jest.spyOn((service as any).logger, 'log');

    await service.sendEmail({
      to: 'usuario@exemplo.com',
      subject: 'Código de Verificação',
      type: 'simple',
      text: 'Mensagem de teste',
    });

    const logs = logSpy.mock.calls.flat().join(' ');
    expect(logs).toContain('[SMTP] Tentativa de envio');
    expect(logs).toContain('[SMTP] Envio concluído');
    expect(logs).not.toContain('usuario@exemplo.com');

    logSpy.mockRestore();
  });

  it('registra código seguro na falha SMTP sem expor mensagem sensível', async () => {
    const errorSpy = jest.spyOn((service as any).logger, 'error');
    send.mockRejectedValue({
      code: 'EAUTH',
      responseCode: 535,
      command: 'AUTH',
      message: 'falha para usuario@exemplo.com com credencial privada',
    });

    const result = await service.sendEmail({
      to: 'usuario@exemplo.com',
      subject: 'Teste',
      type: 'simple',
      text: 'Mensagem de teste',
    });

    const logs = errorSpy.mock.calls.flat().join(' ');
    expect(result.success).toBe(false);
    expect(logs).toContain('[SMTP] Falha no envio');
    expect(logs).toContain('code=EAUTH');
    expect(logs).toContain('responseCode=535');
    expect(logs).toContain('command=AUTH');
    expect(logs).not.toContain('usuario@exemplo.com');
    expect(logs).not.toContain('credencial privada');

    errorSpy.mockRestore();
  });

  it('não adiciona cópias pessoais por padrão', async () => {
    await service.sendEmail({
      to: 'admin@iselftoken.com',
      subject: 'Teste',
      type: 'simple',
      text: 'Mensagem de teste',
    });

    const mailOptions = send.mock.calls[0][0];
    expect(mailOptions.cc).toBeUndefined();
    expect(mailOptions.envelope.to).toEqual(['admin@iselftoken.com']);
  });

  it('mantém somente o destinatário principal quando EMAIL_CC_LIST está vazio', async () => {
    await service.sendEmail({
      to: 'usuario@exemplo.com',
      subject: 'Teste',
      type: 'simple',
      text: 'Mensagem de teste',
    });

    const mailOptions = send.mock.calls[0][0];
    expect(mailOptions.to).toEqual(['usuario@exemplo.com']);
    expect(mailOptions.cc).toBeUndefined();
    expect(mailOptions.envelope.to).toEqual(['usuario@exemplo.com']);
  });

  it('escapes simple text before converting it to HTML', async () => {
    await service.sendEmail({
      to: 'usuario@exemplo.com',
      subject: 'Teste',
      type: 'simple',
      text: '<script>alert(1)</script>\nMensagem',
    });

    const mailOptions = send.mock.calls[0][0];
    expect(mailOptions.html).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;<br>Mensagem</p>',
    );
  });

  it('escapes fallback template values and validates redirect URLs', async () => {
    await service.sendVerificationCodeEmail(
      'usuario@exemplo.com',
      '<img src=x onerror=alert(1)>',
      '<script>alert(1)</script>',
      '<em>confirmar</em>',
      'https://app.example/login?next=a&source=email',
    );

    const mailOptions = send.mock.calls[0][0];
    expect(mailOptions.html).not.toContain('<img src=x');
    expect(mailOptions.html).not.toContain('<script>alert(1)</script>');
    expect(mailOptions.html).toContain(
      'href="https://app.example/login?next=a&amp;source=email"',
    );
  });

  it('does not send a fallback email with an unsafe redirect URL', async () => {
    const result = await service.sendVerificationCodeEmail(
      'usuario@exemplo.com',
      'Nome',
      '123456',
      'confirmar o acesso',
      'javascript:alert(1)',
    );

    expect(result.success).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
