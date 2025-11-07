'use client';

// ========================================
// Payroll - Client Component
// ========================================
// UI completa del workflow de nóminas

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, Upload, Download, AlertCircle, Plus, Calendar, CheckCircle, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PayrollClientProps {
  nominasMesActual: number;
  totalBruto: number;
  pendientesRevision: number;
  hayNominas: boolean;
  mesActual: number;
  anioActual: number;
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function PayrollClient({
  nominasMesActual,
  totalBruto,
  pendientesRevision,
  hayNominas,
  mesActual,
  anioActual,
}: PayrollClientProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const nombreMes = meses[mesActual - 1];

  const handleGenerarEvento = async () => {
    try {
      setIsGenerating(true);

      const response = await fetch('/api/nominas/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: mesActual,
          anio: anioActual,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar evento');
      }

      toast.success(`Pre-nóminas generadas: ${data.nominasGeneradas} nóminas`, {
        description: `${data.notificacionesEnviadas} managers notificados`,
      });

      // Redirigir a la vista de eventos
      router.push('/hr/payroll/eventos');
      router.refresh();
    } catch (error) {
      console.error('Error generando evento:', error);
      toast.error(error instanceof Error ? error.message : 'Error al generar evento');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nóminas</h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona el ciclo completo de nóminas mensuales
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/hr/payroll/eventos')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Ver Eventos
            </Button>
            <Button
              className="btn-primary"
              onClick={handleGenerarEvento}
              disabled={isGenerating}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isGenerating ? 'Generando...' : 'Generar Evento Mensual'}
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
                  <FileText className="w-6 h-6 text-[#d97757]" />
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

        {/* Workflow Steps */}
        <Card className="p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Workflow de Nóminas Mensual
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[#d97757] text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Generar Evento Mensual
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Crea el evento del mes y genera automáticamente todas las pre-nóminas
                  con cálculo de salarios, ausencias y complementos.
                </p>
                <Button
                  size="sm"
                  onClick={handleGenerarEvento}
                  disabled={isGenerating}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generar {nombreMes} {anioActual}
                </Button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Asignar Complementos
                </h3>
                <p className="text-sm text-gray-600">
                  Los managers revisan y asignan importes de complementos variables
                  (bonus, comisiones, etc.) para cada empleado.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Exportar a Excel
                </h3>
                <p className="text-sm text-gray-600">
                  Exporta todos los datos a Excel para enviar a la gestoría externa.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Importar PDFs Definitivos
                </h3>
                <p className="text-sm text-gray-600">
                  Sube las nóminas definitivas en PDF que devuelve la gestoría.
                  Se asocian automáticamente a cada empleado.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                5
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Publicar y Notificar
                </h3>
                <p className="text-sm text-gray-600">
                  Publica las nóminas para que los empleados las vean en su área personal
                  y se envían notificaciones automáticas.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Empty State - Mostrar cuando no hay nóminas */}
        {!hayNominas && (
          <Card className="p-12 mt-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-[#d97757]" />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay nóminas registradas
              </h3>

              <p className="text-gray-600 max-w-md mb-8">
                Genera tu primer evento mensual para crear automáticamente las pre-nóminas
                de todos los empleados activos con cálculo de salarios y complementos.
              </p>

              <Button
                className="btn-primary"
                onClick={handleGenerarEvento}
                disabled={isGenerating}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generando...' : 'Generar Primer Evento'}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
