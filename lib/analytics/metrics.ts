export interface MetricDefinition {
  id: string;
  label: string;
  description: string;
  unit?: 'number' | 'percentage' | 'hours';
}

export const PLANTILLA_METRICS: MetricDefinition[] = [
  {
    id: 'totalEmpleados',
    label: 'Total empleados',
    description: 'Cantidad de empleados activos tras aplicar filtros.',
  },
  {
    id: 'cambioMes',
    label: 'Variación mensual',
    description: 'Diferencia vs el total del mes anterior.',
  },
  {
    id: 'altasMes',
    label: 'Altas del mes',
    description: 'Número de incorporaciones en el mes en curso.',
  },
  {
    id: 'bajasMes',
    label: 'Bajas del mes',
    description: 'Número de bajas registradas en el mes en curso.',
  },
  {
    id: 'porEquipo',
    label: 'Distribución por equipo',
    description: 'Reparto de la plantilla por equipo, incluyendo “Sin equipo”.',
  },
  {
    id: 'distribucionAntiguedad',
    label: 'Antigüedad',
    description: 'Agrupación de empleados por años en la empresa.',
  },
];

export const COMPENSACION_METRICS: MetricDefinition[] = [
  {
    id: 'costeTotalNomina',
    label: 'Coste total nómina',
    description: 'Suma de salarios brutos mensuales de la plantilla filtrada.',
  },
  {
    id: 'cambioCoste',
    label: 'Variación de coste',
    description: 'Diferencia vs el coste del mes anterior.',
  },
  {
    id: 'salarioPromedio',
    label: 'Salario promedio',
    description: 'Media de salario base mensual por empleado.',
  },
  {
    id: 'brechaSalarialGenero',
    label: 'Brecha salarial',
    description: 'Diferencia absoluta y porcentual entre salario medio de hombres y mujeres.',
    unit: 'percentage',
  },
  {
    id: 'distribucionSalarial',
    label: 'Distribución salarial',
    description: 'Conteo de empleados por rango salarial anual.',
  },
  {
    id: 'nominas',
    label: 'Analytics de nóminas',
    description: 'Resumen anual, tendencia mensual y top complementos.',
  },
];

export const FICHAJES_METRICS: MetricDefinition[] = [
  {
    id: 'totalHorasMes',
    label: 'Total horas mes',
    description: 'Horas trabajadas por la plantilla en el mes actual.',
    unit: 'hours',
  },
  {
    id: 'cambioHoras',
    label: 'Variación de horas',
    description: 'Diferencia vs las horas del mes anterior.',
    unit: 'hours',
  },
  {
    id: 'promedioHorasDia',
    label: 'Promedio horas/día',
    description: 'Horas promedio por empleado y día laborable.',
    unit: 'hours',
  },
  {
    id: 'horasDiarias',
    label: 'Horas diarias',
    description: 'Serie temporal con horas trabajadas en cada día laborable.',
    unit: 'hours',
  },
  {
    id: 'tasaAbsentismo',
    label: 'Tasa de absentismo',
    description: 'Porcentaje de días perdidos vs días laborables.',
    unit: 'percentage',
  },
  {
    id: 'balanceAcumulado',
    label: 'Balance acumulado',
    description: 'Horas extra o deficitarias acumuladas durante el año.',
    unit: 'hours',
  },
];


