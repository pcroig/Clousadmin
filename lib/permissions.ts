// ========================================
// RBAC - Role-Based Access Control
// ========================================
// Sistema de permisos y control de acceso basado en roles

import { SessionData } from '@/types/auth';
import { Rol } from '@/types/auth';

/**
 * Permisos disponibles en el sistema
 */
export enum Permission {
  // Empleados
  VIEW_ALL_EMPLEADOS = 'view_all_empleados',
  CREATE_EMPLEADO = 'create_empleado',
  EDIT_EMPLEADO = 'edit_empleado',
  DELETE_EMPLEADO = 'delete_empleado',
  VIEW_OWN_EMPLEADO = 'view_own_empleado',
  EDIT_OWN_EMPLEADO = 'edit_own_empleado',

  // Ausencias
  VIEW_ALL_AUSENCIAS = 'view_all_ausencias',
  APPROVE_AUSENCIA = 'approve_ausencia',
  CREATE_AUSENCIA = 'create_ausencia',
  VIEW_OWN_AUSENCIAS = 'view_own_ausencias',

  // Fichajes
  VIEW_ALL_FICHAJES = 'view_all_fichajes',
  CREATE_FICHAJE = 'create_fichaje',
  EDIT_FICHAJE = 'edit_fichaje',
  VIEW_OWN_FICHAJES = 'view_own_fichajes',

  // Documentos
  VIEW_ALL_DOCUMENTOS = 'view_all_documentos',
  UPLOAD_DOCUMENTO = 'upload_documento',
  DELETE_DOCUMENTO = 'delete_documento',
  VIEW_OWN_DOCUMENTOS = 'view_own_documentos',

  // Nóminas
  VIEW_ALL_NOMINAS = 'view_all_nominas',
  UPLOAD_NOMINA = 'upload_nomina',
  VIEW_OWN_NOMINAS = 'view_own_nominas',

  // Informes
  VIEW_INFORMES = 'view_informes',
  EXPORT_INFORMES = 'export_informes',

  // Configuración
  MANAGE_EMPRESA = 'manage_empresa',
  MANAGE_JORNADAS = 'manage_jornadas',
  MANAGE_FESTIVOS = 'manage_festivos',

  // Aprobaciones
  APPROVE_SOLICITUDES = 'approve_solicitudes',
  APPROVE_AUTO_COMPLETADOS = 'approve_auto_completados',
}

/**
 * Mapa de permisos por rol
 */
const rolePermissions: Record<string, Permission[]> = {
  [Rol.HR_ADMIN]: [
    // Todos los permisos de empleados
    Permission.VIEW_ALL_EMPLEADOS,
    Permission.CREATE_EMPLEADO,
    Permission.EDIT_EMPLEADO,
    Permission.DELETE_EMPLEADO,

    // Todos los permisos de ausencias
    Permission.VIEW_ALL_AUSENCIAS,
    Permission.APPROVE_AUSENCIA,
    Permission.CREATE_AUSENCIA,

    // Todos los permisos de fichajes
    Permission.VIEW_ALL_FICHAJES,
    Permission.CREATE_FICHAJE,
    Permission.EDIT_FICHAJE,

    // Todos los permisos de documentos
    Permission.VIEW_ALL_DOCUMENTOS,
    Permission.UPLOAD_DOCUMENTO,
    Permission.DELETE_DOCUMENTO,

    // Todos los permisos de nóminas
    Permission.VIEW_ALL_NOMINAS,
    Permission.UPLOAD_NOMINA,

    // Informes
    Permission.VIEW_INFORMES,
    Permission.EXPORT_INFORMES,

    // Configuración
    Permission.MANAGE_EMPRESA,
    Permission.MANAGE_JORNADAS,
    Permission.MANAGE_FESTIVOS,

    // Aprobaciones
    Permission.APPROVE_SOLICITUDES,
    Permission.APPROVE_AUTO_COMPLETADOS,
  ],

  [Rol.MANAGER]: [
    // Ver empleados a cargo
    Permission.VIEW_ALL_EMPLEADOS, // Con filtro de empleados a cargo
    Permission.EDIT_EMPLEADO, // Solo empleados a cargo

    // Aprobar ausencias de su equipo
    Permission.VIEW_ALL_AUSENCIAS, // Solo de su equipo
    Permission.APPROVE_AUSENCIA, // Solo de su equipo
    Permission.CREATE_AUSENCIA,

    // Ver fichajes de su equipo
    Permission.VIEW_ALL_FICHAJES, // Solo de su equipo
    Permission.CREATE_FICHAJE,
    Permission.VIEW_OWN_FICHAJES,

    // Documentos propios
    Permission.VIEW_OWN_DOCUMENTOS,

    // Nóminas propias
    Permission.VIEW_OWN_NOMINAS,

    // Aprobar solicitudes de su equipo
    Permission.APPROVE_SOLICITUDES, // Solo de su equipo
  ],

  [Rol.EMPLEADO]: [
    // Solo ver propios datos
    Permission.VIEW_OWN_EMPLEADO,
    Permission.EDIT_OWN_EMPLEADO, // Con aprobación

    // Ausencias propias
    Permission.CREATE_AUSENCIA,
    Permission.VIEW_OWN_AUSENCIAS,

    // Fichajes propios
    Permission.CREATE_FICHAJE,
    Permission.VIEW_OWN_FICHAJES,

    // Documentos propios
    Permission.VIEW_OWN_DOCUMENTOS,

    // Nóminas propias
    Permission.VIEW_OWN_NOMINAS,
  ],
};

