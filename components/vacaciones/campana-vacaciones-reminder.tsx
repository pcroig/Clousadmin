'use client';

import { useEffect, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    if (!campanaPendiente) {
      setOpen(false);
      setAutoOpened(false);
      return;
    }

    if (autoOpen && !autoOpened) {
      setOpen(true);
      setAutoOpened(true);
    }
  }, [campanaPendiente, autoOpen, autoOpened]);

  if (!campanaPendiente) {
    return null;
  }

  return (
    <PreferenciasVacacionesModal
      open={open}
      onClose={() => setOpen(false)}
      onSuccess={() => {
        setOpen(false);
        onCompleted ? onCompleted() : window.location.reload();
      }}
      campanaId={campanaPendiente.id}
      campanaTitulo={campanaPendiente.titulo}
      fechaInicioObjetivo={campanaPendiente.fechaInicioObjetivo}
      fechaFinObjetivo={campanaPendiente.fechaFinObjetivo}
    />
  );
}



