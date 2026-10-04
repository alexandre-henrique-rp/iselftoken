import { buildMultilineDescription } from './description.helpers';

describe('buildMultilineDescription', () => {
  it('junta múltiplas linhas com "\\n\\n"', () => {
    expect(buildMultilineDescription('Linha 1', 'Linha 2', 'Linha 3')).toBe(
      'Linha 1\n\nLinha 2\n\nLinha 3',
    );
  });

  it('filtra valores null, undefined e strings vazias', () => {
    expect(
      buildMultilineDescription('A', null, undefined, '', 'B', '   ', 'C'),
    ).toBe('A\n\nB\n\nC');
  });

  it('faz trim em cada linha e no resultado final', () => {
    expect(buildMultilineDescription('  Linha 1  ', '  Linha 2  ')).toBe(
      'Linha 1\n\nLinha 2',
    );
  });

  it('retorna string vazia quando todas as linhas são vazias', () => {
    expect(buildMultilineDescription('', null, undefined)).toBe('');
  });

  it('retorna string vazia quando não há argumentos', () => {
    expect(buildMultilineDescription()).toBe('');
  });

  it('preserva pontuação e acentuação', () => {
    expect(
      buildMultilineDescription(
        'Pagamento confirmado!',
        'Você já pode seguir para o próximo passo.',
      ),
    ).toBe(
      'Pagamento confirmado!\n\nVocê já pode seguir para o próximo passo.',
    );
  });
});
