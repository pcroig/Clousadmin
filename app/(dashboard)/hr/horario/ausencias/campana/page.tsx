// ========================================
// Campaña de Vacaciones - Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UsuarioRol } from '@/lib/constants/enums';
import { CampanaClient } from './campana-client';

export default async function CampanaVacacionesPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const puedeGestionar =
    session.user.rol === UsuarioRol.hr_admin || session.user.rol === UsuarioRol.manager;

  if (!puedeGestionar) {
    redirect('/hr/horario/ausencias');
  }

  // Fetch the active campaign
  const campana = await prisma.campanaVacaciones.findFirst({
    where: {
      empresaId: session.user.empresaId,
      estado: 'abierta',
    },
    include: {
      preferencias: {
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              fotoUrl: true,
              email: true,
              equipos: {
                include: {
                  equipo: {
                    select: {
                      id: true,
                      nombre: true,
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          empleado: {
            nombre: 'asc',
          }
        }
      }
    }
  });

  if (!campana) {
    // No active campaign, redirect back to ausencias page
    redirect('/hr/horario/ausencias');
  }

  // Serialize dates for client component
  const campanaData = {
    id: campana.id,
    titulo: campana.titulo,
    estado: campana.estado,
    fechaInicioObjetivo: campana.fechaInicioObjetivo.toISOString().split('T')[0],
    fechaFinObjetivo: campana.fechaFinObjetivo.toISOString().split('T')[0],
    totalEmpleadosAsignados: campana.totalEmpleadosAsignados,
    empleadosCompletados: campana.empleadosCompletados,
    propuestaIA: campana.propuestaIA as Record<string, unknown> | null,
    preferencias: campana.preferencias.map(pref => ({
      id: pref.id,
      empleadoId: pref.empleadoId,
      completada: pref.completada,
      aceptada: pref.aceptada,
      cambioSolicitado: pref.cambioSolicitado,
      diasIdeales: pref.diasIdeales as string[] | null,
      diasPrioritarios: pref.diasPrioritarios as string[] | null,
      diasAlternativos: pref.diasAlternativos as string[] | null,
      propuestaIA: pref.propuestaIA as Record<string, unknown> | null,
      propuestaEmpleado: pref.propuestaEmpleado as Record<string, unknown> | null,
      empleado: {
        id: pref.empleado.id,
        nombre: pref.empleado.nombre,
        apellidos: pref.empleado.apellidos,
        fotoUrl: pref.empleado.fotoUrl,
        email: pref.empleado.email,
        equipos: pref.empleado.equipos.map(eq => ({
          equipoId: eq.equipoId,
          nombre: eq.equipo?.nombre || null,
        })),
      },
    })),
  };

  return <CampanaClient campana={campanaData} />;
}

