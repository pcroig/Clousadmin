// ========================================
// Utilidades Numéricas
// ========================================

export function redondearDecimales(valor: number, decimales: number = 2): number {
  const factor = Math.pow(10, decimales);
  return Math.round(valor * factor) / factor;
}

export const redondearHoras = (horas: number): number =>
  redondearDecimales(horas, 2);

