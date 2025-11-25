// ========================================
// Email: Nómina Disponible
// ========================================
// Notificación de nómina lista para descargar

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

interface NominaDisponibleEmailProps {
  empleadoNombre: string;
  mes: string;
  año: number;
  nominaUrl: string;
}

export function NominaDisponibleEmail({
  empleadoNombre,
  mes,
  año,
  nominaUrl,
}: NominaDisponibleEmailProps) {
  return (
    <EmailLayout previewText={`Tu nómina de ${mes} ${año} está disponible`}>
      <EmailHeading>
        Tu <strong>nómina está disponible</strong>
      </EmailHeading>

      <EmailText>
        Hola {empleadoNombre},
      </EmailText>

      <EmailText>
        Tu nómina del mes de <strong>{mes} {año}</strong> ya está lista.
      </EmailText>

      <EmailText>
        Puedes consultarla y descargarla desde tu panel de nóminas.
      </EmailText>

      <Section className="mb-[32px] mt-[32px] text-center">
        <EmailButton href={nominaUrl}>
          Ver mi nómina
        </EmailButton>
      </Section>

      <EmailText>
        O copia y pega este enlace en tu navegador:{' '}
        <EmailLink href={nominaUrl}>{nominaUrl}</EmailLink>
      </EmailText>

      <EmailFooter>
        Si tienes alguna pregunta sobre tu nómina, contacta con RRHH.
      </EmailFooter>
    </EmailLayout>
  );
}

export default NominaDisponibleEmail;
