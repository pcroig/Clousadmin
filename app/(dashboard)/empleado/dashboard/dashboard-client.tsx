// ========================================
// Empleado Dashboard Client Component
// ========================================

'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { EditarAusenciaModal } from '@/components/ausencias/editar-ausencia-modal';
import { PlantillaWidget } from '@/components/dashboard/plantilla-widget';
import { SolicitarAusenciaModal } from '@/components/empleado/solicitar-ausencia-modal';
import { DashboardMobileHeader } from '@/components/layout/dashboard-mobile-header';
import { AusenciaItem, AusenciasWidget } from '@/components/shared/ausencias-widget';
import { FichajeWidget } from '@/components/shared/fichaje-widget';
import { NotificacionesWidget } from '@/components/shared/notificaciones-widget';
import { CampanaPropuestaReminder } from '@/components/vacaciones/campana-propuesta-reminder';
import { CampanaVacacionesReminder } from '@/components/vacaciones/campana-vacaciones-reminder';
import { UsuarioRol } from '@/lib/constants/enums';

import type { PlantillaResumen } from '@/lib/calculos/plantilla';
import type { NotificacionUI } from '@/types/Notificacion';

interface DashboardClientProps {
  userName: string;
  userEmail: string;
  userAvatar?: string | null;
  empleado: {
    nombre: string;
    apellidos: string;
    puesto: string | null;
    id: string;
  };
  notificaciones: NotificacionUI[];
  notificacionesCount: number;
  saldoFinal: {
    diasTotales: number;
    diasUsados: number;
    diasDesdeHorasCompensadas: number;
    horasCompensadas: number;
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
  equipoResumen: PlantillaResumen | null;
}

export function EmpleadoDashboardClient({
  userName,
  userEmail,
  userAvatar,
  empleado,
  notificaciones,
  notificacionesCount,
  saldoFinal,
  ausenciasProximas,
  ausenciasPasadas,
  campanaPendiente,
  campanaPropuesta,
  equipoResumen,
}: DashboardClientProps) {
  const [modalAusencia, setModalAusencia] = useState(false);
  const [ausenciaParaEditar, setAusenciaParaEditar] = useState<AusenciaItem | null>(null);
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
    // Buscar la ausencia en las listas
    const ausencia = 
      ausenciasProximas.find(a => a.id === ausenciaId) ||
      ausenciasPasadas.find(a => a.id === ausenciaId);
    
    if (ausencia) {
      // Si es una ausencia futura, abrir modal de edición
      const esFutura = new Date(ausencia.fecha) > new Date();
      if (esFutura) {
        setAusenciaParaEditar(ausencia);
      } else {
        // Si es pasada, navegar a la página de ausencias para ver detalles
        router.push('/empleado/mi-espacio/ausencias');
      }
    }
  };

  return (
    <>
      <div className="h-full w-full flex flex-col overflow-hidden">
        {/* Mobile Header - Avatar + Bandeja */}
        <DashboardMobileHeader
          usuario={{
            nombre: empleado.nombre,
            apellidos: empleado.apellidos,
            email: userEmail,
            avatar: userAvatar,
          }}
          rol={UsuarioRol.empleado}
          notificacionesCount={notificacionesCount}
        />

        {/* Header - solo desktop */}
        <div className="flex-shrink-0 mb-3 sm:mb-4 hidden sm:block">
          <h1 className="text-2xl font-bold text-gray-900">
            Buenos Días, {userName}
          </h1>
        </div>

        {/* Responsive Layout */}
        <div className="flex-1 min-h-0 pb-4 sm:pb-6 overflow-auto">
          {/* MOBILE Layout - Contenido en cards */}
          <div className="sm:hidden space-y-3">
            {/* Widgets */}
            <div>
              <FichajeWidget href="/empleado/mi-espacio/fichajes" />
            </div>

            {/* Plantilla Widget */}
            {equipoResumen && (
              <div>
                <PlantillaWidget
                  trabajando={equipoResumen.trabajando}
                  enPausa={equipoResumen.enPausa}
                  ausentes={equipoResumen.ausentes}
                  sinFichar={equipoResumen.sinFichar}
                  fueraDeHorario={equipoResumen.fueraDeHorario}
                  rol="empleado"
                />
              </div>
            )}
          </div>

          {/* DESKTOP Grid Layout */}
          <div className="hidden sm:grid h-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr gap-4">
            {/* Fichaje Widget */}
            <div className="min-h-[240px] h-full">
              <FichajeWidget href="/empleado/mi-espacio/fichajes" />
            </div>

            {/* Notificaciones Widget */}
            <div className="row-span-1 lg:row-span-2 min-h-[480px] h-full">
              <NotificacionesWidget
                notificaciones={notificaciones}
                maxItems={8}
                altura="doble"
              />
            </div>

            {/* Ausencias Widget - Solo Desktop */}
            <div className="row-span-1 lg:row-span-2 min-h-[480px] h-full">
              <AusenciasWidget
                diasAcumulados={saldoFinal.diasTotales}
                diasDisponibles={saldoFinal.diasTotales - Number(saldoFinal.diasUsados)}
                diasUtilizados={Number(saldoFinal.diasUsados)}
                diasDesdeHorasCompensadas={saldoFinal.diasDesdeHorasCompensadas}
                horasCompensadas={saldoFinal.horasCompensadas}
                proximasAusencias={ausenciasProximas}
                ausenciasPasadas={ausenciasPasadas}
                onOpenModal={() => setModalAusencia(true)}
                onClickAusencia={handleClickAusencia}
              />
            </div>

            {/* Plantilla Widget */}
            {equipoResumen && (
              <div className="min-h-[240px] h-full">
                <PlantillaWidget
                  trabajando={equipoResumen.trabajando}
                  enPausa={equipoResumen.enPausa}
                  ausentes={equipoResumen.ausentes}
                  sinFichar={equipoResumen.sinFichar}
                  fueraDeHorario={equipoResumen.fueraDeHorario}
                  rol="empleado"
                />
              </div>
            )}
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
        contexto="empleado"
      />

      {/* Modal de editar ausencia */}
      {ausenciaParaEditar && (
        <EditarAusenciaModal
          open={Boolean(ausenciaParaEditar)}
          ausencia={{
            id: ausenciaParaEditar.id,
            empleadoId: ausenciaParaEditar.empleadoId ?? empleado.id,
            tipo: ausenciaParaEditar.tipo,
            fechaInicio: ausenciaParaEditar.fecha.toISOString(),
            fechaFin: ausenciaParaEditar.fechaFin?.toISOString() || ausenciaParaEditar.fecha.toISOString(),
            createdAt: ausenciaParaEditar.createdAt ?? new Date().toISOString(),
            medioDia: ausenciaParaEditar.medioDia ?? false,
            periodo: (ausenciaParaEditar.periodo as string | null) ?? null,
            estado: ausenciaParaEditar.estado as string,
            motivo: ausenciaParaEditar.motivo ?? null,
            justificanteUrl: ausenciaParaEditar.justificanteUrl ?? null,
            documentoId: ausenciaParaEditar.documentoId ?? null,
            empleado: {
              nombre: empleado.nombre,
              apellidos: empleado.apellidos,
              puesto: empleado.puesto ?? 'Empleado',
            },
          }}
          onClose={() => setAusenciaParaEditar(null)}
          onSuccess={() => {
            setAusenciaParaEditar(null);
            router.refresh();
          }}
          contexto="empleado"
        />
      )}

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
