'use client';

import { useEffect, useState } from 'react';

import { VACACIONES_PREFERENCIAS_EVENT, type VacacionesPreferenciasEventDetail } from '@/lib/events/vacaciones';

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!campanaPendiente || !autoOpen) {
      setOpen(false);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storageKey = `clousadmin:campana-preferencias:${campanaPendiente.id}`;
      const alreadyShown = window.sessionStorage.getItem(storageKey) === 'true';

      if (!alreadyShown) {
        window.sessionStorage.setItem(storageKey, 'true');
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, [campanaPendiente, autoOpen]);

  useEffect(() => {
    if (!campanaPendiente) {
      return;
    }

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<VacacionesPreferenciasEventDetail>;
      if (customEvent.detail?.campanaId !== campanaPendiente.id) {
        return;
      }
      customEvent.detail.handled = true;
      setOpen(true);
    };

    window.addEventListener(VACACIONES_PREFERENCIAS_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(VACACIONES_PREFERENCIAS_EVENT, handler as EventListener);
    };
  }, [campanaPendiente]);

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




