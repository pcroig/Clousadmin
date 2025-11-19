/**
 * Constantes de rutas de la aplicación
 * Centraliza todas las rutas para evitar hardcoding de strings
 */

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

export const RUTAS_PUBLICAS = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  WAITLIST: '/waitlist',
  LANDING: '/',
} as const;

// ============================================================================
// RUTAS DE HR ADMIN
// ============================================================================

export const RUTAS_HR = {
  // Dashboard
  DASHBOARD: '/hr',

  // Empleados
  EMPLEADOS: '/hr/empleados',
  EMPLEADOS_NUEVO: '/hr/empleados/nuevo',
  EMPLEADOS_DETALLE: (id: string) => `/hr/empleados/${id}`,
  EMPLEADOS_EDITAR: (id: string) => `/hr/empleados/${id}/editar`,

  // Horarios y Asistencia
  HORARIO: '/hr/horario',
  FICHAJES: '/hr/horario/fichajes',
  AUSENCIAS: '/hr/horario/ausencias',
  JORNADAS: '/hr/horario/jornadas',

  // Documentos
  DOCUMENTOS: '/hr/documentos',
  DOCUMENTOS_NUEVO: '/hr/documentos/nuevo',
  DOCUMENTOS_PLANTILLAS: '/hr/documentos/plantillas',

  // Nóminas
  NOMINAS: '/hr/nominas',
  NOMINAS_GENERAR: '/hr/nominas/generar',
  NOMINAS_DETALLE: (id: string) => `/hr/nominas/${id}`,

  // Organización
  ORGANIZACION: '/hr/organizacion',
  DEPARTAMENTOS: '/hr/organizacion/departamentos',
  EQUIPOS: '/hr/organizacion/equipos',
  PUESTOS: '/hr/organizacion/puestos',
  SEDES: '/hr/organizacion/sedes',

  // Vacaciones
  VACACIONES: '/hr/vacaciones',
  VACACIONES_CAMPANAS: '/hr/vacaciones/campanas',

  // Configuración
  CONFIGURACION: '/hr/configuracion',
  CONFIGURACION_EMPRESA: '/hr/configuracion/empresa',
  CONFIGURACION_TIPOS_COMPLEMENTO: '/hr/configuracion/tipos-complemento',
  CONFIGURACION_FESTIVOS: '/hr/configuracion/festivos',

  // Bandeja de entrada
  BANDEJA_ENTRADA: '/hr/bandeja-entrada',

  // Auditoría
  AUDITORIA: '/hr/auditoria',

  // Analytics
  ANALYTICS: '/hr/analytics',

  // Denuncias
  DENUNCIAS: '/hr/denuncias',
} as const;

// ============================================================================
// RUTAS DE EMPLEADO
// ============================================================================

export const RUTAS_EMPLEADO = {
  // Dashboard
  DASHBOARD: '/empleado',

  // Perfil
  PERFIL: '/empleado/perfil',
  PERFIL_EDITAR: '/empleado/perfil/editar',

  // Horarios y Asistencia
  HORARIO: '/empleado/horario',
  FICHAJES: '/empleado/horario/fichajes',
  AUSENCIAS: '/empleado/horario/ausencias',
  SOLICITAR_AUSENCIA: '/empleado/horario/ausencias/solicitar',

  // Documentos
  DOCUMENTOS: '/empleado/documentos',
  DOCUMENTOS_PENDIENTES: '/empleado/documentos/pendientes',

  // Nóminas
  NOMINAS: '/empleado/nominas',
  NOMINAS_DETALLE: (id: string) => `/empleado/nominas/${id}`,

  // Vacaciones
  VACACIONES: '/empleado/vacaciones',

  // Equipo
  EQUIPO: '/empleado/equipo',

  // Denuncias
  DENUNCIAS: '/empleado/denuncias',
  DENUNCIAS_CREAR: '/empleado/denuncias/crear',
} as const;

// ============================================================================
// RUTAS DE MANAGER
// ============================================================================

export const RUTAS_MANAGER = {
  // Dashboard
  DASHBOARD: '/manager',

  // Equipo
  EQUIPO: '/manager/equipo',
  EQUIPO_MIEMBRO: (id: string) => `/manager/equipo/${id}`,

  // Horarios y Asistencia
  HORARIO: '/manager/horario',
  FICHAJES: '/manager/horario/fichajes',
  AUSENCIAS: '/manager/horario/ausencias',

  // Solicitudes
  SOLICITUDES: '/manager/solicitudes',

  // Bandeja de entrada
  BANDEJA_ENTRADA: '/manager/bandeja-entrada',

  // Reportes
  REPORTES: '/manager/reportes',
} as const;

