// ========================================
// Email: Password Recovery
// ========================================
// Recuperación de contraseña

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

interface PasswordRecoveryEmailProps {
  resetUrl: string;
}

export function PasswordRecoveryEmail({ resetUrl }: PasswordRecoveryEmailProps) {
  return (
    <EmailLayout previewText="Restablece tu contraseña de Clousadmin">
      <EmailHeading>
        Restablece tu contraseña
      </EmailHeading>

      <EmailText>
        Hola,
      </EmailText>

      <EmailText>
        Hemos recibido una solicitud para restablecer tu contraseña de Clousadmin.
      </EmailText>

      <EmailText>
        Si tú hiciste esta solicitud, haz clic en el siguiente botón:
      </EmailText>

      <Section className="mb-[32px] mt-[32px] text-center">
        <EmailButton href={resetUrl}>
          Restablecer contraseña
        </EmailButton>
      </Section>

      <EmailText>
        O copia y pega este enlace en tu navegador:{' '}
        <EmailLink href={resetUrl}>{resetUrl}</EmailLink>
      </EmailText>

      <EmailFooter>
        Este enlace caduca en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.
      </EmailFooter>
    </EmailLayout>
  );
}

export default PasswordRecoveryEmail;
