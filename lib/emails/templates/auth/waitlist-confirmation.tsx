// ========================================
// Email: Waitlist Confirmation
// ========================================
// Confirmación de registro en lista de espera

import * as React from 'react';

import {
  EmailFooter,
  EmailHeading,
  EmailLayout,
  EmailText,
} from '../../components';

export function WaitlistConfirmationEmail() {
  return (
    <EmailLayout previewText="Te hemos añadido a la lista de espera">
      <EmailHeading>
        ¡Te hemos añadido a la <strong>lista de espera</strong>!
      </EmailHeading>

      <EmailText>
        Gracias por tu interés en Clousadmin.
      </EmailText>

      <EmailText>
        Hemos recibido tu solicitud y te notificaremos cuando tengamos una invitación disponible para ti.
      </EmailText>

      <EmailText>
        Mientras tanto, puedes conocer más sobre Clousadmin en nuestro sitio web.
      </EmailText>

      <EmailFooter>
        Si tienes alguna pregunta, no dudes en contactarnos.
      </EmailFooter>
    </EmailLayout>
  );
}

export default WaitlistConfirmationEmail;