// ============================================================================
// RUTAS DE API
// ============================================================================

export const RUTAS_API = {
  // Autenticación
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  SIGNUP: '/api/auth/signup',
  ME: '/api/auth/me',

  // Empleados
  EMPLEADOS: '/api/empleados',
  EMPLEADO: (id: string) => `/api/empleados/${id}`,

  // Fichajes
  FICHAJES: '/api/fichajes',
  FICHAJE: (id: string) => `/api/fichajes/${id}`,
  FICHAJES_ESTADO: '/api/fichajes/estado',
  FICHAJES_EVENTO: '/api/fichajes/evento',

  // Ausencias
  AUSENCIAS: '/api/ausencias',
  AUSENCIA: (id: string) => `/api/ausencias/${id}`,
  AUSENCIAS_APROBAR: (id: string) => `/api/ausencias/${id}/aprobar`,
  AUSENCIAS_RECHAZAR: (id: string) => `/api/ausencias/${id}/rechazar`,
  AUSENCIAS_SALDO: '/api/ausencias/saldo',

  // Documentos
  DOCUMENTOS: '/api/documentos',
  DOCUMENTO: (id: string) => `/api/documentos/${id}`,
  DOCUMENTOS_FIRMAR: (id: string) => `/api/documentos/${id}/firmar`,

  // Nóminas
  NOMINAS: '/api/nominas',
  NOMINA: (id: string) => `/api/nominas/${id}`,
  NOMINAS_GENERAR: '/api/nominas/generar',

  // Solicitudes
  SOLICITUDES: '/api/solicitudes',
  SOLICITUD: (id: string) => `/api/solicitudes/${id}`,
  SOLICITUDES_APROBAR: (id: string) => `/api/solicitudes/${id}/aprobar`,
  SOLICITUDES_RECHAZAR: (id: string) => `/api/solicitudes/${id}/rechazar`,

  // Notificaciones
  NOTIFICACIONES: '/api/notificaciones',
  NOTIFICACION: (id: string) => `/api/notificaciones/${id}`,
  NOTIFICACIONES_MARCAR_LEIDA: (id: string) => `/api/notificaciones/${id}/marcar-leida`,

  // Organización
  DEPARTAMENTOS: '/api/departamentos',
  EQUIPOS: '/api/equipos',
  PUESTOS: '/api/puestos',
  SEDES: '/api/sedes',

  // Denuncias
  DENUNCIAS: '/api/denuncias',
  DENUNCIA: (id: string) => `/api/denuncias/${id}`,
} as const;

// ============================================================================
// HELPERS DE NAVEGACIÓN
// ============================================================================

/**
 * Obtiene la ruta del dashboard según el rol del usuario
 * @param rol - Rol del usuario
 * @returns Ruta del dashboard correspondiente
 */
export function obtenerDashboardPorRol(
  rol: 'platform_admin' | 'hr_admin' | 'manager' | 'empleado'
): string {
  switch (rol) {
    case 'platform_admin':
    case 'hr_admin':
      return RUTAS_HR.DASHBOARD;
    case 'manager':
      return RUTAS_MANAGER.DASHBOARD;
    case 'empleado':
      return RUTAS_EMPLEADO.DASHBOARD;
    default:
      return RUTAS_PUBLICAS.LOGIN;
  }
}

/**
 * Verifica si una ruta pertenece al área de HR
 * @param ruta - Ruta a verificar
 * @returns true si es una ruta de HR
 */
export function esRutaHR(ruta: string): boolean {
  return ruta.startsWith('/hr');
}

/**
 * Verifica si una ruta pertenece al área de Empleado
 * @param ruta - Ruta a verificar
 * @returns true si es una ruta de Empleado
 */
export function esRutaEmpleado(ruta: string): boolean {
  return ruta.startsWith('/empleado');
}

/**
 * Verifica si una ruta pertenece al área de Manager
 * @param ruta - Ruta a verificar
 * @returns true si es una ruta de Manager
 */
export function esRutaManager(ruta: string): boolean {
  return ruta.startsWith('/manager');
}

/**
 * Verifica si una ruta es pública (no requiere autenticación)
 * @param ruta - Ruta a verificar
 * @returns true si es una ruta pública
 */
export function esRutaPublica(ruta: string): boolean {
  const rutasPublicas = Object.values(RUTAS_PUBLICAS);
  return rutasPublicas.includes(ruta as any);
}
