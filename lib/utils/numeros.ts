/**
 * Utilidades para manejo de números
 * Centraliza operaciones comunes de números para evitar duplicación
 */

// ============================================================================
// REDONDEO Y PRECISIÓN
// ============================================================================

/**
 * Redondea un número a un número específico de decimales
 * @param valor - Número a redondear
 * @param decimales - Número de decimales (por defecto 2)
 * @returns Número redondeado
 * @example
 * redondearDecimales(3.14159, 2) // 3.14
 * redondearDecimales(3.14159, 4) // 3.1416
 * redondearDecimales(123.456, 0) // 123
 */
export function redondearDecimales(
  valor: number,
  decimales: number = 2
): number {
  if (!Number.isFinite(valor)) {
    return valor;
  }

  const factor = Math.pow(10, decimales);
  return Math.round(valor * factor) / factor;
}

/**
 * Redondea un número de horas a 2 decimales
 * Función especializada para cálculos de horas trabajadas
 * @param horas - Número de horas
 * @returns Horas redondeadas a 2 decimales
 * @example
 * redondearHoras(8.3333) // 8.33
 * redondearHoras(7.666666) // 7.67
 */
export function redondearHoras(horas: number): number {
  return redondearDecimales(horas, 2);
}

/**
 * Redondea hacia arriba a un número de decimales
 * @param valor - Número a redondear
 * @param decimales - Número de decimales
 * @returns Número redondeado hacia arriba
 * @example
 * redondearArriba(3.141, 2) // 3.15
 * redondearArriba(3.141, 1) // 3.2
 */
export function redondearArriba(valor: number, decimales: number = 2): number {
  const factor = Math.pow(10, decimales);
  return Math.ceil(valor * factor) / factor;
}

/**
 * Redondea hacia abajo a un número de decimales
 * @param valor - Número a redondear
 * @param decimales - Número de decimales
 * @returns Número redondeado hacia abajo
 * @example
 * redondearAbajo(3.149, 2) // 3.14
 * redondearAbajo(3.149, 1) // 3.1
 */
export function redondearAbajo(valor: number, decimales: number = 2): number {
  const factor = Math.pow(10, decimales);
  return Math.floor(valor * factor) / factor;
}

// ============================================================================
// FORMATEO DE NÚMEROS
// ============================================================================

/**
 * Formatea un número con separadores de miles
 * @param valor - Número a formatear
 * @param decimales - Número de decimales a mostrar (opcional)
 * @returns Número formateado como string
 * @example
 * formatearNumero(1234567.89) // '1.234.567,89'
 * formatearNumero(1234567, 0) // '1.234.567'
 */
export function formatearNumero(
  valor: number,
  decimales?: number
): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales ?? 2,
  }).format(valor);
}

/**
 * Formatea un número como moneda en euros
 * @param valor - Cantidad a formatear
 * @param mostrarSimbolo - Si mostrar el símbolo € (por defecto true)
 * @returns Número formateado como moneda
 * @example
 * formatearMoneda(1234.56) // '1.234,56 €'
 * formatearMoneda(1234.56, false) // '1.234,56'
 */
export function formatearMoneda(
  valor: number,
  mostrarSimbolo: boolean = true
): string {
  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);

  return mostrarSimbolo ? `${formatted} €` : formatted;
}

/**
 * Formatea un número como porcentaje
 * @param valor - Valor a formatear (0-1 o 0-100 según esFraccion)
 * @param esFraccion - Si el valor está en formato 0-1 (por defecto true)
 * @param decimales - Número de decimales (por defecto 1)
 * @returns Número formateado como porcentaje
 * @example
 * formatearPorcentaje(0.1234) // '12,3%'
 * formatearPorcentaje(12.34, false) // '12,3%'
 * formatearPorcentaje(0.1234, true, 2) // '12,34%'
 */
export function formatearPorcentaje(
  valor: number,
  esFraccion: boolean = true,
  decimales: number = 1
): string {
  const porcentaje = esFraccion ? valor * 100 : valor;
  return `${formatearNumero(porcentaje, decimales)}%`;
}

/**
 * Formatea horas en formato HH:MM
 * @param horas - Número de horas (puede tener decimales)
 * @returns Horas formateadas como "HH:MM", o "00:00" si el valor no es válido
 * @example
 * formatearHorasComoTiempo(8.5) // '08:30'
 * formatearHorasComoTiempo(1.75) // '01:45'
 * formatearHorasComoTiempo(0.25) // '00:15'
 * formatearHorasComoTiempo(-2.5) // '-02:30'
 * formatearHorasComoTiempo(NaN) // '00:00'
 */
