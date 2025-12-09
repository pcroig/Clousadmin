import { decodeJwt } from 'jose';

import { UsuarioRol } from '@/lib/constants/enums';

/**
 * Helper centralizado para obtener la ruta de redirección después de firmar o ver solicitudes.
 *
 * @returns La ruta del dashboard apropiada según el rol del usuario
 *
 * ### Rutas por rol:
 * - platform_admin → `/platform/invitaciones` (panel de administración de la plataforma)
 * - hr_admin → `/hr/mi-espacio` (mi espacio de HR)
 * - manager → `/manager/mi-espacio` (mi espacio de manager)
 * - empleado → `/empleado/mi-espacio` (mi espacio de empleado)
 * - fallback → `/empleado/mi-espacio` (por defecto)
 *
 * ### Notas:
 * - Platform admin NO tiene acceso a /hr/mi-espacio, su panel es /platform
 * - Esta función lee el rol desde la cookie de sesión
 * - En caso de error al decodificar, usa el fallback de empleado
 */
export function getPostFirmaRedirect(): string {
  if (typeof document === 'undefined') {
    // En servidor, usar fallback seguro
    return '/empleado/mi-espacio';
  }

  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('clousadmin-session='));

  if (!cookie) {
    return '/empleado/mi-espacio';
  }

  const token = cookie.split('=')[1];
  if (!token) {
    return '/empleado/mi-espacio';
  }

  try {
    const decoded = decodeJwt(token) as { user?: { rol?: string } };
    const rol = decoded?.user?.rol as UsuarioRol | undefined;

    // Platform admin va a su panel de administración
    if (rol === UsuarioRol.platform_admin) {
      return '/platform/invitaciones';
    }

    // HR admin va a su mi espacio
    if (rol === UsuarioRol.hr_admin) {
      return '/hr/mi-espacio';
    }

    // Manager va a su mi espacio
    if (rol === UsuarioRol.manager) {
      return '/manager/mi-espacio';
    }

    // Empleado y fallback
    return '/empleado/mi-espacio';
  } catch (error) {
    // En caso de error al decodificar token, usar fallback
    return '/empleado/mi-espacio';
  }
}
