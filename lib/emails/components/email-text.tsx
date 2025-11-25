// ========================================
// Email Text Component
// ========================================
// Texto de párrafo estándar

import { Text } from '@react-email/components';
import * as React from 'react';

interface EmailTextProps {
  children: React.ReactNode;
  className?: string;
}

export function EmailText({ children, className }: EmailTextProps) {
  return (
    <Text className={`text-[14px] leading-[24px] text-black ${className || ''}`}>
      {children}
    </Text>
  );
}
