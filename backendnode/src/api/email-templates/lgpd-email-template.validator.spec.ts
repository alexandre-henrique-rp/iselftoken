import { BadRequestException } from '@nestjs/common';
import { validateNoPII } from './lgpd-email-template.validator';

describe('LGPD Email Template Validator', () => {
  describe('validateNoPII', () => {
    it('should not throw when template contains no PII', () => {
      const html = 'Olá {{nome}}, bem-vindo à iSelfToken!';
      const subject = 'Bem-vindo';
      const text = 'Olá';
      expect(() => validateNoPII(html, subject, text)).not.toThrow();
    });

    it('should not throw when template uses only placeholders (LGPD safe)', () => {
      const html = 'Olá {{nome}}, seu código é {{codigo}}. Email: {{email}}';
      expect(() => validateNoPII(html, html, html)).not.toThrow();
    });

    it('should throw when CPF pattern is detected outside placeholder', () => {
      const html = 'CPF: 123.456.789-00 é inválido.';
      expect(() => validateNoPII(html, html, html)).toThrow(
        BadRequestException,
      );
    });

    it('should throw when email pattern is detected outside placeholder', () => {
      const html = 'Contato: usuario@provedor.com';
      expect(() => validateNoPII(html, html, html)).toThrow(
        BadRequestException,
      );
    });

    it('should throw when phone pattern is detected outside placeholder', () => {
      const html = 'Telefone: (11) 99999-1234';
      expect(() => validateNoPII(html, html, html)).toThrow(
        BadRequestException,
      );
    });

    it('should not throw when only placeholders are used', () => {
      const html = 'Nome: {{userName}}, CPF: {{cpf}}';
      expect(() => validateNoPII(html, html, html)).not.toThrow();
    });

    it('should throw when bare email is in content', () => {
      const html = 'Suporte: suporte@empresa.com.br';
      expect(() => validateNoPII(html, html, html)).toThrow(
        BadRequestException,
      );
    });

    it('should not throw when placeholders are used for sensitive fields', () => {
      const html = 'Seu documento: {{documento}}';
      expect(() => validateNoPII(html, html, html)).not.toThrow();
    });
  });
});