export function formatearHorasComoTiempo(horas: number): string {
  // Validar entrada
  if (!Number.isFinite(horas)) {
    return '00:00';
  }

  const horasEnteras = Math.floor(Math.abs(horas));
  let minutos = Math.round((Math.abs(horas) % 1) * 60);

  // Edge case: redondeo puede dar 60 minutos
  if (minutos >= 60) {
    minutos = 59;
  }

  const signo = horas < 0 ? '-' : '';

  return `${signo}${String(horasEnteras).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

// ============================================================================
// VALIDACIONES
// ============================================================================

/**
 * Verifica si un valor es un número válido
 * @param valor - Valor a verificar
 * @returns true si es un número válido y finito
 * @example
 * esNumeroValido(123) // true
 * esNumeroValido(NaN) // false
 * esNumeroValido(Infinity) // false
 */
export function esNumeroValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor);
}

/**
 * Verifica si un número está dentro de un rango
 * @param valor - Número a verificar
 * @param min - Valor mínimo (inclusive)
 * @param max - Valor máximo (inclusive)
 * @returns true si el número está en el rango
 * @example
 * estaEnRango(5, 1, 10) // true
 * estaEnRango(0, 1, 10) // false
 * estaEnRango(10, 1, 10) // true
 */
export function estaEnRango(valor: number, min: number, max: number): boolean {
  return valor >= min && valor <= max;
}

/**
 * Verifica si un número es positivo
 * @param valor - Número a verificar
 * @returns true si el número es mayor que 0
 * @example
 * esPositivo(5) // true
 * esPositivo(0) // false
 * esPositivo(-5) // false
 */
export function esPositivo(valor: number): boolean {
  return valor > 0;
}

/**
 * Verifica si un número es negativo
 * @param valor - Número a verificar
 * @returns true si el número es menor que 0
 * @example
 * esNegativo(-5) // true
 * esNegativo(0) // false
 * esNegativo(5) // false
 */
export function esNegativo(valor: number): boolean {
  return valor < 0;
}

// ============================================================================
// CÁLCULOS COMUNES
// ============================================================================

/**
 * Calcula el promedio de un array de números
 * @param valores - Array de números
 * @returns Promedio, o 0 si el array está vacío
 * @example
 * calcularPromedio([1, 2, 3, 4, 5]) // 3
 * calcularPromedio([]) // 0
 */
export function calcularPromedio(valores: number[]): number {
  if (valores.length === 0) return 0;
  const suma = valores.reduce((acc, val) => acc + val, 0);
  return suma / valores.length;
}

/**
 * Calcula la suma de un array de números
 * @param valores - Array de números
 * @returns Suma total
 * @example
 * calcularSuma([1, 2, 3, 4, 5]) // 15
 * calcularSuma([]) // 0
 */
export function calcularSuma(valores: number[]): number {
  return valores.reduce((acc, val) => acc + val, 0);
}

/**
 * Encuentra el valor máximo en un array de números
 * @param valores - Array de números
 * @returns Valor máximo, o -Infinity si el array está vacío
 * @example
 * encontrarMaximo([1, 5, 3, 9, 2]) // 9
 */
export function encontrarMaximo(valores: number[]): number {
  if (valores.length === 0) return -Infinity;
  return Math.max(...valores);
}

/**
 * Encuentra el valor mínimo en un array de números
 * @param valores - Array de números
 * @returns Valor mínimo, o Infinity si el array está vacío
 * @example
 * encontrarMinimo([1, 5, 3, 9, 2]) // 1
 */
export function encontrarMinimo(valores: number[]): number {
  if (valores.length === 0) return Infinity;
  return Math.min(...valores);
}

/**
 * Limita un número a un rango específico
 * @param valor - Número a limitar
 * @param min - Valor mínimo
 * @param max - Valor máximo
 * @returns Número limitado al rango
 * @example
 * limitarRango(15, 0, 10) // 10
 * limitarRango(-5, 0, 10) // 0
 * limitarRango(5, 0, 10) // 5
 */
export function limitarRango(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

/**
 * Calcula el porcentaje que representa un valor del total
 * @param valor - Valor parcial
 * @param total - Valor total
 * @returns Porcentaje (0-100), o 0 si el total es 0
 * @example
 * calcularPorcentajeDelTotal(25, 100) // 25
 * calcularPorcentajeDelTotal(1, 4) // 25
 */
export function calcularPorcentajeDelTotal(
  valor: number,
  total: number
): number {
  if (total === 0) return 0;
  return (valor / total) * 100;
}

// ============================================================================
// PARSEO SEGURO
// ============================================================================

/**
 * Convierte un string a número de forma segura
 * @param valor - String a convertir
 * @param valorPorDefecto - Valor a retornar si la conversión falla (por defecto 0)
 * @returns Número parseado o valor por defecto
 * @example
 * parsearNumero('123') // 123
 * parsearNumero('abc') // 0
 * parsearNumero('abc', -1) // -1
 */
export function parsearNumero(
  valor: string,
  valorPorDefecto: number = 0
): number {
  const parsed = parseFloat(valor);
  return Number.isFinite(parsed) ? parsed : valorPorDefecto;
}

/**
 * Convierte un string a entero de forma segura
 * @param valor - String a convertir
 * @param valorPorDefecto - Valor a retornar si la conversión falla (por defecto 0)
 * @returns Entero parseado o valor por defecto
 * @example
 * parsearEntero('123') // 123
 * parsearEntero('123.45') // 123
 * parsearEntero('abc') // 0
 */
export function parsearEntero(
  valor: string,
  valorPorDefecto: number = 0
): number {
  const parsed = parseInt(valor, 10);
  return Number.isFinite(parsed) ? parsed : valorPorDefecto;
}
