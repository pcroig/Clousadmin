// ========================================
// Email Button Component
// ========================================
// Botón CTA reutilizable con el estilo de Clousadmin

import { Button } from '@react-email/components';
import * as React from 'react';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button
      className="rounded bg-[#4F46E5] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
      href={href}
    >
      {children}
    </Button>
  );
}
