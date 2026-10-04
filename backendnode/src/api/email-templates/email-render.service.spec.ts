import { BadRequestException } from '@nestjs/common';
import { EmailRenderService } from './email-render.service';

describe('EmailRenderService', () => {
  let service: EmailRenderService;

  beforeEach(() => {
    service = new EmailRenderService();
  });

  describe('render', () => {
    it('should interpolate variables in subject, html, and text', () => {
      const result = service.render(
        '<p>Hello {{name}}</p>',
        'Hello {{name}}',
        'Welcome {{name}}',
        { type: 'object', required: ['name'] },
        { name: 'John' },
      );

      expect(result.html).toBe('<p>Hello John</p>');
      expect(result.text).toBe('Hello John');
      expect(result.subject).toBe('Welcome John');
    });

    it('should throw BadRequestException when required variable is missing', () => {
      expect(() =>
        service.render(
          '<p>Hello {{name}}</p>',
          'Hello {{name}}',
          'Welcome {{name}}',
          { type: 'object', required: ['name', 'email'] },
          { name: 'John' },
        ),
      ).toThrow(BadRequestException);
    });

    it('should keep unknown placeholders as-is', () => {
      const result = service.render(
        '<p>Hello {{name}} and {{unknown}}</p>',
        'Hello {{name}}',
        'Welcome',
        {},
        { name: 'John' },
      );

      expect(result.html).toBe('<p>Hello John and {{unknown}}</p>');
    });

    it('should track used variables', () => {
      const result = service.render(
        '<p>Hello {{name}} your email is {{email}}</p>',
        'Hello {{name}}',
        'Welcome',
        {},
        { name: 'John', email: 'john@example.com' },
      );

      expect(result.usedVariables).toContain('name');
      expect(result.usedVariables).toContain('email');
    });

    it('should handle empty data with no required fields', () => {
      const result = service.render(
        '<p>Static content</p>',
        'Static content',
        'Static Subject',
        {},
        {},
      );

      expect(result.html).toBe('<p>Static content</p>');
      expect(result.subject).toBe('Static Subject');
    });
  });

  describe('security contexts', () => {
    it('escapes HTML values but preserves text and subject values', () => {
      const result = service.render(
        '<p>{{value}}</p>',
        '{{value}}',
        'Subject {{value}}',
        {},
        { value: '<img src=x onerror=alert(1)>' },
      );

      expect(result.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(result.html).not.toContain('<img');
      expect(result.text).toBe('<img src=x onerror=alert(1)>');
      expect(result.subject).toBe('Subject <img src=x onerror=alert(1)>');
    });

    it('rejects unsafe protocols in dynamic href attributes', () => {
      expect(() =>
        service.render(
          '<a href="{{redirectUrl}}">Acessar</a>',
          'Acessar',
          'Link',
          { required: ['redirectUrl'] },
          { redirectUrl: 'javascript:alert(1)' },
        ),
      ).toThrow('redirectUrl deve usar HTTPS');
    });

    it('accepts secure URLs and escapes attribute entities', () => {
      const result = service.render(
        '<a href="{{redirectUrl}}">Acessar</a>',
        '{{redirectUrl}}',
        'Link',
        { required: ['redirectUrl'] },
        { redirectUrl: 'https://app.example/reset?token=a&next=b' },
      );

      expect(result.html).toContain(
        'href="https://app.example/reset?token=a&amp;next=b"',
      );
    });
  });
});
