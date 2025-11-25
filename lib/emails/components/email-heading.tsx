// ========================================
// Email Heading Component
// ========================================
// Título principal del email

import { Heading } from '@react-email/components';
import * as React from 'react';

interface EmailHeadingProps {
  children: React.ReactNode;
}

export function EmailHeading({ children }: EmailHeadingProps) {
  return (
    <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
      {children}
    </Heading>
  );
}
