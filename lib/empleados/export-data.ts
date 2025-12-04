// ========================================
// Empleado Export Utilities
// ========================================

import * as XLSX from 'xlsx';

import { obtenerLogAuditoria } from '@/lib/auditoria';
import { decryptEmpleadoData } from '@/lib/empleado-crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

type FichajeWithEventos = {
  id: string;
  fecha: Date;
  estado: string;
  horasTrabajadas: number | null;
  eventos: Array<{
    id: string;
    tipo: string;
    hora: Date | string | null;
    ubicacion: string | null;
  }>;
};

type ContratoResumen = {
  id: string;
  fechaInicio: Date | string | null;
  fechaFin: Date | string | null;
  tipoContrato: string;
  salarioBaseAnual: number | null;
};

export interface EmpleadoExportData {
  empleado: ReturnType<typeof decryptEmpleadoData>;
  usuario: {
    id: string | null;
    email: string | null;
    rol: string | null;
    ultimoAcceso: Date | string | null;
    activo: boolean | null;
  };
  equipos: Array<{ id: string; nombre: string }>;
  ausencias: Array<{
    id: string;
    tipo: string;
    fechaInicio: Date | string | null;
    fechaFin: Date | string | null;
    diasLaborables: number | null;
    estado: string;
    motivo: string | null;
  }>;
  fichajes: FichajeWithEventos[];
  contratos: ContratoResumen[];
  documentos: Array<{
    id: string;
    nombre: string;
    tipoDocumento: string;
    carpetaId: string | null;
    createdAt: Date | string;
  }>;
  auditoria: Awaited<ReturnType<typeof obtenerLogAuditoria>>;
}

const DATE_TIME_COLUMNS = new Set([
  'fecha',
  'fechaInicio',
  'fechaFin',
  'fechaAlta',
  'fechaBaja',
  'createdAt',
  'updatedAt',
  'ultimoAcceso',
  'horarioEntrada',
  'horarioSalida',
  'hora',
  'completadaEn',
]);

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toISOString();
}

function normalizeValue(value: unknown): string | number | null | undefined {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  // Type guard para objetos con método toNumber (ej. Decimal de Prisma)
  const valueWithToNumber = value as { toNumber?: () => number } | null;
  if (valueWithToNumber && typeof valueWithToNumber.toNumber === 'function') {
    try {
      return valueWithToNumber.toNumber();
    } catch {
      return Number(String(value));
    }
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  return String(value);
}

function sanitizeRecord<T extends Record<string, unknown>>(record: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value === null || typeof value === 'undefined') {
      result[key] = '';
      continue;
    }

    if (DATE_TIME_COLUMNS.has(key)) {
      result[key] = formatDate(value as Date | string);
      continue;
    }

    // Type guard para objetos con método toNumber (ej. Decimal de Prisma)
    const valueWithToNumber = value as { toNumber?: () => number } | null;
    if (valueWithToNumber && typeof valueWithToNumber.toNumber === 'function') {
      try {
        result[key] = valueWithToNumber.toNumber();
      } catch {
        result[key] = Number(String(value));
      }
      continue;
    }

    result[key] = value;
  }

  return result;
}

function sheetFromJson(data: Record<string, unknown>[], _sheetName: string): XLSX.WorkSheet {
  if (!data.length) {
    return XLSX.utils.aoa_to_sheet([
      ['Mensaje'],
      ['Sin registros'],
    ]);
  }

  return XLSX.utils.json_to_sheet(data, { skipHeader: false });
}

