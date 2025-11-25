// ========================================
// Email: Firma Pendiente
// ========================================
// Notificación de documento pendiente de firma

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

interface FirmaPendienteEmailProps {
  empleadoNombre: string;
  documentoNombre: string;
  firmaUrl: string;
}

export function FirmaPendienteEmail({
  empleadoNombre,
  documentoNombre,
  firmaUrl,
}: FirmaPendienteEmailProps) {
  return (
    <EmailLayout previewText={`Documento pendiente de firma: ${documentoNombre}`}>
      <EmailHeading>
        Tienes un documento <strong>pendiente de firma</strong>
      </EmailHeading>

      <EmailText>
        Hola {empleadoNombre},
      </EmailText>

      <EmailText>
        Tienes un documento que requiere tu firma:
      </EmailText>

      <EmailText className="rounded bg-[#f3f4f6] p-[15px]">
        <strong>Documento:</strong> {documentoNombre}
      </EmailText>

      <EmailText>
        Por favor, revisa y firma el documento lo antes posible.
      </EmailText>

      <Section className="mb-[32px] mt-[32px] text-center">
        <EmailButton href={firmaUrl}>
          Revisar y firmar
        </EmailButton>
      </Section>

      <EmailText>
        O copia y pega este enlace en tu navegador:{' '}
        <EmailLink href={firmaUrl}>{firmaUrl}</EmailLink>
      </EmailText>

      <EmailFooter>
        Si tienes alguna pregunta sobre este documento, contacta con RRHH.
      </EmailFooter>
    </EmailLayout>
  );
}

export default FirmaPendienteEmail;
