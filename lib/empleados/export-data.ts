// ========================================
// Empleado Export Utilities
// ========================================

import * as XLSX from 'xlsx';
import type { PrismaClient } from '@prisma/client';
import { decryptEmpleadoData } from '@/lib/empleado-crypto';
import { obtenerLogAuditoria } from '@/lib/auditoria';

type FichajeWithEventos = {
  id: string;
  fecha: Date;
  estado: string;
  horasTrabajadas: any;
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
  salarioBrutoAnual: any;
  salarioBrutoMensual?: any;
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

function normalizeValue(value: unknown): unknown {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'object' && value !== null && 'toNumber' in (value as any)) {
    try {
      return (value as any).toNumber();
    } catch {
      return Number(value as any);
    }
  }

  return value;
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

    if (typeof value === 'object' && 'toNumber' in (value as any)) {
      // Prisma.Decimal
      try {
        result[key] = (value as any).toNumber();
      } catch {
        result[key] = Number(value as any);
      }
      continue;
    }

    result[key] = value;
  }

  return result;
}

function sheetFromJson(data: Record<string, unknown>[], sheetName: string): XLSX.WorkSheet {
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
  const empleado = await prisma.empleado.findFirst({
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
          carpetaId: true,
          createdAt: true,
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
          salarioBrutoAnual: true,
          salarioBrutoMensual: true,
          createdAt: true,
        },
        orderBy: {
          fechaInicio: 'desc',
        },
        take: 50,
      },
    },
  });

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
    documentos: empleado.documentos,
    auditoria,
  };
}

export function buildEmpleadoExcelBuffer(data: EmpleadoExportData): Buffer {
  const workbook = XLSX.utils.book_new();

  // Perfil Sheet
  const perfilEntries = [
    ['ID', (data.empleado as any).id],
    ['Nombre', (data.empleado as any).nombre],
    ['Apellidos', (data.empleado as any).apellidos],
    ['Email', (data.empleado as any).email],
    ['Empresa ID', (data.empleado as any).empresaId],
    ['Fecha Alta', formatDate((data.empleado as any).fechaAlta)],
    ['Fecha Baja', formatDate((data.empleado as any).fechaBaja)],
    ['Puesto', (data.empleado as any).puesto],
    ['Estado empleado', (data.empleado as any).estadoEmpleado],
    ['IBAN', (data.empleado as any).iban || ''],
    ['NIF', (data.empleado as any).nif || ''],
    ['NSS', (data.empleado as any).nss || ''],
    ['Salario bruto anual', normalizeValue((data.empleado as any).salarioBrutoAnual)],
    ['Salario bruto mensual', normalizeValue((data.empleado as any).salarioBrutoMensual)],
    ['Teléfono', (data.empleado as any).telefono || ''],
    ['Dirección', `${(data.empleado as any).direccionCalle ?? ''} ${(data.empleado as any).direccionNumero ?? ''}`.trim()],
    ['Ciudad', (data.empleado as any).ciudad ?? ''],
    ['Provincia', (data.empleado as any).direccionProvincia ?? ''],
    ['Código Postal', (data.empleado as any).codigoPostal ?? ''],
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
        SalarioBrutoAnual: contrato.salarioBrutoAnual,
        SalarioBrutoMensual: contrato.salarioBrutoMensual,
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

