'use client';

// ========================================
// Analytics - Client Component con Datos Reales
// ========================================

import { useState, useEffect } from 'react';
import { AnalyticsFilters, FilterValues } from '@/components/analytics/filters';
import { BarChartComponent } from '@/components/analytics/bar-chart';
import { AreaChartComponent } from '@/components/analytics/area-chart';
import { PieChartComponent } from '@/components/analytics/pie-chart';
import { KpiCard } from '@/components/analytics/kpi-card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

interface PlantillaData {
  totalEmpleados: number;
  cambioMes: number;
  porDepartamento: Array<{ departamento: string; empleados: number }>;
  evolucionPlantilla: Array<{ mes: string; empleados: number }>;
  altasMes: number;
  bajasMes: number;
}

interface CompensacionData {
  costeTotalNomina: number;
  cambioCoste: number;
  salarioPromedio: number;
  salarioPromedioDpto: Array<{ departamento: string; promedio: number }>;
  evolucionCoste: Array<{ mes: string; coste: number }>;
  distribucionSalarial: Array<{ rango: string; empleados: number }>;
}

interface FichajesData {
  totalHorasMes: number;
  cambioHoras: number;
  promedioHorasDia: number;
  horasDiarias: Array<{ fecha: string; horas: number }>;
  tasaAbsentismo: number;
  balanceAcumulado: number;
}

export function AnalyticsClient() {
  const [filters, setFilters] = useState<FilterValues>({
    genero: 'todos',
    equipo: 'todos',
    antiguedad: 'todos',
  });

  const [plantillaData, setPlantillaData] = useState<PlantillaData | null>(null);
  const [compensacionData, setCompensacionData] = useState<CompensacionData | null>(null);
  const [fichajesData, setFichajesData] = useState<FichajesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
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

      const [plantilla, compensacion, fichajes] = await Promise.all([
        plantillaRes.json(),
        compensacionRes.json(),
        fichajesRes.json(),
      ]);

      setPlantillaData(plantilla);
      setCompensacionData(compensacion);
      setFichajesData(fichajes);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading || !plantillaData || !compensacionData || !fichajesData) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-gray-500">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>
        <AnalyticsFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onExport={handleExport}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6 space-y-8">
        {/* Sección: Plantilla */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plantilla</h2>

          {/* KPIs de Plantilla */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <KpiCard
              title="Total Empleados"
              value={plantillaData.totalEmpleados}
              trend={{
                value: plantillaData.cambioMes,
                isPositive: plantillaData.cambioMes >= 0,
              }}
            />
            <KpiCard
              title="Altas del Mes"
              value={plantillaData.altasMes}
              subtitle="Nuevas incorporaciones"
            />
            <KpiCard
              title="Bajas del Mes"
              value={plantillaData.bajasMes}
              subtitle="Empleados dados de baja"
            />
            <KpiCard
              title="Tasa de Rotación"
              value={`${plantillaData.totalEmpleados > 0 ? ((plantillaData.bajasMes / plantillaData.totalEmpleados) * 100).toFixed(1) : 0}%`}
              subtitle="Del mes actual"
            />
          </div>

          {/* Gráficos de Plantilla */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChartComponent
              title="Empleados por Departamento"
              description="Distribución actual de la plantilla"
              data={plantillaData.porDepartamento}
              dataKey="empleados"
              xAxisKey="departamento"
              chartConfig={{
                empleados: {
                  label: 'Empleados',
                  color: '#F26C21',
                },
              }}
              footer={
                <div className="flex items-center gap-2 leading-none font-medium">
                  Total: {plantillaData.totalEmpleados} empleados
                </div>
              }
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
                  color: '#F26C21',
                },
              }}
              footer={
                <div className="flex items-center gap-2 leading-none font-medium">
                  {plantillaData.cambioMes >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {plantillaData.cambioMes >= 0 ? '+' : ''}
                  {plantillaData.cambioMes} empleados este mes
                </div>
              }
            />
          </div>
        </div>

        {/* Sección: Compensación */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compensación</h2>

          {/* KPIs de Compensación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <KpiCard
              title="Coste Nómina Mensual"
              value={`${compensacionData.costeTotalNomina.toLocaleString()}€`}
              trend={{
                value: Math.round(
                  (compensacionData.cambioCoste / compensacionData.costeTotalNomina) * 100
                ),
                isPositive: compensacionData.cambioCoste >= 0,
              }}
            />
            <KpiCard
              title="Salario Promedio"
              value={`${compensacionData.salarioPromedio.toLocaleString()}€`}
              subtitle="Por empleado/mes"
            />
            <KpiCard
              title="Cambio Coste"
              value={`${compensacionData.cambioCoste >= 0 ? '+' : ''}${compensacionData.cambioCoste.toLocaleString()}€`}
              subtitle="vs mes anterior"
            />
          </div>

          {/* Gráficos de Compensación */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BarChartComponent
              title="Salario Promedio por Departamento"
              description="En euros mensuales"
              data={compensacionData.salarioPromedioDpto}
              dataKey="promedio"
              xAxisKey="departamento"
              chartConfig={{
                promedio: {
                  label: 'Salario Promedio',
                  color: '#F26C21',
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
                  color: '#F26C21',
                },
              }}
            />
          </div>

          {/* Distribución Salarial */}
          <div className="mt-6">
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

        {/* Sección: Fichajes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fichajes</h2>

          {/* KPIs de Fichajes */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <KpiCard
              title="Total Horas Mes"
              value={`${fichajesData.totalHorasMes.toLocaleString()}h`}
              trend={{
                value: Math.round((fichajesData.cambioHoras / fichajesData.totalHorasMes) * 100),
                isPositive: fichajesData.cambioHoras >= 0,
              }}
            />
            <KpiCard
              title="Promedio Horas/Día"
              value={`${fichajesData.promedioHorasDia}h`}
              subtitle="Por empleado"
            />
            <KpiCard
              title="Tasa Absentismo"
              value={`${fichajesData.tasaAbsentismo}%`}
              subtitle="Del mes actual"
            />
            <KpiCard
              title="Balance Acumulado"
              value={`${fichajesData.balanceAcumulado >= 0 ? '+' : ''}${fichajesData.balanceAcumulado}h`}
              subtitle="Horas extras/menos"
            />
          </div>

          {/* Gráfico de Horas Trabajadas */}
          <div className="grid grid-cols-1 gap-6">
            <AreaChartComponent
              title="Horas Trabajadas Diarias"
              description="Total de horas del mes actual (días laborables)"
              data={fichajesData.horasDiarias}
              dataKey="horas"
              xAxisKey="fecha"
              chartConfig={{
                horas: {
                  label: 'Horas',
                  color: '#F26C21',
                },
              }}
              footer={
                <div className="flex items-center gap-2 leading-none font-medium">
                  Promedio: {fichajesData.promedioHorasDia}h por empleado/día
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
