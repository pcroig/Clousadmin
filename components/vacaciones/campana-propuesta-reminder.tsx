'use client';

import { useState } from 'react';

import { ResponderPropuestaModal } from '@/components/empleado/responder-propuesta-modal';

interface CampanaPropuestaInfo {
  id: string;
  titulo: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
  propuesta: {
    fechaInicio: string;
    fechaFin: string;
    dias: number;
    tipo: 'ideal' | 'alternativo' | 'ajustado';
    motivo: string;
  };
}

interface CampanaPropuestaReminderProps {
  propuestaPendiente: CampanaPropuestaInfo | null;
  onResponded?: () => void;
}

export function CampanaPropuestaReminder({
  propuestaPendiente,
  onResponded,
}: CampanaPropuestaReminderProps) {
  if (!propuestaPendiente) {
    return null;
  }

  return (
    <CampanaPropuestaReminderContent
      key={propuestaPendiente.id}
      propuestaPendiente={propuestaPendiente}
      onResponded={onResponded}
    />
  );
}

interface CampanaPropuestaReminderContentProps {
  propuestaPendiente: CampanaPropuestaInfo;
  onResponded?: () => void;
}

function CampanaPropuestaReminderContent({
  propuestaPendiente,
  onResponded,
}: CampanaPropuestaReminderContentProps) {
  const [open, setOpen] = useState(true);

  const handleClose = () => setOpen(false);
  const handleResponded = () => {
    if (onResponded) {
      onResponded();
    } else {
      window.location.reload();
    }
    setOpen(false);
  };

  return (
    <ResponderPropuestaModal
      open={open}
      onClose={handleClose}
      campanaId={propuestaPendiente.id}
      campanaTitulo={propuestaPendiente.titulo}
      fechaInicioObjetivo={propuestaPendiente.fechaInicioObjetivo}
      fechaFinObjetivo={propuestaPendiente.fechaFinObjetivo}
      propuesta={propuestaPendiente.propuesta}
      onResponded={handleResponded}
    />
  );
}




