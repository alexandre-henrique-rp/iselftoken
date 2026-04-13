import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Clique aqui</Button>);
    expect(screen.getByText('Clique aqui')).toBeInTheDocument();
  });

  it('should render different variants', () => {
    const { container } = render(<Button variant="destructive">Excluir</Button>);
    expect(container.querySelector('button')).toBeInTheDocument();
  });
});