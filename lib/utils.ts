import { type Decimal } from '@prisma/client/runtime/library';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import type {
  MiEspacioCarpeta,
  MiEspacioComplementoResumen,
  MiEspacioContratoResumen,
  MiEspacioDocumento,
  MiEspacioEmpleado,
  MiEspacioEquipoResumen,
  MiEspacioJornada,
  MiEspacioManager,
  MiEspacioPuesto,
  MiEspacioSaldoAusencia,
} from '@/types/empleado';

/**
 * Combina clases de Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type DecimalLike = Decimal | number | string | null | undefined;

/**
 * Serializa un objeto Decimal (o variantes similares) a number
 */
export function decimalToNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  try {
    if (typeof value === 'object' && value !== null && 'toNumber' in value && typeof value.toNumber === 'function') {
      const parsed = value.toNumber();
      return Number.isFinite(parsed) ? parsed : null;
    }
    const parsed = Number((value as Decimal).toString());
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === 'object' && input !== null;

const toISODateString = (value: unknown): string | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  try {
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  } catch {
    return null;
  }
};

/**
 * Convierte una fecha a formato ISO solo fecha (YYYY-MM-DD)
 * Útil para comparar fechas sin considerar la hora
 */
export function toDateOnlyString(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString().split('T')[0];
}

const mapManager = (input: unknown): MiEspacioManager | null => {
  if (!isRecord(input)) return null;
  const nombre = typeof input.nombre === 'string' ? input.nombre : '';
  const apellidos = typeof input.apellidos === 'string' ? input.apellidos : undefined;
  if (!nombre && !apellidos) return null;

  return {
    id: typeof input.id === 'string' ? input.id : undefined,
    nombre,
    apellidos,
  };
};

const mapJornada = (input: unknown): MiEspacioJornada | null => {
  if (!isRecord(input)) return null;
  const id = typeof input.id === 'string' ? input.id : 'sin-id';
  // Accept both 'etiqueta' and 'nombre' for backward compatibility
  const etiqueta =
    (typeof input.etiqueta === 'string' ? input.etiqueta : null) ||
    (typeof input.nombre === 'string' ? input.nombre : null) ||
    '';
  const horasSemanales = decimalToNumber(input.horasSemanales as DecimalLike) ?? 0;
  const config = input.config ?? null;
  return {
    id,
    etiqueta,
    horasSemanales,
    config,
  };
};

const mapPuesto = (input: unknown): MiEspacioPuesto | null => {
  if (!isRecord(input)) return null;
  if (typeof input.id !== 'string' || typeof input.nombre !== 'string') {
    return null;
  }
  return {
    id: input.id,
    nombre: input.nombre,
  };
};

const mapContratos = (input: unknown): MiEspacioContratoResumen[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter(isRecord)
    .map<MiEspacioContratoResumen>((contrato) => ({
      id: typeof contrato.id === 'string' ? contrato.id : '',
      tipoContrato: typeof contrato.tipoContrato === 'string' ? contrato.tipoContrato : null,
      fechaInicio: toISODateString(contrato.fechaInicio) ?? '',
      fechaFin: toISODateString(contrato.fechaFin),
      salarioBaseAnual: decimalToNumber(contrato.salarioBaseAnual as DecimalLike),
      documentoId: typeof contrato.documentoId === 'string' ? contrato.documentoId : undefined,
    }));
};

const mapComplementos = (input: unknown): MiEspacioComplementoResumen[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter(isRecord)
    .map<MiEspacioComplementoResumen>((complemento) => ({
      id: typeof complemento.id === 'string' ? complemento.id : undefined,
      tipo: typeof complemento.tipo === 'string' ? complemento.tipo : undefined,
      importe: decimalToNumber(complemento.importe as DecimalLike),
      importePersonalizado: decimalToNumber(complemento.importePersonalizado as DecimalLike),
      tipoComplemento: isRecord(complemento.tipoComplemento) &&
        typeof complemento.tipoComplemento.id === 'string' &&
        typeof complemento.tipoComplemento.nombre === 'string'
          ? {
              id: complemento.tipoComplemento.id,
              nombre: complemento.tipoComplemento.nombre,
            }
          : undefined,
    }));
};

