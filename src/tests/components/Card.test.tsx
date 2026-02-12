import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/Common';

describe('Card', () => {
  it('renderuje children správne', () => {
    render(<Card>Obsah karty</Card>);
    expect(screen.getByText('Obsah karty')).toBeInTheDocument();
  });

  it('aplikuje className', () => {
    const { container } = render(<Card className="custom-class">Test</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('custom-class');
  });

  it('má základný element', () => {
    render(<Card>Test</Card>);
    const card = screen.getByText('Test').parentElement;
    expect(card).toBeInTheDocument();
    expect(card?.tagName).toBe('DIV');
  });
});

describe('CardHeader', () => {
  it('renderuje title správne', () => {
    render(
      <Card>
        <CardHeader title="Hlavička" />
      </Card>
    );
    expect(screen.getByText('Hlavička')).toBeInTheDocument();
  });

  it('renderuje subtitle', () => {
    render(
      <Card>
        <CardHeader title="Title" subtitle="Subtitle" />
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  it('má správne štýly', () => {
    render(
      <Card>
        <CardHeader title="Test" />
      </Card>
    );
    const header = screen.getByText('Test').parentElement?.parentElement;
    expect(header).toHaveClass('flex');
  });
});

describe('CardContent', () => {
  it('renderuje children správne', () => {
    render(
      <Card>
        <CardContent>Obsah</CardContent>
      </Card>
    );
    expect(screen.getByText('Obsah')).toBeInTheDocument();
  });
});

describe('CardFooter', () => {
  it('renderuje children správne', () => {
    render(
      <Card>
        <CardFooter>Pätička</CardFooter>
      </Card>
    );
    expect(screen.getByText('Pätička')).toBeInTheDocument();
  });

  it('má border-top', () => {
    render(
      <Card>
        <CardFooter>Test</CardFooter>
      </Card>
    );
    expect(screen.getByText('Test')).toHaveClass('border-t');
  });
});

describe('Card kompozícia', () => {
  it('renderuje všetky časti správne', () => {
    render(
      <Card>
        <CardHeader title="Header" />
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
