// ========================================
// Email Link Component
// ========================================
// Link con estilo consistente

import { Link } from '@react-email/components';
import * as React from 'react';

interface EmailLinkProps {
  href: string;
  children: React.ReactNode;
}

export function EmailLink({ href, children }: EmailLinkProps) {
  return (
    <Link href={href} className="text-blue-600 no-underline">
      {children}
    </Link>
  );
}
