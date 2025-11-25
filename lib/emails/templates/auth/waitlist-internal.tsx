// ========================================
// Email: Waitlist Internal Notification
// ========================================
// Notificación interna al equipo

import * as React from 'react';

import {
  EmailFooter,
  EmailHeading,
  EmailLayout,
  EmailText,
} from '../../components';

interface WaitlistInternalEmailProps {
  email: string;
  nombre?: string;
  empresa?: string;
  mensaje?: string;
}

export function WaitlistInternalEmail({
  email,
  nombre,
  empresa,
  mensaje,
}: WaitlistInternalEmailProps) {
  return (
    <EmailLayout previewText={`Nueva solicitud de waitlist: ${empresa || email}`}>
      <EmailHeading>
        Nueva solicitud de <strong>waitlist</strong>
      </EmailHeading>

      <EmailText>
        Se ha registrado una nueva empresa interesada en Clousadmin:
      </EmailText>

      <EmailText>
        <ul style={{ paddingLeft: '20px' }}>
          <li><strong>Email:</strong> {email}</li>
          <li><strong>Nombre:</strong> {nombre || 'Sin nombre'}</li>
          <li><strong>Empresa:</strong> {empresa || 'Sin empresa'}</li>
        </ul>
      </EmailText>

      {mensaje && (
        <>
          <EmailText>
            <strong>Mensaje:</strong>
          </EmailText>
          <EmailText className="rounded bg-[#f3f4f6] p-[12px]">
            {mensaje}
          </EmailText>
        </>
      )}

      <EmailFooter>
        Puedes gestionar esta solicitud desde el panel de invitaciones del platform admin.
      </EmailFooter>
    </EmailLayout>
  );
}

export default WaitlistInternalEmail;
