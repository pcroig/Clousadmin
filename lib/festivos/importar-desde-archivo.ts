import { z } from 'zod';

export interface FestivoArchivo {
  fecha: string;
  nombre: string;
  activo?: boolean;
}

const DATE_YYYYMMDD = /^\d{8}$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const DATE_DDMMYYYY = /^\d{2}\/\d{2}\/\d{4}$/;

const LIMPIAR_TEXTO = /\\[,;]/g;

const csvLineSchema = z.tuple([z.string(), z.string(), z.string().optional()]).or(
  z.tuple([z.string(), z.string()])
);

function normalizarFecha(valor: string): string | null {
  const raw = valor.trim();

  if (DATE_ISO.test(raw)) {
    return raw;
  }

  if (DATE_YYYYMMDD.test(raw)) {
    const year = raw.slice(0, 4);
    const month = raw.slice(4, 6);
    const day = raw.slice(6, 8);
    return `${year}-${month}-${day}`;
  }

  if (DATE_DDMMYYYY.test(raw)) {
    const [day, month, year] = raw.split('/');
    return `${year}-${month}-${day}`;
  }

  return null;
}

function limpiarNombre(valor: string): string {
  return valor.replace(/\s+/g, ' ').replace(LIMPIAR_TEXTO, ',').trim();
}

function parseFestivosDesdeICS(contenido: string): FestivoArchivo[] {
  const bloques = contenido
    .split(/BEGIN:VEVENT/gi)
    .slice(1)
    .map((chunk) => chunk.split(/END:VEVENT/gi)[0] ?? chunk);

  const festivos: FestivoArchivo[] = [];

  for (const bloque of bloques) {
    const dtstart = bloque.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})(?:T\d{6}Z)?/i);
    const summary = bloque.match(/SUMMARY:(.+)/i);

    if (!dtstart || !summary) {
      continue;
    }

    const fecha = normalizarFecha(dtstart[1]);
    if (!fecha) continue;

    const nombreLinea = summary[1].split(/\r?\n/)[0] ?? summary[1];
    const nombre = limpiarNombre(nombreLinea);
    if (!nombre) continue;

    festivos.push({
      fecha,
      nombre,
      activo: true,
    });
  }

  return festivos;
}

function parseFestivosDesdeCSV(contenido: string): FestivoArchivo[] {
  const lineas = contenido
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean);

  if (lineas.length === 0) {
    return [];
  }

  const delimitador = lineas[0].includes(';')
    ? ';'
    : lineas[0].includes('\t')
    ? '\t'
    : ',';

  const festivos: FestivoArchivo[] = [];

  const tieneCabecera = lineas[0].toLowerCase().includes('fecha');
  const datos = tieneCabecera ? lineas.slice(1) : lineas;

  for (const linea of datos) {
    const columnas = linea
      .split(delimitador)
      .map((col) => col.replace(/^"|"$/g, '').trim())
      .filter((col, idx) => idx < 3);

    if (columnas.length < 2) {
      continue;
    }

    const parsed = csvLineSchema.safeParse(columnas);
    if (!parsed.success) {
      continue;
    }

    const [fechaRaw, nombreRaw, activoRaw] = parsed.data;
    const fecha = normalizarFecha(fechaRaw);
    if (!fecha) continue;

    const nombre = limpiarNombre(nombreRaw);
    if (!nombre) continue;

    const activo =
      typeof activoRaw === 'string'
        ? !['false', '0', 'no'].includes(activoRaw.toLowerCase())
        : true;

    festivos.push({
      fecha,
      nombre,
      activo,
    });
  }

  return festivos;
}

export function parseFestivosDesdeArchivo(
  nombreArchivo: string,
  mimeType: string | undefined,
  contenido: string
): FestivoArchivo[] {
  const extension = nombreArchivo.split('.').pop()?.toLowerCase();

  if (mimeType === 'text/calendar' || extension === 'ics') {
    return parseFestivosDesdeICS(contenido);
  }

  if (mimeType === 'text/csv' || extension === 'csv') {
    return parseFestivosDesdeCSV(contenido);
  }

  throw new Error('Formato no soportado. Usa archivos .ics o .csv');
}





