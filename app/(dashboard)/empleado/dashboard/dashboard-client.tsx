// ========================================
// Empleado Dashboard Client Component
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal';
import { AusenciaItem, AusenciasWidget } from '@/components/shared/ausencias-widget';
import { FichajeWidget } from '@/components/shared/fichaje-widget';
import { NotificacionesWidget } from '@/components/shared/notificaciones-widget';
import { CampanaPropuestaReminder } from '@/components/vacaciones/campana-propuesta-reminder';
import { CampanaVacacionesReminder } from '@/components/vacaciones/campana-vacaciones-reminder';

import type { NotificacionUI } from '@/types/Notificacion';

interface DashboardClientProps {
  userName: string;
  notificaciones: NotificacionUI[];
  saldoFinal: {
    diasTotales: number;
    diasUsados: number;
  };
  ausenciasProximas: AusenciaItem[];
  ausenciasPasadas: AusenciaItem[];
  campanaPendiente?: {
    id: string;
    titulo: string;
    fechaInicioObjetivo: Date;
    fechaFinObjetivo: Date;
  } | null;
  campanaPropuesta?: {
    id: string;
    titulo: string;
    fechaInicioObjetivo: Date;
    fechaFinObjetivo: Date;
    propuesta: {
      fechaInicio: string;
      fechaFin: string;
      dias: number;
      tipo: 'ideal' | 'alternativo' | 'ajustado';
      motivo: string;
    };
  } | null;
}

export function EmpleadoDashboardClient({
  userName,
  notificaciones,
  saldoFinal,
  ausenciasProximas,
  ausenciasPasadas,
  campanaPendiente,
  campanaPropuesta,
}: DashboardClientProps) {
  const [modalAusencia, setModalAusencia] = useState(false);
  const router = useRouter();

  const reminderData = useMemo(() => {
    if (!campanaPendiente) return null;
    return {
      id: campanaPendiente.id,
      titulo: campanaPendiente.titulo,
      fechaInicioObjetivo: campanaPendiente.fechaInicioObjetivo.toISOString().split('T')[0],
      fechaFinObjetivo: campanaPendiente.fechaFinObjetivo.toISOString().split('T')[0],
    };
  }, [campanaPendiente]);

  const propuestaData = useMemo(() => {
    if (!campanaPropuesta) return null;
    return {
      id: campanaPropuesta.id,
      titulo: campanaPropuesta.titulo,
      fechaInicioObjetivo: campanaPropuesta.fechaInicioObjetivo.toISOString().split('T')[0],
      fechaFinObjetivo: campanaPropuesta.fechaFinObjetivo.toISOString().split('T')[0],
      propuesta: campanaPropuesta.propuesta,
    };
  }, [campanaPropuesta]);

  const handleClickAusencia = (ausenciaId: string) => {
    // Por ahora navegar a la página de ausencias
    router.push('/empleado/mi-espacio/ausencias');
  };

  return (
    <>
      <div className="h-full w-full flex flex-col overflow-hidden">
        {/* Header - solo desktop */}
        <div className="flex-shrink-0 mb-3 sm:mb-4 hidden sm:block">
          <h1 className="text-2xl font-bold text-gray-900">
            Buenos Días, {userName}
          </h1>
        </div>

        {/* Responsive Grid Layout */}
        <div className="flex-1 min-h-0 pb-4 sm:pb-6 overflow-auto">
          {/* Mobile: Stack vertical con solo Fichaje y Ausencias */}
          <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-3 sm:gap-4">
            {/* Fichaje Widget */}
            <div className="min-h-[240px] h-full">
              <FichajeWidget href="/empleado/mi-espacio/fichajes" />
            </div>

            {/* Notificaciones Widget - Hidden on mobile */}
            <div className="row-span-1 lg:row-span-2 min-h-[480px] h-full hidden md:block">
              <NotificacionesWidget
                notificaciones={notificaciones}
                maxItems={8}
                altura="doble"
              />
            </div>

            {/* Ausencias Widget */}
            <div className="row-span-1 lg:row-span-2 min-h-[480px] h-full">
              <AusenciasWidget
                diasAcumulados={saldoFinal.diasTotales}
                diasDisponibles={saldoFinal.diasTotales - Number(saldoFinal.diasUsados)}
                diasUtilizados={Number(saldoFinal.diasUsados)}
                proximasAusencias={ausenciasProximas}
                ausenciasPasadas={ausenciasPasadas}
                onOpenModal={() => setModalAusencia(true)}
                onClickAusencia={handleClickAusencia}
              />
            </div>

          </div>
        </div>
      </div>

      {/* Modal de solicitar ausencia */}
      <SolicitarAusenciaModal
        open={modalAusencia}
        onClose={() => setModalAusencia(false)}
        onSuccess={() => {
          setModalAusencia(false);
          router.refresh();
        }}
      />

      {!propuestaData && (
        <CampanaVacacionesReminder
          campanaPendiente={reminderData}
          onCompleted={() => router.refresh()}
        />
      )}

      <CampanaPropuestaReminder
        propuestaPendiente={propuestaData}
        onResponded={() => router.refresh()}
      />
    </>
  );
}