export async function loadEmpleadoExportData(
  prisma: PrismaClient,
  params: { empresaId: string; empleadoId: string }
): Promise<EmpleadoExportData | null> {
  const empleadoQuery = {
    where: {
      id: params.empleadoId,
      empresaId: params.empresaId,
    },
    include: {
      usuario: true,
      equipos: {
        include: {
          equipo: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
      ausencias: {
        select: {
          id: true,
          tipo: true,
          fechaInicio: true,
          fechaFin: true,
          diasLaborables: true,
          estado: true,
          motivo: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 200,
      },
      fichajes: {
        select: {
          id: true,
          fecha: true,
          estado: true,
          horasTrabajadas: true,
          createdAt: true,
          eventos: {
            select: {
              id: true,
              tipo: true,
              hora: true,
              ubicacion: true,
            },
          },
        },
        orderBy: {
          fecha: 'desc',
        },
        take: 120,
      },
      documentos: {
        select: {
          id: true,
          nombre: true,
          tipoDocumento: true,
          createdAt: true,
          documento_carpetas: {
            include: {
              carpeta: {
                select: {
                  id: true,
                  nombre: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 200,
      },
      contratos: {
        select: {
          id: true,
          fechaInicio: true,
          fechaFin: true,
          tipoContrato: true,
          salarioBaseAnual: true,
          createdAt: true,
        },
        orderBy: {
          fechaInicio: 'desc',
        },
        take: 50,
      },
    },
  } satisfies Prisma.empleadosFindFirstArgs;

  const empleado = await prisma.empleados.findFirst(empleadoQuery);

  if (!empleado) {
    return null;
  }

  const empleadoDesencriptado = decryptEmpleadoData(empleado);

  const auditoria = await obtenerLogAuditoria(params.empresaId, empleado.id, {
    limite: 50,
  });

  return {
    empleado: empleadoDesencriptado,
    usuario: {
      id: empleado.usuario?.id ?? null,
      email: empleado.usuario?.email ?? null,
      rol: empleado.usuario?.rol ?? null,
      ultimoAcceso: empleado.usuario?.ultimoAcceso ?? null,
      activo: empleado.usuario?.activo ?? null,
    },
    equipos: empleado.equipos.map((eq) => ({
      id: eq.equipo.id,
      nombre: eq.equipo.nombre,
    })),
    ausencias: empleado.ausencias,
    fichajes: empleado.fichajes as unknown as FichajeWithEventos[],
    contratos: empleado.contratos as unknown as ContratoResumen[],
    documentos: empleado.documentos.map(doc => ({
      id: doc.id,
      nombre: doc.nombre,
      tipoDocumento: doc.tipoDocumento,
      carpetaId: doc.documento_carpetas[0]?.carpetaId || null,
      createdAt: doc.createdAt,
    })),
    auditoria,
  };
}

export function buildEmpleadoExcelBuffer(data: EmpleadoExportData): Buffer {
  const workbook = XLSX.utils.book_new();

  // Perfil Sheet
  const empleado = data.empleado as Partial<import('@prisma/client').empleados>;
  const perfilEntries: (string | number | null | undefined)[][] = [
    ['ID', empleado.id],
    ['Nombre', empleado.nombre],
    ['Apellidos', empleado.apellidos],
    ['Email', empleado.email],
    ['Empresa ID', empleado.empresaId],
    ['Fecha Alta', formatDate(empleado.fechaAlta as Date | string | null | undefined)],
    ['Fecha Baja', formatDate(empleado.fechaBaja as Date | string | null | undefined)],
    ['Puesto', empleado.puesto],
    ['Estado empleado', empleado.estadoEmpleado],
    ['IBAN', empleado.iban || ''],
    ['NIF', empleado.nif || ''],
    ['NSS', empleado.nss || ''],
    ['Salario base anual', normalizeValue(empleado.salarioBaseAnual)],
    ['Teléfono', empleado.telefono || ''],
    ['Dirección', `${empleado.direccionCalle ?? ''} ${empleado.direccionNumero ?? ''}`.trim()],
    ['Ciudad', empleado.ciudad ?? ''],
    ['Provincia', empleado.direccionProvincia ?? ''],
    ['Código Postal', empleado.codigoPostal ?? ''],
  ];
  const perfilSheet = XLSX.utils.aoa_to_sheet([['Campo', 'Valor'], ...perfilEntries]);
  XLSX.utils.book_append_sheet(workbook, perfilSheet, 'Perfil');

  // Usuario Sheet
  const usuarioSheet = XLSX.utils.aoa_to_sheet([
    ['Campo', 'Valor'],
    ['Usuario ID', data.usuario.id ?? ''],
    ['Email', data.usuario.email ?? ''],
    ['Rol', data.usuario.rol ?? ''],
    ['Activo', data.usuario.activo ? 'Sí' : 'No'],
    ['Último acceso', formatDate(data.usuario.ultimoAcceso)],
  ]);
  XLSX.utils.book_append_sheet(workbook, usuarioSheet, 'Usuario');

  // Equipos
  const equiposSheet = sheetFromJson(
    data.equipos.map((eq) => ({
      ID: eq.id,
      Nombre: eq.nombre,
    })),
    'Equipos'
  );
  XLSX.utils.book_append_sheet(workbook, equiposSheet, 'Equipos');

  // Ausencias
  const ausenciasSheet = sheetFromJson(
    data.ausencias.map((ausencia) =>
      sanitizeRecord({
        ID: ausencia.id,
        Tipo: ausencia.tipo,
        FechaInicio: ausencia.fechaInicio,
        FechaFin: ausencia.fechaFin,
        DiasLaborables: ausencia.diasLaborables,
        Estado: ausencia.estado,
        Motivo: ausencia.motivo,
      })
    ),
    'Ausencias'
  );
  XLSX.utils.book_append_sheet(workbook, ausenciasSheet, 'Ausencias');

  // Fichajes
  const fichajesSheet = sheetFromJson(
    data.fichajes.map((fichaje) =>
      sanitizeRecord({
        ID: fichaje.id,
        Fecha: fichaje.fecha,
        Estado: fichaje.estado,
        HorasTrabajadas: fichaje.horasTrabajadas,
        NumeroEventos: fichaje.eventos.length,
      })
    ),
    'Fichajes'
  );
  XLSX.utils.book_append_sheet(workbook, fichajesSheet, 'Fichajes');

  // Eventos de Fichajes
  const eventosSheet = sheetFromJson(
    data.fichajes.flatMap((fichaje) =>
      fichaje.eventos.map((evento) =>
        sanitizeRecord({
          FichajeID: fichaje.id,
          EventoID: evento.id,
          Tipo: evento.tipo,
          Hora: evento.hora,
          Ubicacion: evento.ubicacion,
        })
      )
    ),
    'EventosFichajes'
  );
  XLSX.utils.book_append_sheet(workbook, eventosSheet, 'EventosFichajes');

  // Contratos
  const contratosSheet = sheetFromJson(
    data.contratos.map((contrato) =>
      sanitizeRecord({
        ID: contrato.id,
        Tipo: contrato.tipoContrato,
        FechaInicio: contrato.fechaInicio,
        FechaFin: contrato.fechaFin,
        SalarioBrutoAnual: contrato.salarioBaseAnual,
        SalarioBrutoMensual: contrato.salarioBaseAnual
          ? Number(contrato.salarioBaseAnual) / 12
          : '',
      })
    ),
    'Contratos'
  );
  XLSX.utils.book_append_sheet(workbook, contratosSheet, 'Contratos');

  // Documentos
  const documentosSheet = sheetFromJson(
    data.documentos.map((doc) =>
      sanitizeRecord({
        ID: doc.id,
        Nombre: doc.nombre,
        TipoDocumento: doc.tipoDocumento,
        CarpetaID: doc.carpetaId,
        CreadoEn: doc.createdAt,
      })
    ),
    'Documentos'
  );
  XLSX.utils.book_append_sheet(workbook, documentosSheet, 'Documentos');

  // Auditoría
  const auditoriaSheet = sheetFromJson(
    data.auditoria.map((log) =>
      sanitizeRecord({
        ID: log.id,
        Accion: log.accion,
        Recurso: log.recurso,
        Motivo: log.motivo ?? '',
        Usuario: log.usuario
          ? `${log.usuario.nombre} ${log.usuario.apellidos} <${log.usuario.email}>`
          : '',
        RolUsuario: log.usuario?.rol ?? '',
        CamposAccedidos: Array.isArray(log.camposAccedidos) ? log.camposAccedidos.join(', ') : '',
        Fecha: log.createdAt,
      })
    ),
    'Auditoria'
  );
  XLSX.utils.book_append_sheet(workbook, auditoriaSheet, 'Auditoria');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

