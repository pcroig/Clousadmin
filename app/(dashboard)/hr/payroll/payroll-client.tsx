'use client';

// ========================================
// Payroll - Client Component
// ========================================

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Upload, Download, AlertCircle } from 'lucide-react';

interface PayrollClientProps {
  nominasMesActual: number;
  totalBruto: number;
  pendientesRevision: number;
  hayNominas: boolean;
  mesActual: number;
  anioActual: number;
}

const meses = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function PayrollClient({
  nominasMesActual,
  totalBruto,
  pendientesRevision,
  hayNominas,
  mesActual,
  anioActual,
}: PayrollClientProps) {
  const nombreMes = meses[mesActual - 1];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Nóminas</h1>
          
          <div className="flex gap-3">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Subir Nómina
            </Button>
            <Button className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        {/* Stats Cards - Solo mostrar si hay nóminas */}
        {hayNominas && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Nóminas Mes Actual</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {nominasMesActual}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      pendientesRevision === 0
                        ? 'text-green-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {pendientesRevision === 0
                      ? 'Todas procesadas'
                      : `${pendientesRevision} pendientes`}
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <FileText className="w-6 h-6 text-[#F26C21]" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Total Bruto</div>
                  <div className="text-3xl font-bold text-gray-900">
                    €{totalBruto.toLocaleString('es-ES', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    {nombreMes} {anioActual}
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Pendientes Revisión</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {pendientesRevision}
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    {pendientesRevision === 0
                      ? 'Sin pendientes'
                      : 'Requieren atención'}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Empty State - Mostrar cuando no hay nóminas */}
        {!hayNominas && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-[#F26C21]" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay nóminas registradas
              </h3>
              
              <p className="text-gray-600 max-w-md mb-8">
                Sube tu primera nómina para comenzar a gestionarlas. 
                Extracción automática de datos con IA y validación inteligente.
              </p>

              <div className="flex gap-3">
                <Button className="btn-primary">
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Primera Nómina
                </Button>
                <Button variant="outline">
                  Ver Tutorial
                </Button>
              </div>

              {/* Features List */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#F26C21]" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm mb-1">
                      Extracción Automática
                    </div>
                    <div className="text-xs text-gray-600">
                      IA extrae datos de PDFs automáticamente
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-[#F26C21]" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm mb-1">
                      Detección de Anomalías
                    </div>
                    <div className="text-xs text-gray-600">
                      Alertas automáticas de descuadres
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Download className="w-4 h-4 text-[#F26C21]" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm mb-1">
                      Exportación Excel
                    </div>
                    <div className="text-xs text-gray-600">
                      Exporta para tu gestoría
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Placeholder cuando hay nóminas pero aún no hay funcionalidad completa */}
        {hayNominas && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-[#F26C21]" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Gestión de Nóminas
              </h3>
              
              <p className="text-gray-600 max-w-md mb-8">
                Aquí podrás ver y gestionar todas las nóminas de tus empleados. 
                Funcionalidades de visualización y exportación próximamente.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

