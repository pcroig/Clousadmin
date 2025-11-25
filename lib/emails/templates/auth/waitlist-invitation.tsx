// ========================================
// Email: Waitlist Invitation
// ========================================
// Invitación aprobada desde waitlist

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

interface WaitlistInvitationEmailProps {
  invitationUrl: string;
}

export function WaitlistInvitationEmail({ invitationUrl }: WaitlistInvitationEmailProps) {
  return (
    <EmailLayout previewText="Tu invitación para Clousadmin está lista">
      <EmailHeading>
        ¡Buenas noticias!
      </EmailHeading>

      <EmailText>
        Tu solicitud ha sido aprobada y ahora tienes una invitación para crear tu cuenta en Clousadmin.
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
        Este enlace expirará en 7 días.
      </EmailFooter>
    </EmailLayout>
  );
}

export default WaitlistInvitationEmail;
