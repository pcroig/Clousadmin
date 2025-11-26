/**
 * Smoke test: Validar que Testing Library está configurado correctamente
 */

import { describe, expect, it } from 'vitest';

import { render, renderWithProviders, screen } from '../helpers/react';

// Componente simple para testing
function TestComponent({ name }: { name: string }) {
  return (
    <div>
      <h1>Hello, {name}!</h1>
      <button onClick={() => alert('clicked')}>Click me</button>
    </div>
  );
}

describe('React Testing Library Setup', () => {
  it('should render a simple component', () => {
    render(<TestComponent name="World" />);

    expect(screen.getByText('Hello, World!')).toBeInTheDocument();
  });

  it('should find elements by role', () => {
    render(<TestComponent name="Test" />);

    const heading = screen.getByRole('heading', { name: /hello/i });
    const button = screen.getByRole('button', { name: /click me/i });

    expect(heading).toBeInTheDocument();
    expect(button).toBeInTheDocument();
  });

  it('should use custom render with providers', () => {
    const { user } = renderWithProviders(<TestComponent name="Vitest" />);

    expect(screen.getByText('Hello, Vitest!')).toBeInTheDocument();
    expect(user).toBeDefined();
  });

  it('should support jest-dom matchers', () => {
    render(<TestComponent name="Jest-DOM" />);

    const heading = screen.getByRole('heading');
    expect(heading).toBeVisible();
    expect(heading).toHaveTextContent('Hello, Jest-DOM!');
  });
});
