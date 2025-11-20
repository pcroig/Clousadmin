'use client';

import { useEffect, useState } from 'react';
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
  const [open, setOpen] = useState(!!propuestaPendiente);

  useEffect(() => {
    setOpen(!!propuestaPendiente);
  }, [propuestaPendiente]);

  if (!propuestaPendiente) {
    return null;
  }

  return (
    <ResponderPropuestaModal
      open={open}
      onClose={() => setOpen(false)}
      campanaId={propuestaPendiente.id}
      campanaTitulo={propuestaPendiente.titulo}
      fechaInicioObjetivo={propuestaPendiente.fechaInicioObjetivo}
      fechaFinObjetivo={propuestaPendiente.fechaFinObjetivo}
      propuesta={propuestaPendiente.propuesta}
      onResponded={() => {
        onResponded?.();
        setOpen(false);
      }}
    />
  );
}



