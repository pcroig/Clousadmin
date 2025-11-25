// ========================================
// Email Layout Base - Adaptado de Vercel
// ========================================
// Layout base reutilizable para todos los emails de Clousadmin

import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  previewText: string;
  children: React.ReactNode;
  logoUrl?: string;
}

export function EmailLayout({ previewText, children, logoUrl }: EmailLayoutProps) {
  // URL del logo - usar el de la empresa o fallback a Clousadmin
  const logo = logoUrl || `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={logo}
                width="40"
                height="40"
                alt="Logo"
                className="mx-auto my-0"
              />
            </Section>
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
