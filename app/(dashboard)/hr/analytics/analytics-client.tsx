'use client';

// ========================================
// Analytics - Client Component con Diseño Consistente
// ========================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AreaChartComponent } from '@/components/analytics/area-chart';
import { BarChartComponent } from '@/components/analytics/bar-chart';
import { AnalyticsFilters, FilterValues } from '@/components/analytics/filters';
import { KpiCard } from '@/components/analytics/kpi-card';
import { PieChartComponent } from '@/components/analytics/pie-chart';
import { Button } from '@/components/ui/button';
import { parseJson } from '@/lib/utils/json';


interface PlantillaData {
  totalEmpleados: number;
  cambioMes: number;
  porEquipo: Array<{ equipo: string; empleados: number }>;
  evolucionPlantilla: Array<{ mes: string; empleados: number }>;
  altasMes: number;
  bajasMes: number;
  distribucionGenero: Array<{ genero: string; empleados: number }>;
  evolucionAltasBajas: Array<{ mes: string; altas: number; bajas: number }>;
  distribucionAntiguedad: Array<{ rango: string; empleados: number }>;
}

interface NominaResumen {
  totalNeto: number;
  totalBruto: number;
  totalComplementos: number;
  totalNominas: number;
}

interface NominasAnalytics {
  currentYear: number;
  previousYear: number;
  resumen: {
    actual: NominaResumen;
    anterior: NominaResumen;
    variaciones: {
      totalNeto: number;
      totalBruto: number;
      totalComplementos: number;
    };
  };
  tendenciaMensual: Array<{
    mes: string;
    mesNumero: number;
    totalNeto: number;
    totalBruto: number;
    totalComplementos: number;
    totalNominas: number;
  }>;
  porEquipo: Array<{
    equipo: string;
    totalNeto: number;
    totalComplementos: number;
    promedioNeto: number;
    nominas: number;
  }>;
  complementosTop: Array<{
    nombre: string;
    totalImporte: number;
    promedioImporte: number;
    vecesAsignado: number;
  }>;
}

interface CompensacionData {
  costeTotalNomina: number;
  cambioCoste: number;
  salarioPromedio: number;
  salarioPromedioEquipo: Array<{ equipo: string; promedio: number }>;
  salarioPromedioPorGenero: Array<{ genero: string; promedio: number }>;
  brechaSalarialGenero: {
    diferencia: number;
    porcentaje: number;
    generoMayor: 'hombre' | 'mujer' | 'igual';
  };
  evolucionCoste: Array<{ mes: string; coste: number }>;
  distribucionSalarial: Array<{ rango: string; empleados: number }>;
  nominas: NominasAnalytics | null;
}

interface FichajesData {
  totalHorasMes: number;
  cambioHoras: number;
  promedioHorasDia: number;
  horasDiarias: Array<{ fecha: string; horas: number }>;
  tasaAbsentismo: number;
  balanceAcumulado: number;
  promedioHorasPorEquipo: Array<{ equipo: string; promedio: number }>;
  tasaAbsentismoPorEquipo: Array<{ equipo: string; tasa: number }>;
}

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const formatCurrency = (value: number) => currencyFormatter.format(Math.round(value ?? 0));

const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const formatCurrencyDelta = (value: number) => {
  const base = formatCurrency(Math.abs(value));
  if (value === 0) {
    return base;
  }
  return `${value > 0 ? '+' : '-'}${base}`;
};

const formatSignedNumber = (value: number) => {
  if (value === 0) {
    return '0';
  }
  return `${value > 0 ? '+' : ''}${value}`;
};

