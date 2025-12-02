// ========================================
// HR Dashboard Page - 3 Column Layout (Fits in screen)
// ========================================

import { redirect } from 'next/navigation';

import { ScrollIndicator } from '@/components/adaptive/ScrollIndicator';
import { PlantillaWidget } from '@/components/dashboard/plantilla-widget';
import { AutoCompletadoWidget } from '@/components/shared/auto-completado-widget';
import { FichajeBarMobile } from '@/components/shared/fichaje-bar-mobile';
import { FichajeWidget } from '@/components/shared/fichaje-widget';
import { NotificacionesWidget } from '@/components/shared/notificaciones-widget';
import { SolicitudesWidget } from '@/components/shared/solicitudes-widget';
import { getSession } from '@/lib/auth';
import { obtenerResumenPlantilla } from '@/lib/calculos/plantilla';
import { UsuarioRol } from '@/lib/constants/enums';
import {
  getAutoCompletadosStats,
  getNotificacionesUsuario,
  getSolicitudesAusenciasPendientes,
  getSolicitudesCambioPendientes,
} from '@/lib/queries/dashboard';
import { ensureDate } from '@/lib/utils/fechas';

import type { TipoNotificacion } from '@/lib/notificaciones';
import type { NotificacionUI } from '@/types/Notificacion';

export default async function HRDashboardPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener solicitudes pendientes (cached)
  const [ausenciasPendientes, solicitudesCambioPendientes] = await Promise.all([
    getSolicitudesAusenciasPendientes(session.user.empresaId),
    getSolicitudesCambioPendientes(session.user.empresaId),
  ]);

  // Combinar solicitudes
  const solicitudes = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(Array.isArray(ausenciasPendientes) ? ausenciasPendientes as any : []).map((aus: any) => {
      const fechaInicio = ensureDate(aus.fechaInicio);
      const fechaFin = ensureDate(aus.fechaFin);
      const periodo = `${fechaInicio.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${fechaFin.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;

      return {
        id: aus.id,
        empleado: {
          nombre: aus.empleado.nombre,
          apellidos: aus.empleado.apellidos,
          fotoUrl: aus.empleado.fotoUrl || undefined,
          email: aus.empleado.email || undefined,
          puesto: aus.empleado.puesto || undefined,
        },
        tipo: 'ausencia' as const,
        descripcion: `${aus.tipo} (${periodo})`,
        fecha: ensureDate(aus.createdAt),
        prioridad: 'media' as const,
        estadoLabel: 'Pendiente de aprobación',
      };
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(solicitudesCambioPendientes as any).map((sol: any) => ({
      id: sol.id,
      empleado: {
        nombre: sol.empleado.nombre,
        apellidos: sol.empleado.apellidos,
        fotoUrl: sol.empleado.fotoUrl || undefined,
        email: sol.empleado.email || undefined,
        puesto: sol.empleado.puesto || undefined,
        equipoNombre:
          Array.isArray(sol.empleado.equipos) && sol.empleado.equipos.length > 0
            ? sol.empleado.equipos[0]?.equipo?.nombre
            : undefined,
      },
      tipo: 'cambio_datos' as const,
      descripcion: `cambio de ${sol.tipo}`,
      fecha: ensureDate(sol.createdAt),
      prioridad: 'baja' as const,
      estadoLabel: 'Pendiente de aprobación',
    })),
  ].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  // Notificaciones reales del usuario HR actual (cached)
  const notificacionesDb = await getNotificacionesUsuario(
    session.user.empresaId,
    session.user.id
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notificaciones: NotificacionUI[] = (notificacionesDb as any).map((notif: any) => ({
    id: notif.id,
    tipo: notif.tipo as TipoNotificacion,
    mensaje: notif.mensaje,
    fecha: notif.createdAt,
    leida: notif.leida,
    metadata: (notif.metadata as NotificacionUI['metadata']) ?? undefined,
  }));

  // Resumen actual de la plantilla
  const plantillaResumen = await obtenerResumenPlantilla(session.user.empresaId);

  // Auto-completed stats (cached) - Widget muestra lo aprobado automáticamente por el sistema
  // NOTA: Las ausencias que NO requieren aprobación (enfermedad, etc.) NO se registran aquí
  // porque no hubo "aprobación automática", simplemente no necesitaban aprobación
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoCompletadosStats = await getAutoCompletadosStats(session.user.empresaId) as any;

  return (
    <>
      {/* Mobile Layout */}
      <div className="sm:hidden h-full w-full flex flex-col overflow-hidden">
        {/* Sin header "Buenos días" en mobile */}
        
        {/* Barra de fichaje compacta - sticky top */}
        <div className="flex-shrink-0 mb-3">
          <FichajeBarMobile />
        </div>

        {/* Widget de plantilla compacto - sin card */}
        <div className="flex-1 min-h-0 pb-4 overflow-auto">
          <PlantillaWidget
            trabajando={plantillaResumen.trabajando}
            enPausa={plantillaResumen.enPausa}
            ausentes={plantillaResumen.ausentes}
            sinFichar={plantillaResumen.sinFichar}
            fueraDeHorario={plantillaResumen.fueraDeHorario}
            variant="compact"
          />
          <ScrollIndicator />
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden sm:flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 mb-3 sm:mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Buenos Días, {session.user.nombre}
        </h1>
      </div>

      {/* Responsive Grid Layout */}
      <div className="flex-1 min-h-0 pb-4 sm:pb-6 overflow-auto">
        <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[1fr_1fr] gap-3 sm:gap-4">
          {/* Fichaje Widget - Fila 1 */}
          <div className="h-full min-h-[220px]">
            <FichajeWidget href="/hr/horario/fichajes" />
          </div>

          {/* Solicitudes Widget - Ocupa 2 filas en desktop */}
          <div className="row-span-1 lg:row-span-2 h-full min-h-[440px]">
            <SolicitudesWidget solicitudes={solicitudes} maxItems={8} />
          </div>

          {/* Notificaciones Widget - Fila 1 */}
          <div className="h-full min-h-[220px]">
            <NotificacionesWidget notificaciones={notificaciones} maxItems={3} href="/hr/bandeja-entrada" />
          </div>

          {/* Plantilla Widget - Fila 2 (debajo de fichajes) */}
          <div className="h-full min-h-[220px]">
            <PlantillaWidget
              trabajando={plantillaResumen.trabajando}
              enPausa={plantillaResumen.enPausa}
              ausentes={plantillaResumen.ausentes}
              sinFichar={plantillaResumen.sinFichar}
              fueraDeHorario={plantillaResumen.fueraDeHorario}
              variant="card"
            />
          </div>

          {/* Auto-completed Widget - Fila 2 */}
          <div className="h-full min-h-[220px]">
            <AutoCompletadoWidget stats={autoCompletadosStats} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
