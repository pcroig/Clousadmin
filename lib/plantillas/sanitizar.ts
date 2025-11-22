/**
 * Utilidades de sanitización y formateo
 */

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FORMATO_FECHA_ES, FORMATO_FECHA_LARGO_ES } from './constantes';

/**
 * Sanitizar nombre de archivo (remover caracteres especiales, tildes, espacios)
 */
export function sanitizarNombreArchivo(nombre: string): string {
  return nombre
    .normalize('NFD') // Descomponer caracteres con tildes
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
    .replace(/[^a-zA-Z0-9_.-]/g, '_') // Reemplazar caracteres especiales con _
    .replace(/_+/g, '_') // Remover múltiples underscores consecutivos
    .replace(/^_|_$/g, '') // Remover underscores al inicio y final
    .substring(0, 200); // Limitar longitud
}

/**
 * Formatear fecha a formato español (dd/MM/yyyy)
 */
export function formatearFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return '';

  try {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(fechaObj.getTime())) return '';

    return format(fechaObj, FORMATO_FECHA_ES, { locale: es });
  } catch {
    return '';
  }
}

/**
 * Formatear fecha a formato largo (15 de marzo de 2024)
 */
export function formatearFechaLarga(fecha: Date | string | null | undefined): string {
  if (!fecha) return '';

  try {
    const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(fechaObj.getTime())) return '';

    return format(fechaObj, FORMATO_FECHA_LARGO_ES, { locale: es });
  } catch {
    return '';
  }
}

/**
 * Formatear moneda en euros
 */
export function formatearMoneda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return '0,00 €';

  try {
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(numero)) return '0,00 €';

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);
  } catch {
    return '0,00 €';
  }
}

/**
 * Formatear número con separadores de miles
 */
export function formatearNumero(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return '0';

  try {
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    if (isNaN(numero)) return '0';

    return new Intl.NumberFormat('es-ES').format(numero);
  } catch {
    return '0';
  }
}

/**
 * Construir dirección completa desde partes
 */
export function construirDireccionCompleta(datos: {
  direccionCalle?: string | null;
  direccionNumero?: string | null;
  direccionPiso?: string | null;
  codigoPostal?: string | null;
  ciudad?: string | null;
  direccionProvincia?: string | null;
}): string {
  const partes: string[] = [];

  if (datos.direccionCalle) {
    let parte = datos.direccionCalle;
    if (datos.direccionNumero) {
      parte += `, ${datos.direccionNumero}`;
    }
    if (datos.direccionPiso) {
      parte += `, ${datos.direccionPiso}`;
    }
    partes.push(parte);
  }

  if (datos.codigoPostal && datos.ciudad) {
    partes.push(`${datos.codigoPostal} ${datos.ciudad}`);
  } else if (datos.ciudad) {
    partes.push(datos.ciudad);
  }

  if (datos.direccionProvincia && datos.direccionProvincia !== datos.ciudad) {
    partes.push(datos.direccionProvincia);
  }

  return partes.join(', ');
}

/**
 * Capitalizar primera letra de cada palabra
 */
export function capitalizarPalabras(texto: string | null | undefined): string {
  if (!texto) return '';

  return texto
    .toLowerCase()
    .split(' ')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

/**
 * Convertir número a palabras (español) - Simplificado
 * Para cantidades en contratos (ej: 3000 → "tres mil euros")
 */
export function numeroAPalabras(numero: number): string {
  if (numero === 0) return 'cero';

  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  // Simplificación: solo hasta 999,999
  if (numero >= 1000000) {
    return numero.toLocaleString('es-ES') + ' (en palabras no disponible para cantidades grandes)';
  }

  let resultado = '';

  // Miles
  if (numero >= 1000) {
    const miles = Math.floor(numero / 1000);
    if (miles === 1) {
      resultado += 'mil ';
    } else {
      resultado += numeroAPalabras(miles) + ' mil ';
    }
    numero = numero % 1000;
  }

  // Centenas
  if (numero >= 100) {
    const cent = Math.floor(numero / 100);
    if (numero === 100) {
      resultado += 'cien ';
    } else {
      resultado += centenas[cent] + ' ';
    }
    numero = numero % 100;
  }

  // Decenas y unidades
  if (numero >= 20) {
    const dec = Math.floor(numero / 10);
    resultado += decenas[dec];
    const uni = numero % 10;
    if (uni > 0) {
      resultado += ' y ' + unidades[uni];
    }
  } else if (numero >= 10) {
    resultado += especiales[numero - 10];
  } else if (numero > 0) {
    resultado += unidades[numero];
  }

  return resultado.trim();
}

/**
 * Calcular edad desde fecha de nacimiento
 */
export function calcularEdad(fechaNacimiento: Date | string | null | undefined): number {
  if (!fechaNacimiento) return 0;

  try {
    const fechaNac = typeof fechaNacimiento === 'string' ? new Date(fechaNacimiento) : fechaNacimiento;
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const mes = hoy.getMonth() - fechaNac.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
      edad--;
    }

    return edad;
  } catch {
    return 0;
  }
}

/**
 * Calcular duración en meses entre dos fechas
 */
export function calcularDuracionMeses(fechaInicio: Date | string, fechaFin: Date | string): number {
  try {
    const inicio = typeof fechaInicio === 'string' ? new Date(fechaInicio) : fechaInicio;
    const fin = typeof fechaFin === 'string' ? new Date(fechaFin) : fechaFin;

    const meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
    return Math.max(0, meses);
  } catch {
    return 0;
  }
}

/**
 * Formatear tipo de contrato a texto legible
 */
export function formatearTipoContrato(tipo: string | null | undefined): string {
  if (!tipo) return '';

  const tipos: Record<string, string> = {
    'indefinido': 'Indefinido',
    'temporal': 'Temporal',
    'administrador': 'Administrador',
    'fijo_discontinuo': 'Fijo Discontinuo',
    'becario': 'Becario',
    'practicas': 'Prácticas',
    'obra_y_servicio': 'Obra y Servicio',
  };

  return tipos[tipo] || capitalizarPalabras(tipo);
}

/**
 * Formatear tipo de ausencia a texto legible
 */
export function formatearTipoAusencia(tipo: string | null | undefined): string {
  if (!tipo) return '';

  const tipos: Record<string, string> = {
    'vacaciones': 'Vacaciones',
    'enfermedad': 'Baja por Enfermedad',
    'enfermedad_familiar': 'Cuidado Familiar',
    'maternidad_paternidad': 'Permiso Parental',
    'otro': 'Otro',
  };

  return tipos[tipo] || capitalizarPalabras(tipo);
}

/**
 * Validar formato de variable ({{variable_nombre}})
 */
export function esVariableValida(variable: string): boolean {
  return /^[a-z_][a-z0-9_]*$/.test(variable);
}

/**
 * Extraer variables de texto de plantilla
 */
export function extraerVariablesDeTexto(texto: string): string[] {
  const regex = /\{\{([a-z_][a-z0-9_]*)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}