/**
 * Verificar si un usuario tiene un permiso específico
 */
export function hasPermission(
  session: SessionData | null,
  permission: Permission
): boolean {
  if (!session) return false;

  const userRole = session.user.rol;
  const permissions = rolePermissions[userRole] || [];

  return permissions.includes(permission);
}

/**
 * Verificar múltiples permisos (requiere TODOS)
 */
export function hasAllPermissions(
  session: SessionData | null,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(session, permission));
}

/**
 * Verificar múltiples permisos (requiere AL MENOS UNO)
 */
export function hasAnyPermission(
  session: SessionData | null,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(session, permission));
}

/**
 * Obtener todos los permisos de un rol
 */
export function getRolePermissions(role: string): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Verificar si un usuario puede ver datos de otro empleado
 */
export function canViewEmpleado(
  session: SessionData | null,
  targetEmpleadoId: string
): boolean {
  if (!session) return false;

  // HR Admin puede ver todos
  if (hasPermission(session, Permission.VIEW_ALL_EMPLEADOS)) {
    return true;
  }

  // Empleado puede ver solo sus propios datos
  return session.user.empleadoId === targetEmpleadoId;
}

/**
 * Verificar si un usuario puede editar datos de otro empleado
 */
export function canEditEmpleado(
  session: SessionData | null,
  targetEmpleadoId: string,
  isManager?: boolean
): boolean {
  if (!session) return false;

  // HR Admin puede editar todos
  if (session.user.rol === Rol.HR_ADMIN) {
    return true;
  }

  // Manager puede editar empleados a cargo (se verifica en la lógica de negocio)
  if (session.user.rol === Rol.MANAGER && isManager) {
    return hasPermission(session, Permission.EDIT_EMPLEADO);
  }

  // Empleado solo puede solicitar cambios (no editar directamente)
  return false;
}

/**
 * Verificar si un usuario puede aprobar ausencias
 */
export function canApproveAusencia(
  session: SessionData | null,
  empleadoManagerId?: string
): boolean {
  if (!session) return false;

  // HR Admin puede aprobar todas
  if (session.user.rol === Rol.HR_ADMIN) {
    return true;
  }

  // Manager puede aprobar solo de su equipo
  if (session.user.rol === Rol.MANAGER && session.user.empleadoId) {
    return empleadoManagerId === session.user.empleadoId;
  }

  return false;
}

/**
 * Verificar si un usuario puede ver nóminas
 */
export function canViewNominas(
  session: SessionData | null,
  targetEmpleadoId?: string
): boolean {
  if (!session) return false;

  // HR Admin puede ver todas
  if (hasPermission(session, Permission.VIEW_ALL_NOMINAS)) {
    return true;
  }

  // Empleado solo puede ver sus propias nóminas
  if (targetEmpleadoId) {
    return session.user.empleadoId === targetEmpleadoId;
  }

  return false;
}

/**
 * Obtener descripción de un permiso
 */
export function getPermissionDescription(permission: Permission): string {
  const descriptions: Record<Permission, string> = {
    [Permission.VIEW_ALL_EMPLEADOS]: 'Ver todos los empleados',
    [Permission.CREATE_EMPLEADO]: 'Crear nuevos empleados',
    [Permission.EDIT_EMPLEADO]: 'Editar empleados',
    [Permission.DELETE_EMPLEADO]: 'Eliminar empleados',
    [Permission.VIEW_OWN_EMPLEADO]: 'Ver datos propios',
    [Permission.EDIT_OWN_EMPLEADO]: 'Editar datos propios',

    [Permission.VIEW_ALL_AUSENCIAS]: 'Ver todas las ausencias',
    [Permission.APPROVE_AUSENCIA]: 'Aprobar ausencias',
    [Permission.CREATE_AUSENCIA]: 'Crear ausencias',
    [Permission.VIEW_OWN_AUSENCIAS]: 'Ver ausencias propias',

    [Permission.VIEW_ALL_FICHAJES]: 'Ver todos los fichajes',
    [Permission.CREATE_FICHAJE]: 'Crear fichajes',
    [Permission.EDIT_FICHAJE]: 'Editar fichajes',
    [Permission.VIEW_OWN_FICHAJES]: 'Ver fichajes propios',

    [Permission.VIEW_ALL_DOCUMENTOS]: 'Ver todos los documentos',
    [Permission.UPLOAD_DOCUMENTO]: 'Subir documentos',
    [Permission.DELETE_DOCUMENTO]: 'Eliminar documentos',
    [Permission.VIEW_OWN_DOCUMENTOS]: 'Ver documentos propios',

    [Permission.VIEW_ALL_NOMINAS]: 'Ver todas las nóminas',
    [Permission.UPLOAD_NOMINA]: 'Subir nóminas',
    [Permission.VIEW_OWN_NOMINAS]: 'Ver nóminas propias',

    [Permission.VIEW_INFORMES]: 'Ver informes',
    [Permission.EXPORT_INFORMES]: 'Exportar informes',

    [Permission.MANAGE_EMPRESA]: 'Gestionar empresa',
    [Permission.MANAGE_JORNADAS]: 'Gestionar jornadas',
    [Permission.MANAGE_FESTIVOS]: 'Gestionar festivos',

    [Permission.APPROVE_SOLICITUDES]: 'Aprobar solicitudes',
    [Permission.APPROVE_AUTO_COMPLETADOS]: 'Aprobar auto-completados',
  };

  return descriptions[permission] || permission;
}

