/**
 * Tests de componentes UI básicos
 */

import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { render, screen } from '@/tests/helpers/react';

describe('UI Components', () => {
  describe('Card', () => {
    it('should render card with title and content', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Employee Info</CardTitle>
            <CardDescription>View employee details</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Content here</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Employee Info')).toBeInTheDocument();
      expect(screen.getByText('View employee details')).toBeInTheDocument();
      expect(screen.getByText('Content here')).toBeInTheDocument();
    });
  });

  describe('Button', () => {
    it('should render clickable button', async () => {
      const { user } = render(<Button>Save</Button>);
      const button = screen.getByRole('button', { name: /save/i });
      
      expect(button).toBeInTheDocument();
      await user.click(button);
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Submit</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should support variants', () => {
      const { rerender } = render(<Button variant="default">Default</Button>);
      expect(screen.getByText('Default')).toBeInTheDocument();

      rerender(<Button variant="destructive">Delete</Button>);
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });
});