const mapEquipos = (input: unknown): MiEspacioEquipoResumen[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter(isRecord)
    .map<MiEspacioEquipoResumen>((equipo) => {
      const nestedEquipo = isRecord(equipo.equipo) ? equipo.equipo : null;
      const equipoId =
        typeof equipo.equipoId === 'string'
          ? equipo.equipoId
          : (nestedEquipo && typeof nestedEquipo.id === 'string' ? nestedEquipo.id : null);
      const nombre =
        nestedEquipo && typeof nestedEquipo.nombre === 'string'
          ? nestedEquipo.nombre
          : typeof equipo.nombre === 'string'
            ? equipo.nombre
            : null;

      return {
        equipoId,
        nombre,
        equipo:
          nestedEquipo && typeof nestedEquipo.id === 'string' && typeof nestedEquipo.nombre === 'string'
            ? { id: nestedEquipo.id, nombre: nestedEquipo.nombre }
            : null,
        rol: typeof equipo.rol === 'string' ? equipo.rol : undefined,
      };
    });
};

const mapDocumentos = (input: unknown): MiEspacioDocumento[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter(isRecord)
    .map<MiEspacioDocumento>((documento) => ({
      id: typeof documento.id === 'string' ? documento.id : '',
      nombre: typeof documento.nombre === 'string' ? documento.nombre : '',
      tipoDocumento: typeof documento.tipoDocumento === 'string' ? documento.tipoDocumento : undefined,
      tamano: typeof documento.tamano === 'number' ? documento.tamano : decimalToNumber(documento.tamano as DecimalLike),
      createdAt: toISODateString(documento.createdAt),
      firmado: typeof documento.firmado === 'boolean' ? documento.firmado : false,
      firmadoEn: toISODateString(documento.firmadoEn),
      firmaInfo: null,
    }));
};

const mapCarpetas = (input: unknown): MiEspacioCarpeta[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter(isRecord)
    .map<MiEspacioCarpeta>((carpeta) => ({
      id: typeof carpeta.id === 'string' ? carpeta.id : '',
      nombre: typeof carpeta.nombre === 'string' ? carpeta.nombre : '',
      esSistema: typeof carpeta.esSistema === 'boolean' ? carpeta.esSistema : undefined,
      compartida: typeof carpeta.compartida === 'boolean' ? carpeta.compartida : undefined,
      documentos: mapDocumentos(carpeta.documentos),
    }));
};

const mapSaldosAusencias = (input: unknown): MiEspacioSaldoAusencia[] | undefined => {
  if (!Array.isArray(input)) return undefined;
  return input
    .filter(isRecord)
    .map<MiEspacioSaldoAusencia>((saldo) => ({
      id: typeof saldo.id === 'string' ? saldo.id : '',
      anio:
        typeof (saldo as { anio?: unknown }).anio === 'number'
          ? (saldo as { anio?: number }).anio!
          : typeof (saldo as { anio?: unknown }).anio === 'string'
            ? Number((saldo as { anio?: string }).anio) || new Date().getFullYear()
            : typeof (saldo as { año?: unknown }).año === 'number'
              ? (saldo as { año?: number }).año!
              : Number((saldo as { año?: string }).año) || new Date().getFullYear(),
      diasTotales:
        typeof saldo.diasTotales === 'number' ? saldo.diasTotales : Number(saldo.diasTotales) || 0,
      diasUsados: decimalToNumber(saldo.diasUsados as DecimalLike) ?? 0,
      diasPendientes: decimalToNumber(saldo.diasPendientes as DecimalLike) ?? 0,
      origen: typeof saldo.origen === 'string' ? saldo.origen : undefined,
    }));
};

