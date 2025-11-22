// ========================================
// Bandeja de Entrada - Auto-completed Tab
// ========================================

'use client';

import { Calendar, CheckCircle2, Clock, FileCheck } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface SolvedStats {
  fichajesActualizados: number;
  ausenciasRevisadas: number;
  nominasRevisadas: number;
}

interface SolvedItem {
  id: string;
  tipo: 'fichaje' | 'ausencia' | 'nomina' | 'contrato' | 'solicitud';
  descripcion: string;
  empleado: string;
  fecha: Date;
  accion: string;
}

interface BandejaEntradaSolvedProps {
  stats: SolvedStats;
  items: SolvedItem[];
}

export function BandejaEntradaSolved({ stats, items }: BandejaEntradaSolvedProps) {
  // Iconos sin fondo - siempre gris oscuro según sistema de diseño
  const getIconForType = (tipo: string) => {
    switch (tipo) {
      case 'fichaje':
        return <Clock className="w-5 h-5 text-gray-600" />;
      case 'ausencia':
        return <Calendar className="w-5 h-5 text-gray-600" />;
      case 'nomina':
      case 'contrato':
        return <FileCheck className="w-5 h-5 text-gray-600" />;
      case 'solicitud':
        return <CheckCircle2 className="w-5 h-5 text-gray-600" />;
      default:
        return <CheckCircle2 className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {stats.fichajesActualizados}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Fichajes actualizados
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {stats.ausenciasRevisadas}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Ausencias revisadas
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {stats.nominasRevisadas}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                Nóminas revisadas
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solved Items Table */}
      <Card className="min-h-[400px]">
        <CardContent className="pt-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CheckCircle2 className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay elementos resueltos</p>
              <p className="text-sm">
                Los elementos completados automáticamente aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empleado
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getIconForType(item.tipo)}
                          <span className="text-sm text-gray-700 capitalize">
                            {item.tipo}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-900">
                          {item.descripcion}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-700">{item.empleado}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {item.accion}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-500">
                          {item.fecha.toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
