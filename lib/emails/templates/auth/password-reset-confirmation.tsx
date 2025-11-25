// ========================================
// Email: Password Reset Confirmation
// ========================================
// Confirmación de cambio de contraseña

import * as React from 'react';

import {
  EmailFooter,
  EmailHeading,
  EmailLayout,
  EmailLink,
  EmailText,
} from '../../components';

interface PasswordResetConfirmationEmailProps {
  loginUrl: string;
}

export function PasswordResetConfirmationEmail({ loginUrl }: PasswordResetConfirmationEmailProps) {
  return (
    <EmailLayout previewText="Tu contraseña se ha actualizado">
      <EmailHeading>
        Contraseña actualizada
      </EmailHeading>

      <EmailText>
        Hola,
      </EmailText>

      <EmailText>
        Tu contraseña de Clousadmin se ha actualizado correctamente.
      </EmailText>

      <EmailText>
        Si no fuiste tú, contacta inmediatamente con tu administrador.
      </EmailText>

      <EmailText className="mt-[24px]">
        Puedes iniciar sesión aquí: <EmailLink href={loginUrl}>{loginUrl}</EmailLink>
      </EmailText>

      <EmailFooter>
        Si tienes alguna pregunta o inquietud, no dudes en contactarnos.
      </EmailFooter>
    </EmailLayout>
  );
}

export default PasswordResetConfirmationEmail;
