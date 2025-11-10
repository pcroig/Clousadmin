// ========================================
// Empleado Dashboard Client Component
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FichajeWidget } from '@/components/shared/fichaje-widget';
import { NotificacionesWidget, Notificacion } from '@/components/shared/notificaciones-widget';
import { AusenciasWidget, AusenciaItem } from '@/components/shared/ausencias-widget';
import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal';
import { PreferenciasVacacionesModal } from '@/components/empleado/preferencias-vacaciones-modal';

interface DashboardClientProps {
  userName: string;
  notificaciones: Notificacion[];
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
}

export function EmpleadoDashboardClient({
  userName,
  notificaciones,
  saldoFinal,
  ausenciasProximas,
  ausenciasPasadas,
  campanaPendiente,
}: DashboardClientProps) {
  const [modalAusencia, setModalAusencia] = useState(false);
  const [modalPreferencias, setModalPreferencias] = useState(!!campanaPendiente);
  const router = useRouter();

  const handleClickAusencia = (ausenciaId: string) => {
    // Por ahora navegar a la página de ausencias
    router.push('/empleado/horario/ausencias');
  };

  return (
    <>
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 mb-3 sm:mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Buenos Días, {userName}
          </h1>
        </div>

        {/* Responsive Grid Layout */}
        <div className="flex-1 min-h-0 pb-4">
          {/* Mobile: Stack vertical con solo Fichaje y Ausencias */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-4 sm:gap-5">
            {/* Fichaje Widget */}
            <div className="min-h-0">
              <FichajeWidget href="/empleado/horario/fichajes" />
            </div>

            {/* Notificaciones Widget - Hidden on mobile */}
            <div className="row-span-2 min-h-0 hidden md:block">
              <NotificacionesWidget
                notificaciones={notificaciones}
                maxItems={8}
                altura="doble"
              />
            </div>

            {/* Ausencias Widget */}
            <div className="row-span-2 min-h-0">
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

            {/* Widget vacío - Hidden on mobile */}
            <div className="min-h-0 hidden lg:block">
              {/* Por ahora vacío */}
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
          window.location.reload(); // Recargar para actualizar los datos
        }}
      />

      {/* Modal de preferencias de vacaciones (se muestra automáticamente si hay campaña pendiente) */}
      {campanaPendiente && (
        <PreferenciasVacacionesModal
          open={modalPreferencias}
          onClose={() => setModalPreferencias(false)}
          onSuccess={() => {
            setModalPreferencias(false);
            window.location.reload(); // Recargar para actualizar los datos
          }}
          campanaId={campanaPendiente.id}
          campanaTitulo={campanaPendiente.titulo}
          fechaInicioObjetivo={campanaPendiente.fechaInicioObjetivo.toISOString().split('T')[0]}
          fechaFinObjetivo={campanaPendiente.fechaFinObjetivo.toISOString().split('T')[0]}
        />
      )}
    </>
  );
}
