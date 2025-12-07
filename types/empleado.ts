
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
  bic?: string | null;
  salarioBaseAnual?: number | null;
  salarioBaseMensual?: number | null;
  tipoContrato?: string | null;
  puestoId?: string | null;
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
  rol: UsuarioRol;
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

export interface MiEspacioPuesto {
  id: string;
  nombre: string;
}

export interface MiEspacioJornada {
  id: string;
  etiqueta: string;
  horasSemanales: number;
  config: any; // JornadaConfig, but using any to avoid circular dependencies
}

export interface MiEspacioManager {
  id?: string;
  nombre: string;
  apellidos?: string;
}

export interface MiEspacioEquipoResumen {
  equipoId: string | null;
  nombre?: string | null;
  equipo?: {
    id: string;
    nombre: string;
  } | null;
  rol?: string | null;
}

export interface MiEspacioContratoResumen {
  id: string;
  tipoContrato: string | null;
  fechaInicio: string;
  fechaFin?: string | null;
  salarioBaseAnual?: number | null;
  documentoId?: string | null;
}

export interface MiEspacioComplementoResumen {
  id?: string;
  tipo?: string | null;
  tipoComplemento?: {
    id: string;
    nombre: string;
  } | null;
  importe?: number | null;
  importePersonalizado?: number | null;
}

export interface MiEspacioDocumento {
  id: string;
  nombre: string;
  tipoDocumento?: string | null;
  tamano?: number | null;
  createdAt?: string | null;
  mimeType?: string | null;
  firmado: boolean;
  firmadoEn?: string | null;
  firmaInfo?: {
    tieneSolicitud: boolean;
    firmado: boolean;
    firmaId?: string;
    estadoSolicitud: string;
  } | null;
}

export interface MiEspacioCarpeta {
  id: string;
  nombre: string;
  esSistema?: boolean;
  compartida?: boolean;
  documentos?: MiEspacioDocumento[];
}

export interface MiEspacioSaldoAusencia {
  id: string;
  anio: number;
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  origen?: string | null;
}

export interface MiEspacioEmpleado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  fotoUrl?: string | null;
  fechaAlta: string;
  fechaBaja?: string | null;
  fechaNacimiento?: string | null;
  nif?: string | null;
  nss?: string | null;
  telefono?: string | null;
  direccionCalle?: string | null;
  direccionNumero?: string | null;
  direccionPiso?: string | null;
  codigoPostal?: string | null;
  ciudad?: string | null;
  direccionProvincia?: string | null;
  estadoCivil?: string | null;
  numeroHijos?: number | null;
  genero?: string | null;
  iban?: string | null;
  bic?: string | null;
  puesto?: string | null;
  puestoId?: string | null;
  puestoRelacion?: MiEspacioPuesto | null;
  jornadaId?: string | null;
  jornada?: MiEspacioJornada | null;
  manager?: MiEspacioManager | null;
  tipoContrato?: string | null;
  categoriaProfesional?: string | null;
  nivelEducacion?: string | null;
  grupoCotizacion?: number | null;
  estadoEmpleado?: string | null;
  activo: boolean;
  salarioBaseAnual?: number | null;
  salarioBaseMensual?: number | null;
  numPagas?: number | string | null;
  complementos?: MiEspacioComplementoResumen[];
  contratos?: MiEspacioContratoResumen[];
  equipos?: MiEspacioEquipoResumen[];
  saldosAusencias?: MiEspacioSaldoAusencia[];
  carpetas?: MiEspacioCarpeta[];
}

export interface Puesto {
  id: string;
  nombre: string;
}
