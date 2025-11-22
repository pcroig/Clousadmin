// ========================================
// Edge-safe UsuarioRol constants
// ========================================
// Mantiene sincronización con Prisma sin importar @prisma/client,
// permitiendo usar estos valores en middleware y runtimes Edge.

export const EDGE_USUARIO_ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  HR_ADMIN: 'hr_admin',
  MANAGER: 'manager',
  EMPLEADO: 'empleado',
} as const;

export type EdgeUsuarioRol =
  (typeof EDGE_USUARIO_ROLES)[keyof typeof EDGE_USUARIO_ROLES];

export const EDGE_USUARIO_ROLES_LIST: EdgeUsuarioRol[] = [
  EDGE_USUARIO_ROLES.PLATFORM_ADMIN,
  EDGE_USUARIO_ROLES.HR_ADMIN,
  EDGE_USUARIO_ROLES.MANAGER,
  EDGE_USUARIO_ROLES.EMPLEADO,
];

export const EDGE_USUARIO_ROL_LABELS: Record<EdgeUsuarioRol, string> = {
  [EDGE_USUARIO_ROLES.PLATFORM_ADMIN]: 'Admin Plataforma',
  [EDGE_USUARIO_ROLES.HR_ADMIN]: 'Admin RR.HH.',
  [EDGE_USUARIO_ROLES.MANAGER]: 'Manager',
  [EDGE_USUARIO_ROLES.EMPLEADO]: 'Empleado',
};

export function isEdgeUsuarioRol(value: string): value is EdgeUsuarioRol {
  return EDGE_USUARIO_ROLES_LIST.includes(value as EdgeUsuarioRol);
}

