'use client';

import { useState } from 'react';

import { PreferenciasVacacionesModal } from './preferencias-vacaciones-modal';

interface CampanaPendiente {
  id: string;
  titulo: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
}

interface CampanaVacacionesReminderProps {
  campanaPendiente: CampanaPendiente | null;
  autoOpen?: boolean;
  onCompleted?: () => void;
}

export function CampanaVacacionesReminder({
  campanaPendiente,
  autoOpen = true,
  onCompleted,
}: CampanaVacacionesReminderProps) {
  if (!campanaPendiente) {
    return null;
  }

  return (
    <CampanaVacacionesReminderContent
      key={`${campanaPendiente.id}-${autoOpen ? 'auto' : 'manual'}`}
      campanaPendiente={campanaPendiente}
      autoOpen={autoOpen}
      onCompleted={onCompleted}
    />
  );
}

interface CampanaVacacionesReminderContentProps {
  campanaPendiente: CampanaPendiente;
  autoOpen: boolean;
  onCompleted?: () => void;
}

function CampanaVacacionesReminderContent({
  campanaPendiente,
  autoOpen,
  onCompleted,
}: CampanaVacacionesReminderContentProps) {
  const [open, setOpen] = useState(autoOpen);

  const handleClose = () => setOpen(false);
  const handleSuccess = () => {
    setOpen(false);
    if (onCompleted) {
      onCompleted();
    } else {
      window.location.reload();
    }
  };

  return (
    <PreferenciasVacacionesModal
      open={open}
      onClose={handleClose}
      onSuccess={handleSuccess}
      campanaId={campanaPendiente.id}
      campanaTitulo={campanaPendiente.titulo}
      fechaInicioObjetivo={campanaPendiente.fechaInicioObjetivo}
      fechaFinObjetivo={campanaPendiente.fechaFinObjetivo}
    />
  );
}




