// ========================================
// Email Footer Component
// ========================================
// Footer con información legal y de ayuda

import { Hr, Text } from '@react-email/components';
import * as React from 'react';

interface EmailFooterProps {
  children: React.ReactNode;
}

export function EmailFooter({ children }: EmailFooterProps) {
  return (
    <>
      <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
      <Text className="text-[12px] leading-[24px] text-[#666666]">
        {children}
      </Text>
    </>
  );
}