const normalizeNumeroHijos = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeGrupoCotizacion = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeNumPagas = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  return null;
};

/**
 * Serializa campos Decimal y estructuras anidadas de un empleado
 * para su consumo desde Client Components.
 */
export function serializeEmpleado<T extends Record<string, unknown>>(empleado: T): MiEspacioEmpleado {
  const base: MiEspacioEmpleado = {
    id: typeof empleado.id === 'string' ? empleado.id : '',
    nombre: typeof empleado.nombre === 'string' ? empleado.nombre : '',
    apellidos: typeof empleado.apellidos === 'string' ? empleado.apellidos : '',
    email: typeof empleado.email === 'string' ? empleado.email : '',
    activo: typeof empleado.activo === 'boolean' ? empleado.activo : true,
    fechaAlta: toISODateString(empleado.fechaAlta) ?? '',
    fechaBaja: toISODateString(empleado.fechaBaja),
    fechaNacimiento: toISODateString(empleado.fechaNacimiento),
    nif: typeof empleado.nif === 'string' ? empleado.nif : null,
    nss: typeof empleado.nss === 'string' ? empleado.nss : null,
    telefono: typeof empleado.telefono === 'string' ? empleado.telefono : null,
    direccionCalle: typeof empleado.direccionCalle === 'string' ? empleado.direccionCalle : null,
    direccionNumero: typeof empleado.direccionNumero === 'string' ? empleado.direccionNumero : null,
    direccionPiso: typeof empleado.direccionPiso === 'string' ? empleado.direccionPiso : null,
    codigoPostal: typeof empleado.codigoPostal === 'string' ? empleado.codigoPostal : null,
    ciudad: typeof empleado.ciudad === 'string' ? empleado.ciudad : null,
    direccionProvincia: typeof empleado.direccionProvincia === 'string' ? empleado.direccionProvincia : null,
    estadoCivil: typeof empleado.estadoCivil === 'string' ? empleado.estadoCivil : null,
    numeroHijos: normalizeNumeroHijos(empleado.numeroHijos),
    genero: typeof empleado.genero === 'string' ? empleado.genero : null,
    iban: typeof empleado.iban === 'string' ? empleado.iban : null,
    bic: typeof empleado.bic === 'string' ? empleado.bic : null,
    puesto: typeof empleado.puesto === 'string' ? empleado.puesto : null,
    puestoId: typeof empleado.puestoId === 'string' ? empleado.puestoId : null,
    tipoContrato: typeof empleado.tipoContrato === 'string' ? empleado.tipoContrato : null,
    categoriaProfesional:
      typeof empleado.categoriaProfesional === 'string' ? empleado.categoriaProfesional : null,
    grupoCotizacion: normalizeGrupoCotizacion(empleado.grupoCotizacion),
    estadoEmpleado: typeof empleado.estadoEmpleado === 'string' ? empleado.estadoEmpleado : null,
    salarioBaseAnual: decimalToNumber(empleado.salarioBaseAnual as DecimalLike),
    salarioBaseMensual: decimalToNumber(empleado.salarioBaseMensual as DecimalLike),
    numPagas: normalizeNumPagas(empleado.numPagas),
    jornadaId: typeof empleado.jornadaId === 'string' ? empleado.jornadaId : null,
    jornada: mapJornada(empleado.jornada),
    manager: mapManager(empleado.manager),
    puestoRelacion: mapPuesto(empleado.puestoRelacion),
    complementos: mapComplementos(empleado.complementos),
    contratos: mapContratos(empleado.contratos),
    equipos: mapEquipos(empleado.equipos),
    saldosAusencias: mapSaldosAusencias(empleado.saldosAusencias),
    carpetas: mapCarpetas(empleado.carpetas),
    fotoUrl: typeof empleado.fotoUrl === 'string' ? empleado.fotoUrl : null,
  };

  return base;
}
