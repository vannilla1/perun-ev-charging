import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Common';

describe('Button', () => {
  it('renderuje text správne', () => {
    render(<Button>Klikni na mňa</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Klikni na mňa');
  });

  it('volá onClick handler pri kliknutí', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Klikni</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('je disabled keď je loading', () => {
    render(<Button loading>Načítavam</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('je disabled keď je disabled prop true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('zobrazuje loading spinner', () => {
    render(<Button loading>Načítavam</Button>);
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });

  it('aplikuje správnu variantu - primary', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--primary)]');
  });

  it('aplikuje správnu variantu - outline', () => {
    render(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-[var(--primary)]');
  });

  it('aplikuje správnu variantu - danger', () => {
    render(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--error)]');
  });

  it('zobrazuje left icon', () => {
    const icon = <span data-testid="left-icon">🔌</span>;
    render(<Button leftIcon={icon}>S ikonou</Button>);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('zobrazuje right icon', () => {
    const icon = <span data-testid="right-icon">→</span>;
    render(<Button rightIcon={icon}>S ikonou</Button>);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('má správnu veľkosť - lg', () => {
    render(<Button size="lg">Veľké</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6');
    expect(screen.getByRole('button')).toHaveClass('py-3');
  });

  it('má správnu veľkosť - sm', () => {
    render(<Button size="sm">Malé</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-3');
    expect(screen.getByRole('button')).toHaveClass('py-1.5');
  });

  it('fullWidth aplikuje w-full', () => {
    render(<Button fullWidth>Celá šírka</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });
});
