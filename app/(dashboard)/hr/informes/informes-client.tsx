'use client';

// ========================================
// Analytics/Informes - Client Component
// ========================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Download, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Mock data
const asistenciaData = [
  { mes: 'Ene', asistencia: 95, ausencias: 5 },
  { mes: 'Feb', asistencia: 92, ausencias: 8 },
  { mes: 'Mar', asistencia: 97, ausencias: 3 },
  { mes: 'Abr', asistencia: 94, ausencias: 6 },
  { mes: 'May', asistencia: 96, ausencias: 4 },
  { mes: 'Jun', asistencia: 93, ausencias: 7 },
];

const ausenciasTipoData = [
  { tipo: 'Vacaciones', value: 45, color: '#d97757' },
  { tipo: 'Enfermedad', value: 30, color: '#6B6A64' },
  { tipo: 'Permisos', value: 15, color: '#3D3D3A' },
  { tipo: 'Otros', value: 10, color: '#EFEFED' },
];

const equiposData = [
  { equipo: 'Tech', empleados: 25 },
  { equipo: 'Ventas', empleados: 18 },
  { equipo: 'Marketing', empleados: 12 },
  { equipo: 'HR', empleados: 8 },
  { equipo: 'Finanzas', empleados: 10 },
];

const horasTrabajadasData = [
  { semana: 'S1', horas: 38.5 },
  { semana: 'S2', horas: 40.2 },
  { semana: 'S3', horas: 39.8 },
  { semana: 'S4', horas: 41.0 },
];

export function InformesClient() {
  const [periodo, setPeriodo] = useState('ultimo-mes');
  const [equipo, setEquipo] = useState('todos');

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Exportando datos...');
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header con filtros */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Informes</h1>
          
          {/* Filtros y Exportar */}
          <div className="flex items-center gap-3">
            {/* Filtro de Periodo */}
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultima-semana">Última semana</SelectItem>
                <SelectItem value="ultimo-mes">Último mes</SelectItem>
                <SelectItem value="ultimo-trimestre">Último trimestre</SelectItem>
                <SelectItem value="ultimo-ano">Último año</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtro de Equipo */}
            <Select value={equipo} onValueChange={setEquipo}>
              <SelectTrigger className="w-[180px]">
                <Users className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="tech">Tech</SelectItem>
                <SelectItem value="ventas">Ventas</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="finanzas">Finanzas</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón Exportar */}
            <Button onClick={handleExport} className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Gráficos agrupados por categorías */}
      <div className="flex-1 overflow-y-auto pb-6 space-y-8">
        {/* Categoría: Asistencia */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Asistencia</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Tendencia de Asistencia */}
            <Card className="p-6">
              <h3 className="text-base font-medium text-gray-700 mb-4">
                Tendencia de Asistencia (%)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={asistenciaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEFED" />
                  <XAxis dataKey="mes" stroke="#6B6A64" />
                  <YAxis stroke="#6B6A64" />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="asistencia"
                    stroke="#d97757"
                    strokeWidth={2}
                    name="Asistencia"
                  />
                  <Line
                    type="monotone"
                    dataKey="ausencias"
                    stroke="#6B6A64"
                    strokeWidth={2}
                    name="Ausencias"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Gráfico 2: Tipos de Ausencias */}
            <Card className="p-6">
              <h3 className="text-base font-medium text-gray-700 mb-4">
                Tipos de Ausencias
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={ausenciasTipoData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) =>
                      `${props.tipo}: ${(props.percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ausenciasTipoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        {/* Categoría: Plantilla */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plantilla</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 3: Empleados por Equipo */}
            <Card className="p-6">
              <h3 className="text-base font-medium text-gray-700 mb-4">
                Empleados por Equipo
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={equiposData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEFED" />
                  <XAxis dataKey="equipo" stroke="#6B6A64" />
                  <YAxis stroke="#6B6A64" />
                  <Tooltip />
                  <Bar dataKey="empleados" fill="#d97757" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Gráfico 4: Horas Trabajadas Promedio */}
            <Card className="p-6">
              <h3 className="text-base font-medium text-gray-700 mb-4">
                Horas Trabajadas Promedio (Semanal)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={horasTrabajadasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EFEFED" />
                  <XAxis dataKey="semana" stroke="#6B6A64" />
                  <YAxis stroke="#6B6A64" domain={[30, 45]} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="horas"
                    stroke="#d97757"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>

        {/* Categoría: Resumen General */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen General</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-2">Total Empleados</div>
              <div className="text-3xl font-bold text-gray-900">73</div>
              <div className="text-xs text-green-600 mt-2">+5 este mes</div>
            </Card>

            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-2">Tasa Asistencia</div>
              <div className="text-3xl font-bold text-gray-900">94.5%</div>
              <div className="text-xs text-green-600 mt-2">+2.3% vs mes anterior</div>
            </Card>

            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-2">Ausencias Mes</div>
              <div className="text-3xl font-bold text-gray-900">18</div>
              <div className="text-xs text-red-600 mt-2">-3 vs mes anterior</div>
            </Card>

            <Card className="p-6">
              <div className="text-sm text-gray-600 mb-2">Horas Promedio</div>
              <div className="text-3xl font-bold text-gray-900">39.8h</div>
              <div className="text-xs text-gray-600 mt-2">Por semana</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