export function AnalyticsClient() {
  const [activeTab, setActiveTab] = useState('plantilla');
  const [filters, setFilters] = useState<FilterValues>({
    genero: 'todos',
    equipo: 'todos',
    antiguedad: 'todos',
  });

  const [equipos, setEquipos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [plantillaData, setPlantillaData] = useState<PlantillaData | null>(null);
  const [compensacionData, setCompensacionData] = useState<CompensacionData | null>(null);
  const [fichajesData, setFichajesData] = useState<FichajesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabs = [
    { id: 'plantilla', label: 'Plantilla' },
    { id: 'compensacion', label: 'Compensación' },
    { id: 'fichajes', label: 'Fichajes' },
  ];

  const nominasAnalytics = compensacionData?.nominas;

  const rotacionMensual = useMemo(() => {
    if (!plantillaData) return [];
    const headcountByMes = new Map(
      plantillaData.evolucionPlantilla.map((item) => [item.mes, item.empleados])
    );
    return plantillaData.evolucionAltasBajas
      .map((entry) => {
        const headcount = headcountByMes.get(entry.mes) ?? plantillaData.totalEmpleados;
        if (headcount <= 0) {
          return { mes: entry.mes, tasa: 0 };
        }
        const tasa = Number(((entry.bajas / headcount) * 100).toFixed(1));
        return {
          mes: entry.mes,
          tasa,
        };
      })
      .filter((item) => !Number.isNaN(item.tasa));
  }, [plantillaData]);

  const brechaSalarial = useMemo(() => {
    if (!compensacionData) return null;
    const generoPromedios = compensacionData.salarioPromedioPorGenero ?? [];
    const promedioHombres =
      generoPromedios.find((item) => item.genero === 'hombre')?.promedio ?? 0;
    const promedioMujeres =
      generoPromedios.find((item) => item.genero === 'mujer')?.promedio ?? 0;

    if (promedioHombres === 0 && promedioMujeres === 0) {
      return null;
    }

    const diferencia = promedioHombres - promedioMujeres;
    const porcentaje =
      promedioMujeres > 0
        ? Number(((diferencia / promedioMujeres) * 100).toFixed(1))
        : 0;

    return {
      diferencia,
      porcentaje,
      direccion: diferencia === 0 ? 'igual' : diferencia > 0 ? 'hombre' : 'mujer',
      promedioHombres,
      promedioMujeres,
    };
  }, [compensacionData]);

  const fetchEquipos = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/equipos');
      const data = await parseJson<Array<{ id: string; nombre: string }>>(response);
      setEquipos(data);
    } catch (error) {
      console.error('Error fetching equipos:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        genero: filters.genero,
        equipo: filters.equipo,
        antiguedad: filters.antiguedad,
      });

      const [plantillaRes, compensacionRes, fichajesRes] = await Promise.all([
        fetch(`/api/analytics/plantilla?${queryParams}`),
        fetch(`/api/analytics/compensacion?${queryParams}`),
        fetch(`/api/analytics/fichajes?${queryParams}`),
      ]);

      // Verificar si hay errores en las respuestas
      if (!plantillaRes.ok || !compensacionRes.ok || !fichajesRes.ok) {
        throw new Error('Error al cargar los datos de analytics');
      }

      const [plantilla, compensacion, fichajes] = await Promise.all([
        parseJson<PlantillaData>(plantillaRes),
        parseJson<CompensacionData>(compensacionRes),
        parseJson<FichajesData>(fichajesRes),
      ]);

      setPlantillaData(plantilla);
      setCompensacionData(compensacion);
      setFichajesData(fichajes);
      setError(null);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      const errorMsg = 'Error al cargar los datos. Por favor, inténtalo de nuevo.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Cargar equipos al montar el componente
  useEffect(() => {
    fetchEquipos();
  }, [fetchEquipos]);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key: keyof FilterValues, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams({
        genero: filters.genero,
        equipo: filters.equipo,
        antiguedad: filters.antiguedad,
      });

      const response = await fetch(`/api/analytics/export?${queryParams}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Error al exportar datos');
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-gray-500">Cargando datos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchData}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!plantillaData || !compensacionData || !fichajesData) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-gray-500">No hay datos disponibles</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <AnalyticsFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            equipos={equipos}
            onExport={handleExport}
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Tab: Plantilla */}
        {activeTab === 'plantilla' && (
          <div className="space-y-6">
            {/* Métricas clave de Plantilla */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiCard
                title="Total empleados"
                value={plantillaData.totalEmpleados}
                subtitle={`Variación vs mes anterior: ${formatSignedNumber(plantillaData.cambioMes)}`}
              />
              <KpiCard
                title="Altas del mes"
                value={plantillaData.altasMes}
                subtitle="Nuevas incorporaciones"
              />
              <KpiCard
                title="Bajas del mes"
                value={plantillaData.bajasMes}
                subtitle="Finalizaciones de contrato"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChartComponent
                title="Empleados por Equipo"
                description="Distribución actual de la plantilla"
                data={plantillaData.porEquipo}
                dataKey="empleados"
                xAxisKey="equipo"
                chartConfig={{
                  empleados: {
                    label: 'Empleados',
                    color: '#d97757',
                  },
                }}
              />

              <AreaChartComponent
                title="Evolución Plantilla"
                description="Últimos 12 meses"
                data={plantillaData.evolucionPlantilla}
                dataKey="empleados"
                xAxisKey="mes"
                chartConfig={{
                  empleados: {
                    label: 'Empleados',
                    color: '#d97757',
                  },
                }}
              />

              <PieChartComponent
                title="Distribución por Género"
                description="Composición de la plantilla"
                data={plantillaData.distribucionGenero}
                dataKey="empleados"
                nameKey="genero"
                chartConfig={{
                  hombre: { label: 'Hombre', color: '#d97757' },
                  mujer: { label: 'Mujer', color: '#6B6A64' },
                  otro: { label: 'Otro', color: '#3D3D3A' },
                  'No especificado': { label: 'No especificado', color: '#EFEFED' },
                }}
                donut
                centerLabel="Total"
                centerValue={plantillaData.totalEmpleados}
              />

              <BarChartComponent
                title="Altas y Bajas"
                description="Últimos 6 meses"
                data={plantillaData.evolucionAltasBajas}
                dataKey={['altas', 'bajas']}
                xAxisKey="mes"
                chartConfig={{
                  altas: {
                    label: 'Altas',
                    color: '#22c55e',
                  },
                  bajas: {
                    label: 'Bajas',
                    color: '#ef4444',
                  },
                }}
              />

              <PieChartComponent
                title="Distribución por Antigüedad"
                description="Empleados según años en la empresa"
                data={plantillaData.distribucionAntiguedad || []}
                dataKey="empleados"
                nameKey="rango"
                chartConfig={{
                  '< 1 año': { label: '< 1 año', color: '#0ea5e9' },
                  '1-3 años': { label: '1-3 años', color: '#d97757' },
                  '3-5 años': { label: '3-5 años', color: '#6B6A64' },
                  '> 5 años': { label: '> 5 años', color: '#22c55e' },
                }}
                donut
              />

              <AreaChartComponent
                title="Rotación mensual"
                description="Bajas sobre plantilla en los últimos 6 meses"
                data={rotacionMensual}
                dataKey="tasa"
                xAxisKey="mes"
                chartConfig={{
                  tasa: {
                    label: 'Tasa de rotación (%)',
                    color: '#ef4444',
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Tab: Compensación */}
        {activeTab === 'compensacion' && compensacionData && (
          <div className="space-y-6">
            {/* KPIs principales de Compensación */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Coste total nómina"
                value={formatCurrency(compensacionData.costeTotalNomina)}
                subtitle={`${formatCurrencyDelta(compensacionData.cambioCoste)} vs mes anterior`}
              />
              <KpiCard
                title="Salario promedio"
                value={formatCurrency(compensacionData.salarioPromedio)}
                subtitle="Bruto mensual por empleado"
              />
              <KpiCard
                title="Brecha salarial (H vs M)"
                value={
                  brechaSalarial
                    ? formatCurrency(Math.abs(brechaSalarial.diferencia))
                    : 'Sin datos'
                }
                subtitle={
                  brechaSalarial
                    ? brechaSalarial.diferencia === 0
                      ? 'Sin diferencia entre géneros'
                      : `${brechaSalarial.direccion === 'hombre' ? 'Mayor en hombres' : 'Mayor en mujeres'} (${formatPercent(
                          brechaSalarial.porcentaje
                        )})`
                    : 'No hay datos suficientes'
                }
              />
              {nominasAnalytics && (
                <KpiCard
                  title="Nóminas procesadas"
                  value={nominasAnalytics.resumen.actual.totalNominas}
                  subtitle={`Variación anual: ${formatSignedNumber(
                    nominasAnalytics.resumen.actual.totalNominas -
                      nominasAnalytics.resumen.anterior.totalNominas
                  )}`}
                />
              )}
            </div>

            {nominasAnalytics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KpiCard
                    title={`Total neto ${nominasAnalytics.currentYear}`}
                    value={formatCurrency(nominasAnalytics.resumen.actual.totalNeto)}
                    subtitle={`Variación vs ${nominasAnalytics.previousYear}: ${formatPercent(
                      nominasAnalytics.resumen.variaciones.totalNeto
                    )}`}
                  />
                  <KpiCard
                    title="Complementos abonados"
                    value={formatCurrency(nominasAnalytics.resumen.actual.totalComplementos)}
                    subtitle={`Variación vs ${nominasAnalytics.previousYear}: ${formatPercent(
                      nominasAnalytics.resumen.variaciones.totalComplementos
                    )}`}
                  />
                  <KpiCard
                    title="Nóminas procesadas"
                    value={nominasAnalytics.resumen.actual.totalNominas}
                    subtitle={`Diferencia vs ${nominasAnalytics.previousYear}: ${
                      nominasAnalytics.resumen.actual.totalNominas -
                      nominasAnalytics.resumen.anterior.totalNominas >= 0
                        ? '+'
                        : ''
                    }${
                      nominasAnalytics.resumen.actual.totalNominas -
                      nominasAnalytics.resumen.anterior.totalNominas
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {nominasAnalytics.tendenciaMensual.length > 0 && (
                    <AreaChartComponent
                      title="Total neto abonado"
                      description={`Evolución mensual ${nominasAnalytics.currentYear}`}
                      data={nominasAnalytics.tendenciaMensual}
                      dataKey="totalNeto"
                      xAxisKey="mes"
                      chartConfig={{
                        totalNeto: {
                          label: 'Total neto',
                          color: '#0ea5e9',
                        },
                      }}
                    />
                  )}

                  {nominasAnalytics.porEquipo.length > 0 && (
                    <BarChartComponent
                      title="Coste neto por equipo"
                      description={`Top equipos ${nominasAnalytics.currentYear}`}
                      data={nominasAnalytics.porEquipo}
                      dataKey="totalNeto"
                      xAxisKey="equipo"
                      chartConfig={{
                        totalNeto: {
                          label: 'Total neto',
                          color: '#6366f1',
                        },
                      }}
                    />
                  )}
                </div>

                {nominasAnalytics.complementosTop.length > 0 && (
                  <BarChartComponent
                    title="Top complementos abonados"
                    description={`Importe total ${nominasAnalytics.currentYear}`}
                    data={nominasAnalytics.complementosTop}
                    dataKey="totalImporte"
                    xAxisKey="nombre"
                    chartConfig={{
                      totalImporte: {
                        label: 'Importe total',
                        color: '#ec4899',
                      },
                    }}
                  />
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChartComponent
                title="Salario Promedio por Equipo"
                description="En euros mensuales"
                data={compensacionData.salarioPromedioEquipo}
                dataKey="promedio"
                xAxisKey="equipo"
                chartConfig={{
                  promedio: {
                    label: 'Salario Promedio',
                    color: '#d97757',
                  },
                }}
              />

              <AreaChartComponent
                title="Evolución Coste Nómina"
                description="Últimos 6 meses"
                data={compensacionData.evolucionCoste}
                dataKey="coste"
                xAxisKey="mes"
                chartConfig={{
                  coste: {
                    label: 'Coste Total',
                    color: '#d97757',
                  },
                }}
              />

              <div className="lg:col-span-2">
                <BarChartComponent
                  title="Distribución Salarial"
                  description="Número de empleados por rango salarial anual"
                  data={compensacionData.distribucionSalarial}
                  dataKey="empleados"
                  xAxisKey="rango"
                  chartConfig={{
                    empleados: {
                      label: 'Empleados',
                      color: '#6B6A64',
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab: Fichajes */}
        {activeTab === 'fichajes' && (
          <div className="space-y-6">
            {/* KPIs de Fichajes */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KpiCard
                title="Total horas mes"
                value={`${fichajesData.totalHorasMes.toFixed(1)}h`}
                subtitle={`${fichajesData.cambioHoras >= 0 ? '+' : ''}${fichajesData.cambioHoras.toFixed(1)}h vs mes anterior`}
              />
              <KpiCard
                title="Promedio horas/día"
                value={`${fichajesData.promedioHorasDia.toFixed(1)}h`}
                subtitle="Media de horas trabajadas diarias"
              />
              <KpiCard
                title="Balance acumulado"
                value={`${fichajesData.balanceAcumulado >= 0 ? '+' : ''}${fichajesData.balanceAcumulado.toFixed(1)}h`}
                subtitle={fichajesData.balanceAcumulado >= 0 ? 'Horas extra' : 'Horas pendientes'}
              />
              <KpiCard
                title="Tasa de absentismo"
                value={`${fichajesData.tasaAbsentismo.toFixed(1)}%`}
                subtitle="Días de ausencia / días posibles"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AreaChartComponent
                title="Horas Trabajadas Diarias"
                description="Total de horas del mes actual (días laborables)"
                data={fichajesData.horasDiarias}
                dataKey="horas"
                xAxisKey="fecha"
                chartConfig={{
                  horas: {
                    label: 'Horas',
                    color: '#d97757',
                  },
                }}
                className="lg:col-span-2"
              />

              <BarChartComponent
                title="Promedio de Horas por Equipo"
                description="Horas trabajadas promedio del mes por equipo"
                data={fichajesData.promedioHorasPorEquipo}
                dataKey="promedio"
                xAxisKey="equipo"
                chartConfig={{
                  promedio: {
                    label: 'Horas Promedio',
                    color: '#d97757',
                  },
                }}
              />

              <BarChartComponent
                title="Tasa de Absentismo por Equipo"
                description="Porcentaje de ausencias por equipo"
                data={fichajesData.tasaAbsentismoPorEquipo}
                dataKey="tasa"
                xAxisKey="equipo"
                chartConfig={{
                  tasa: {
                    label: 'Absentismo (%)',
                    color: '#ef4444',
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
