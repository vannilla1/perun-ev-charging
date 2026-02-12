import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/Common';

describe('Input', () => {
  it('renderuje input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('zobrazuje label', () => {
    render(<Input label="E-mail" />);
    expect(screen.getByText('E-mail')).toBeInTheDocument();
  });

  it('zobrazuje placeholder', () => {
    render(<Input placeholder="Zadajte e-mail" />);
    expect(screen.getByPlaceholderText('Zadajte e-mail')).toBeInTheDocument();
  });

  it('volá onChange handler', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('zobrazuje error message', () => {
    render(<Input error="Povinné pole" />);
    expect(screen.getByText('Povinné pole')).toBeInTheDocument();
  });

  it('je disabled keď je disabled prop true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('používa správny type', () => {
    render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('zobrazuje left icon', () => {
    const icon = <span data-testid="left-icon">📧</span>;
    render(<Input leftIcon={icon} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('má správny value', () => {
    render(<Input value="test@email.sk" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveValue('test@email.sk');
  });

  it('podporuje autoComplete', () => {
    render(<Input autoComplete="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'email');
  });
});
