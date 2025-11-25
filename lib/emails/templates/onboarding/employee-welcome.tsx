// ========================================
// Email: Employee Welcome (Onboarding)
// ========================================
// Bienvenida a empleado nuevo

import { Section } from '@react-email/components';
import * as React from 'react';

import {
  EmailButton,
  EmailFooter,
  EmailHeading,
  EmailLayout,
  EmailLink,
  EmailText,
} from '../../components';

interface EmployeeWelcomeEmailProps {
  empleadoNombre: string;
  empresaNombre: string;
  onboardingUrl: string;
}

export function EmployeeWelcomeEmail({
  empleadoNombre,
  empresaNombre,
  onboardingUrl,
}: EmployeeWelcomeEmailProps) {
  return (
    <EmailLayout previewText={`¡Bienvenido/a a ${empresaNombre}! Completa tus datos`}>
      <EmailHeading>
        ¡Bienvenido/a a <strong>{empresaNombre}</strong>, {empleadoNombre}!
      </EmailHeading>

      <EmailText>
        Para completar tu alta, necesitamos que completes tus datos personales y bancarios.
      </EmailText>

      <EmailText>
        <strong>Este proceso te tomará solo 2 minutos.</strong>
      </EmailText>

      <EmailText>
        Solo necesitas rellenar formularios, sin subir ningún documento.
      </EmailText>

      <EmailText className="rounded bg-[#f3f4f6] p-[15px]">
        <strong>¿Qué necesitas completar?</strong>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li>Paso 1: Datos personales (NIF, NSS, dirección, teléfono)</li>
          <li>Paso 2: Datos bancarios (IBAN)</li>
        </ul>
      </EmailText>

      <Section className="mb-[32px] mt-[32px] text-center">
        <EmailButton href={onboardingUrl}>
          Completar mis datos
        </EmailButton>
      </Section>

      <EmailText>
        O copia y pega este enlace en tu navegador:{' '}
        <EmailLink href={onboardingUrl}>{onboardingUrl}</EmailLink>
      </EmailText>

      <EmailFooter>
        <strong>Importante:</strong> Este link es válido durante 7 días. Si necesitas ayuda, contacta con RRHH.
      </EmailFooter>
    </EmailLayout>
  );
}

export default EmployeeWelcomeEmail;
