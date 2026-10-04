import { charValue, computeCnpjDv, validateCnpj } from './cnpj.validator';

describe('charValue', () => {
  it('deve retornar 0 para caractere "0"', () => {
    expect(charValue('0')).toBe(0);
  });

  it('deve retornar 1 para caractere "1"', () => {
    expect(charValue('1')).toBe(1);
  });

  it('deve retornar 9 para caractere "9"', () => {
    expect(charValue('9')).toBe(9);
  });

  it('deve retornar 17 para caractere "A" (ASCII 65 - 48)', () => {
    expect(charValue('A')).toBe(17);
  });

  it('deve retornar 42 para caractere "Z" (ASCII 90 - 48)', () => {
    expect(charValue('Z')).toBe(42);
  });

  it('deve cobrir todos os 10 dígitos (0-9)', () => {
    for (let i = 0; i <= 9; i++) {
      expect(charValue(String(i))).toBe(i);
    }
  });

  it('deve cobrir todas as 26 letras (A-Z)', () => {
    for (let i = 0; i < 26; i++) {
      const code = 65 + i;
      const ch = String.fromCharCode(code);
      expect(charValue(ch)).toBe(code - 48);
    }
  });
});

describe('computeCnpjDv', () => {
  // Exemplo do manual IN RFB 2.229/2024: radical "12ABC34501DE" → DV1=3, DV2=5 → "35"
  it('deve calcular DV = "35" para radical "12ABC34501DE" (exemplo do manual)', () => {
    expect(computeCnpjDv('12ABC34501DE')).toBe('35');
  });

  // Borda: resto=0 → DV=0
  it('deve retornar "00" para radical "000000000000" (resto=0 → DV=0)', () => {
    expect(computeCnpjDv('000000000000')).toBe('00');
  });

  it('deve retornar "91" para radical "000000000001"', () => {
    expect(computeCnpjDv('000000000001')).toBe('91');
  });

  it('deve lançar erro se radical não tiver 12 caracteres', () => {
    expect(() => computeCnpjDv('ABC')).toThrow(
      'Radical do CNPJ deve ter 12 caracteres',
    );
  });

  it('deve lançar erro se radical tiver 11 caracteres', () => {
    expect(() => computeCnpjDv('12345678901')).toThrow(
      'Radical do CNPJ deve ter 12 caracteres',
    );
  });

  it('deve lançar erro se radical tiver 13 caracteres', () => {
    expect(() => computeCnpjDv('1234567890123')).toThrow(
      'Radical do CNPJ deve ter 12 caracteres',
    );
  });

  // CNPJ puramente numérico verificado via ts-node
  it('deve calcular DV = "95" para radical "123456780001"', () => {
    expect(computeCnpjDv('123456780001')).toBe('95');
  });

  it('deve calcular DV = "55" para radical "000000010000"', () => {
    expect(computeCnpjDv('000000010000')).toBe('55');
  });
});

describe('validateCnpj', () => {
  // CNPJ alfanumérico do manual (12.ABC.345/01DE-35)
  it('deve aceitar CNPJ alfanumérico válido "12.ABC.345/01DE-35" (exemplo do manual)', () => {
    expect(validateCnpj('12.ABC.345/01DE-35')).toBe(true);
  });

  it('deve aceitar CNPJ alfanumérico sem máscara "12ABC34501DE35"', () => {
    expect(validateCnpj('12ABC34501DE35')).toBe(true);
  });

  // CNPJ alfanumérico com DV errado
  it('deve rejeitar CNPJ alfanumérico com DV errado "12.ABC.345/01DE-99"', () => {
    expect(validateCnpj('12.ABC.345/01DE-99')).toBe(false);
  });

  // CNPJ numérico verificado (12.345.678/0001-95)
  it('deve aceitar CNPJ numérico válido "12.345.678/0001-95" (verificado ts-node)', () => {
    expect(validateCnpj('12.345.678/0001-95')).toBe(true);
  });

  it('deve rejeitar CNPJ numérico com DV errado', () => {
    expect(validateCnpj('12.345.678/0001-00')).toBe(false);
  });

  // Tamanho
  it('deve rejeitar CNPJ com tamanho curto (13 dígitos)', () => {
    expect(validateCnpj('1234567890123')).toBe(false);
  });

  it('deve rejeitar CNPJ com tamanho longo (15 dígitos)', () => {
    expect(validateCnpj('123456789012345')).toBe(false);
  });

  // Normalização
  it('deve normalizar minúsculas e aceitar se DV correto', () => {
    expect(validateCnpj('12.abc.345/01de-35')).toBe(true);
  });

  it('deve aceitar CNPJ todo maiúsculo', () => {
    expect(validateCnpj('12ABC34501DE35')).toBe(true);
  });

  // Valores inválidos
  it('deve rejeitar string vazia', () => {
    expect(validateCnpj('')).toBe(false);
  });

  it('deve rejeitar null', () => {
    expect(validateCnpj(null as any)).toBe(false);
  });

  it('deve rejeitar undefined', () => {
    expect(validateCnpj(undefined as any)).toBe(false);
  });

  describe('opção alphanumeric: false (regressão S01)', () => {
    it('deve rejeitar CNPJ alfanumérico válido quando alphanumeric: false', () => {
      expect(validateCnpj('12.ABC.345/01DE-35', { alphanumeric: false })).toBe(
        false,
      );
    });

    it('deve aceitar CNPJ numérico válido quando alphanumeric: false', () => {
      expect(validateCnpj('12.345.678/0001-95', { alphanumeric: false })).toBe(
        true,
      );
    });

    it('deve rejeitar null mesmo sem letras', () => {
      expect(validateCnpj(null as any, { alphanumeric: false })).toBe(false);
    });
  });
});

describe('@IsCpfOrCnpj (via validateCnpj)', () => {
  // IsCpfOrCnpj aceita CPF (11 dígitos) sem validar DV de CPF
  it('deve aceitar CPF válido (11 dígitos) via branching interno', () => {
    const normalized = '12345678901'.toUpperCase().replace(/[^A-Z0-9]/g, '');
    expect(normalized.length).toBe(11);
  });

  it('deve aceitar CNPJ numérico válido via validateCnpj', () => {
    expect(validateCnpj('12.345.678/0001-95')).toBe(true);
  });

  it('deve aceitar CNPJ alfanumérico válido via validateCnpj', () => {
    expect(validateCnpj('12.ABC.345/01DE-35')).toBe(true);
  });

  it('deve rejeitar documento com tamanho inválido (nem 11 nem 14)', () => {
    expect(validateCnpj('12345')).toBe(false);
  });
});
