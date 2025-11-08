
import { UsuarioRol } from '@/lib/constants/enums';
// ========================================
// Tipos para Empleados y componentes relacionados
// ========================================
// Definir tipos explícitos reduce la carga de TypeScript
// al no tener que inferir tipos de 'any'

export interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  nif?: string | null;
  numeroSeguridadSocial?: string | null;
  nss?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  codigoPostal?: string | null;
  ciudad?: string | null;
  provincia?: string | null;
  pais?: string | null;
  fechaNacimiento?: Date | null;
  fechaAlta: Date;
  estadoCivil?: string | null;
  numeroHijos?: number | null;
  fotoUrl?: string | null;
  iban?: string | null;
  titularCuenta?: string | null;
  salarioBrutoAnual?: number | null;
  salarioBrutoMensual?: number | null;
  tipoContrato?: string | null;
  puestoId?: string | null;
  departamento?: string | null;
  categoriaProfesional?: string | null;
  grupoCotizacion?: string | null;
  jornadaId?: string | null;
  diasVacaciones?: number | null;
  onboardingCompletado?: boolean;
  activo: boolean;

  // Relaciones
  jornada?: Jornada | null;
  manager?: {
    nombre: string;
    apellidos: string;
  } | null;
  fichajes?: Fichaje[];
  ausencias?: Ausencia[];
  carpetas?: Carpeta[];
}

export interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  rol: UsuarioRol.hr_admin | 'manager' | 'empleado' | 'platform_admin';
  avatar?: string | null;
  empresaId: string;
}

export interface Jornada {
  id: string;
  nombre: string;
  horasSemanales: number;
}

export interface Fichaje {
  id: string;
  fecha: Date;
  horaEntrada?: string | null;
  horaSalida?: string | null;
}

export interface Ausencia {
  id: string;
  fechaInicio: Date;
  fechaFin: Date;
  diasLaborables: number;
  estado: 'pending' | 'approved' | 'rejected';
  tipo?: string;
}

export interface Carpeta {
  id: string;
  nombre: string;
  numeroDocumentos: number;
}

export interface Puesto {
  id: string;
  nombre: string;
}
