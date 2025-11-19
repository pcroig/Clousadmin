// ========================================
// Formatters - Funciones de formateo reutilizables
// ========================================
// Funciones para formatear estados, fechas, badges, etc.

import { ESTADO_AUSENCIA_LABELS, EstadoAusencia } from '@/lib/constants/enums';

/**
 * Obtiene la variante de badge según el estado de una ausencia
 */
export function getAusenciaBadgeVariant(estado: string): 'warning' | 'success' | 'destructive' | 'secondary' {
  switch (estado) {
    case EstadoAusencia.pendiente:
      return 'warning';
    case EstadoAusencia.confirmada:
      return 'success';
    case EstadoAusencia.rechazada:
      return 'destructive';
    case EstadoAusencia.completada:
      return 'secondary';
    default:
      return 'secondary';
  }
}

/**
 * Obtiene la etiqueta legible para un estado de ausencia
 */
export function getAusenciaEstadoLabel(estado: string): string {
  // Verificar si el estado existe directamente en el enum
  if (Object.prototype.hasOwnProperty.call(ESTADO_AUSENCIA_LABELS, estado)) {
    return ESTADO_AUSENCIA_LABELS[estado as EstadoAusencia];
  }

  // Fallback: capitalizar el texto
  return estado.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Obtiene el color de fondo según el tipo de ausencia
 */
export function getAusenciaTipoColor(tipo: string): string {
  const tipoLower = tipo.toLowerCase();
  if (tipoLower.includes('mudanza')) return 'bg-warning';
  if (tipoLower.includes('remoto')) return 'bg-warning';
  if (tipoLower.includes('vacacion')) return 'bg-info';
  return 'bg-text-secondary';
}

/**
 * Formatea una fecha para mostrar en componentes
 * Retorna objeto con día y mes formateados
 */
export function formatFechaParaDisplay(
  fecha: Date,
  fechaFin?: Date
): {
  inicio: { day: number; month: string };
  fin: { day: number; month: string } | null;
} {
  const day = fecha.getDate();
  const month = fecha.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();

  if (fechaFin) {
    const dayFin = fechaFin.getDate();
    const monthFin = fechaFin.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
    return { inicio: { day, month }, fin: { day: dayFin, month: monthFin } };
  }

  return { inicio: { day, month }, fin: null };
}

/**
 * Formatea un tiempo en milisegundos a formato HH:MM
 */
export function formatTiempoTrabajado(diffMs: number): string {
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

/**
 * Convierte horas decimales a formato "Xh Ym" (sin segundos)
 * Ejemplo: 8.5 → "8h 30m"
 */
export function formatearHorasMinutos(horas: number | string | null | undefined): string {
  if (horas === null || horas === undefined) return '0h 0m';
  
  const horasNum = typeof horas === 'string' ? parseFloat(horas) : horas;
  
  if (isNaN(horasNum)) return '0h 0m';
  
  const horasEnteras = Math.floor(horasNum);
  const minutos = Math.round((horasNum - horasEnteras) * 60);
  
  return `${horasEnteras}h ${minutos}m`;
}

/**
 * Obtiene la variante de badge según el estado de una solicitud
 */
export function getSolicitudBadgeVariant(estado: string): 'warning' | 'success' | 'destructive' | 'secondary' {
  switch (estado) {
    case 'pendiente':
      return 'warning';
    case 'aprobada':
      return 'success';
    case 'rechazada':
      return 'destructive';
    default:
      return 'secondary';
  }
}

/**
 * Obtiene la etiqueta legible para un estado de solicitud
 */
export function getSolicitudEstadoLabel(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'aprobada':
      return 'Aprobada';
    case 'rechazada':
      return 'Rechazada';
    default:
      return estado;
  }
}

// ============================================================================
// FORMATEO DE NOMBRES Y PERSONAS
// ============================================================================

/**
 * Obtiene las iniciales de un nombre completo
 * @param nombreCompleto - Nombre completo de la persona
 * @param maxIniciales - Número máximo de iniciales (por defecto 2)
 * @returns Iniciales en mayúsculas
 * @example
 * obtenerIniciales('Juan Pérez García') // 'JP'
 * obtenerIniciales('Juan Pérez García', 3) // 'JPG'
 * obtenerIniciales('María') // 'M'
 */
export function obtenerIniciales(
  nombreCompleto: string,
  maxIniciales: number = 2
): string {
  if (!nombreCompleto || nombreCompleto.trim().length === 0) {
    return '';
  }

  return nombreCompleto
    .trim()
    .split(' ')
    .filter((palabra) => palabra.length > 0)
    .map((palabra) => palabra[0].toUpperCase())
    .slice(0, maxIniciales)
    .join('');
}

/**
 * Obtiene iniciales de nombre y apellido por separado
 * @param nombre - Nombre de la persona
 * @param apellidos - Apellidos de la persona
 * @returns Iniciales en mayúsculas (ej: 'JP' para Juan Pérez)
 * @example
 * obtenerInicialesNombreApellido('Juan', 'Pérez García') // 'JP'
 * obtenerInicialesNombreApellido('María', 'López') // 'ML'
 */
export function obtenerInicialesNombreApellido(
  nombre: string,
  apellidos: string
): string {
  const inicialNombre = nombre?.trim().charAt(0).toUpperCase() || '';
  const inicialApellido =
    apellidos?.trim().split(' ')[0]?.charAt(0).toUpperCase() || '';

  return `${inicialNombre}${inicialApellido}`;
}

/**
 * Capitaliza la primera letra de un texto
 * @param texto - Texto a capitalizar
 * @returns Texto con la primera letra en mayúscula
 * @example
 * capitalizarPrimeraLetra('hola mundo') // 'Hola mundo'
 * capitalizarPrimeraLetra('HOLA') // 'Hola'
 */
export function capitalizarPrimeraLetra(texto: string): string {
  if (!texto || texto.length === 0) return '';

  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/**
 * Capitaliza cada palabra de un texto
 * @param texto - Texto a formatear
 * @returns Texto con cada palabra capitalizada
 * @example
 * capitalizarCadaPalabra('hola mundo') // 'Hola Mundo'
 * capitalizarCadaPalabra('juan pérez garcía') // 'Juan Pérez García'
 */
export function capitalizarCadaPalabra(texto: string): string {
  if (!texto || texto.length === 0) return '';

  return texto
    .split(' ')
    .map((palabra) => capitalizarPrimeraLetra(palabra))
    .join(' ');
}

/**
 * Formatea un nombre completo asegurando capitalización correcta
 * @param nombre - Nombre a formatear
 * @returns Nombre formateado
 * @example
 * formatearNombre('JUAN PÉREZ') // 'Juan Pérez'
 * formatearNombre('maría garcía lópez') // 'María García López'
 */
export function formatearNombre(nombre: string): string {
  return capitalizarCadaPalabra(nombre);
}

// ============================================================================
// FORMATEO DE FECHAS
// ============================================================================

/**
 * Formatea una fecha de forma relativa (hace X tiempo)
 * @param fecha - Fecha a formatear
 * @returns Texto relativo como "Hoy", "Ayer", "Hace 3 días", etc.
 * @example
 * formatearFechaRelativa(new Date()) // 'Hoy'
 * formatearFechaRelativa(fechaDeAyer) // 'Ayer'
 * formatearFechaRelativa(fechaHace5Dias) // 'Hace 5 días'
 */
export function formatearFechaRelativa(fecha: Date | string): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const ahora = new Date();
  const diffMs = ahora.getTime() - date.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias} días`;
  if (diffDias < 30) {
    const semanas = Math.floor(diffDias / 7);
    return `Hace ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  }
  if (diffDias < 365) {
    const meses = Math.floor(diffDias / 30);
    return `Hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  }

  return date.toLocaleDateString('es-ES');
}

// ============================================================================
// FORMATEO DE IDENTIFICADORES
// ============================================================================

/**
 * Formatea un DNI/NIE español
 * @param dni - DNI sin formatear
 * @returns DNI formateado con guión antes de la letra
 * @example
 * formatearDNI('12345678A') // '12345678-A'
 * formatearDNI('X1234567A') // 'X1234567-A'
 */
export function formatearDNI(dni: string): string {
  if (!dni || dni.length < 8) return dni;

  const limpio = dni.replace(/[-\s]/g, '').toUpperCase();
  const numero = limpio.slice(0, -1);
  const letra = limpio.slice(-1);

  return `${numero}-${letra}`;
}

/**
 * Formatea un número de teléfono español
 * @param telefono - Número de teléfono
 * @returns Teléfono formateado
 * @example
 * formatearTelefono('612345678') // '612 34 56 78'
 * formatearTelefono('912345678') // '91 234 56 78'
 */
export function formatearTelefono(telefono: string): string {
  if (!telefono) return '';

  const limpio = telefono.replace(/\s/g, '');

  if (limpio.length === 9) {
    // Móvil (6XX, 7XX)
    if (limpio.startsWith('6') || limpio.startsWith('7')) {
      return `${limpio.slice(0, 3)} ${limpio.slice(3, 5)} ${limpio.slice(5, 7)} ${limpio.slice(7, 9)}`;
    }
    // Fijo
    return `${limpio.slice(0, 2)} ${limpio.slice(2, 5)} ${limpio.slice(5, 7)} ${limpio.slice(7, 9)}`;
  }

  return telefono;
}

// ============================================================================
// FORMATEO DE TEXTO
// ============================================================================

/**
 * Trunca un texto a un número máximo de caracteres
 * @param texto - Texto a truncar
 * @param maxCaracteres - Número máximo de caracteres
 * @param sufijo - Sufijo a agregar si se trunca (por defecto '...')
 * @returns Texto truncado
 * @example
 * truncarTexto('Este es un texto largo', 10) // 'Este es un...'
 * truncarTexto('Texto corto', 50) // 'Texto corto'
 */
export function truncarTexto(
  texto: string,
  maxCaracteres: number,
  sufijo: string = '...'
): string {
  if (!texto || texto.length <= maxCaracteres) return texto;

  return texto.slice(0, maxCaracteres - sufijo.length) + sufijo;
}

/**
 * Convierte un texto a formato slug (URL-friendly)
 * @param texto - Texto a convertir
 * @returns Texto en formato slug
 * @example
 * crearSlug('Hola Mundo!') // 'hola-mundo'
 * crearSlug('Año 2025') // 'ano-2025'
 */
export function crearSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales por guiones
    .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio y final
}

// ============================================================================
// FORMATEO DE ESTADOS Y ENUMS (ADICIONAL)
// ============================================================================

/**
 * Convierte un enum/estado a texto legible
 * @param estado - Estado en formato snake_case o UPPER_CASE
 * @returns Texto legible
 * @example
 * formatearEstado('en_progreso') // 'En progreso'
 * formatearEstado('PENDIENTE_APROBACION') // 'Pendiente aprobación'
 */
export function formatearEstado(estado: string): string {
  if (!estado) return '';

  return estado
    .toLowerCase()
    .replace(/_/g, ' ')
    .split(' ')
    .map((palabra) => capitalizarPrimeraLetra(palabra))
    .join(' ');
}

/**
 * Formatea un rol de usuario
 * @param rol - Rol del usuario
 * @returns Rol formateado
 * @example
 * formatearRol('hr_admin') // 'Admin RR.HH.'
 * formatearRol('empleado') // 'Empleado'
 */
export function formatearRol(rol: string): string {
  const roles: Record<string, string> = {
    platform_admin: 'Admin Plataforma',
    hr_admin: 'Admin RR.HH.',
    manager: 'Manager',
    empleado: 'Empleado',
  };

  return roles[rol] || capitalizarPrimeraLetra(rol);
}

// ============================================================================
// FORMATEO DE LISTAS
// ============================================================================

/**
 * Une un array de strings con formato legible
 * @param items - Array de strings
 * @param separador - Separador entre items (por defecto ', ')
 * @param ultimoSeparador - Separador antes del último item (por defecto ' y ')
 * @returns String con items unidos
 * @example
 * unirLista(['Juan', 'Pedro', 'María']) // 'Juan, Pedro y María'
 * unirLista(['A', 'B'], ', ', ' o ') // 'A o B'
 */
export function unirLista(
  items: string[],
  separador: string = ', ',
  ultimoSeparador: string = ' y '
): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(ultimoSeparador);

  const ultimoItem = items[items.length - 1];
  const restantes = items.slice(0, -1);

  return restantes.join(separador) + ultimoSeparador + ultimoItem;
}

/**
 * Formatea un número de elementos con singular/plural
 * @param cantidad - Número de elementos
 * @param singular - Texto en singular
 * @param plural - Texto en plural (opcional, se genera automáticamente)
 * @returns Texto formateado
 * @example
 * formatearPlural(1, 'empleado') // '1 empleado'
 * formatearPlural(5, 'empleado') // '5 empleados'
 * formatearPlural(1, 'solicitud', 'solicitudes') // '1 solicitud'
 */
export function formatearPlural(
  cantidad: number,
  singular: string,
  plural?: string
): string {
  const textoPlural = plural || singular + 's';
  const texto = cantidad === 1 ? singular : textoPlural;

  return `${cantidad} ${texto}`;
}
