// ========================================
// Authentication Types
// ========================================

import { Empleado, Usuario } from '@prisma/client';

/**
 * Roles de usuario en el sistema
 */
export enum Rol {
  HR_ADMIN = 'hr_admin',
  MANAGER = 'manager',
  EMPLEADO = 'empleado',
}

/**
 * Usuario autenticado con información adicional
 */
export interface UsuarioAutenticado extends Usuario {
  empleado?: Empleado | null;
}

/**
 * Datos de sesión del usuario
 */
export interface SessionData {
  user: {
    id: string;
    email: string;
    nombre: string;
    apellidos: string;
    rol: string;
    empresaId: string;
    empleadoId?: string | null;
    avatar?: string | null;
    activo: boolean;
  };
}

/**
 * Credenciales de login
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Datos de registro de usuario
 */
export interface RegistroUsuario {
  email: string;
  password: string;
  nombre: string;
  apellidos: string;
  empresaId: string;
  rol?: string;
}

/**
 * Token de onboarding
 */
export interface OnboardingToken {
  empleadoId: string;
  email: string;
  expiresAt: Date;
}

