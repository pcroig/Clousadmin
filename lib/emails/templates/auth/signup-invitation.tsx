// ========================================
// Email: Signup Invitation
// ========================================
// Invitación para crear cuenta de empresa

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

interface SignupInvitationEmailProps {
  invitationUrl: string;
}

export function SignupInvitationEmail({ invitationUrl }: SignupInvitationEmailProps) {
  return (
    <EmailLayout previewText="Invitación para crear tu cuenta en Clousadmin">
      <EmailHeading>
        ¡Bienvenido a <strong>Clousadmin</strong>!
      </EmailHeading>

      <EmailText>
        Has sido invitado a crear tu cuenta y empresa en Clousadmin.
      </EmailText>

      <EmailText>
        Haz clic en el siguiente botón para comenzar:
      </EmailText>

      <Section className="mb-[32px] mt-[32px] text-center">
        <EmailButton href={invitationUrl}>
          Crear mi cuenta
        </EmailButton>
      </Section>

      <EmailText>
        O copia y pega este enlace en tu navegador:{' '}
        <EmailLink href={invitationUrl}>{invitationUrl}</EmailLink>
      </EmailText>

      <EmailFooter>
        Este enlace expirará en 7 días. Si no solicitaste esta invitación, puedes ignorar este email.
      </EmailFooter>
    </EmailLayout>
  );
}

export default SignupInvitationEmail;
