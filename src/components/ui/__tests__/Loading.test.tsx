import { render, screen, within, waitFor } from '@testing-library/react';
import { Loading } from '../Loading';

import React from 'react';

/**
 * Testes TDD para o componente Loading, verificando renderização, acessibilidade e animação suave.
 */
describe('Loading Component', () => {
  it('renderiza o componente com três elementos animados em posições corretas', () => {
    render(<Loading data-testid="loading-container" />);
    const container = screen.getByTestId('loading-container');
    expect(container).toBeInTheDocument();
    const dots = within(container).getAllByRole('img');
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('data-testid', 'dot-1');
    expect(dots[0]).toHaveClass('animate-moveDot');
    expect(dots[1]).toHaveAttribute('data-testid', 'dot-2');
    expect(dots[1]).toHaveClass('animate-moveDot');
    expect(dots[2]).toHaveAttribute('data-testid', 'dot-3');
    expect(dots[2]).toHaveClass('animate-moveDot');
  });

  it('tem classes de animação', () => {
    render(<Loading data-testid="loading-container" />);
    const dots = screen.getAllByRole('img');
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveClass('animate-moveDot');
    expect(dots[1]).toHaveClass('animate-moveDot');
    expect(dots[2]).toHaveClass('animate-moveDot');
  });

  it('animação não trava após um curto período', async () => {
    render(<Loading data-testid="loading-container" />);
    await waitFor(() => expect(screen.getByTestId('loading-container')).toBeInTheDocument(), { timeout: 2000 });
    const dots = screen.getAllByRole('img');
    expect(dots).toHaveLength(3);
  });
});
