'use client';

// ========================================
// Nomina Details - Client Component
// ========================================
// Detalles completos de una nómina individual

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  CreditCard,
  Download,
  FileText,
  Upload,
  User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NOMINA_ESTADO_LABELS, NOMINA_ESTADOS } from '@/lib/constants/nomina-estados';

interface NominaDetailsClientProps {
  nomina: {
    id: string;
    empleadoId: string;
    mes: number;
    anio: number;
    estado: string;
    salarioBase: number;
    totalComplementos: number;
    totalDeducciones: number;
    totalBruto: number;
    totalNeto: number;
    diasTrabajados: number;
    diasAusencias: number;
    empleado: {
      id: string;
      nombre: string;
      apellidos: string;
      email: string;
      numeroSeguroSocial: string | null;
      iban: string | null;
      equipos: Array<{
        equipo: {
          id: string;
          nombre: string;
        } | null;
      }>;
    };
    contrato: {
      puesto: string;
      tipoContrato: string;
    } | null;
    complementosAsignados: Array<{
      id: string;
      importe: number;
      empleadoComplemento: {
        tipoComplemento: {
          nombre: string;
          descripcion: string | null;
        };
      };
    }>;
    documento: {
      id: string;
      url: string;
      nombre: string;
    } | null;
    eventoNomina: {
      id: string;
      mes: number;
      anio: number;
      estado: string;
    } | null;
    alertas: Array<{
      id: string;
      tipo: string;
      categoria: string;
      codigo: string;
      mensaje: string;
      detalles: Record<string, unknown>;
      accionUrl: string | null;
      createdAt: string;
    }>;
  };
  ausencias: Array<{
    id: string;
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    estado: string;
  }>;
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const estadoBadgeStyles: Record<string, string> = {
  [NOMINA_ESTADOS.PENDIENTE]: 'bg-orange-50 text-orange-700',
  [NOMINA_ESTADOS.COMPLETADA]: 'bg-green-50 text-green-700',
  [NOMINA_ESTADOS.PUBLICADA]: 'bg-gray-900 text-white',
};

const tiposAusenciaLabels: Record<string, string> = {
  vacaciones: 'Vacaciones',
  baja_it: 'Baja IT',
  permiso_retribuido: 'Permiso Retribuido',
  permiso_no_retribuido: 'Permiso No Retribuido',
  excedencia: 'Excedencia',
};

export function NominaDetailsClient({ nomina, ausencias }: NominaDetailsClientProps) {
  const router = useRouter();
  const [uploadingPDF, setUploadingPDF] = useState(false);

  const equiposEmpleado = nomina.empleado.equipos
    .map((relacion) => relacion.equipo?.nombre)
    .filter((nombre): nombre is string => Boolean(nombre));
  const equiposLabel = equiposEmpleado.length > 0 ? equiposEmpleado.join(', ') : '-';

  const estadoInfo = NOMINA_ESTADO_LABELS[nomina.estado]
    ? {
        label: NOMINA_ESTADO_LABELS[nomina.estado].label,
        color: estadoBadgeStyles[nomina.estado] || 'bg-gray-100 text-gray-700',
      }
    : {
    label: nomina.estado,
        color: 'bg-gray-100 text-gray-700',
  };

  const handleDownloadPDF = async () => {
    if (!nomina.documento) {
      toast.error('No hay PDF disponible para esta nómina');
      return;
    }

    try {
      const response = await fetch(`/api/nominas/${nomina.id}/pdf`);

      if (!response.ok) {
        throw new Error('Error al descargar el PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomina.documento.nombre || `nomina-${meses[nomina.mes - 1]}-${nomina.anio}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast.error('Error al descargar el PDF');
    }
  };

  const handleUploadPDF = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setUploadingPDF(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('nominaId', nomina.id);

        const response = await fetch(`/api/nominas/${nomina.id}/upload-pdf`, {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al subir el PDF');
        }

        toast.success('PDF subido correctamente');
        router.refresh();
      } catch (error) {
        console.error('Error subiendo PDF:', error);
        toast.error(error instanceof Error ? error.message : 'Error al subir el PDF');
      } finally {
        setUploadingPDF(false);
      }
    };

    input.click();
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/hr/payroll')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Nómina - {meses[nomina.mes - 1]} {nomina.anio}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {nomina.empleado.nombre} {nomina.empleado.apellidos}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${estadoInfo.color}`}>
              {estadoInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6 space-y-6">
        {/* Alertas */}
        {nomina.alertas && nomina.alertas.length > 0 && (
          <Card className="p-6 border-orange-200 bg-orange-50/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Alertas ({nomina.alertas.length})
                </h2>
                <p className="text-sm text-gray-600">Incidencias detectadas que requieren atención</p>
              </div>
            </div>

            <div className="space-y-3">
              {nomina.alertas.map((alerta) => {
                const tipoColor = {
                  critico: 'border-red-200 bg-red-50',
                  advertencia: 'border-orange-200 bg-orange-50',
                  info: 'border-blue-200 bg-blue-50',
                }[alerta.tipo] || 'border-gray-200 bg-gray-50';

                const tipoIcono = {
                  critico: <AlertCircle className="w-5 h-5 text-red-600" />,
                  advertencia: <AlertCircle className="w-5 h-5 text-orange-600" />,
                  info: <AlertCircle className="w-5 h-5 text-blue-600" />,
                }[alerta.tipo];

                const tipoLabel = {
                  critico: 'Crítico',
                  advertencia: 'Advertencia',
                  info: 'Información',
                }[alerta.tipo] || alerta.tipo;

                return (
                  <div
                    key={alerta.id}
                    className={`p-4 rounded-lg border ${tipoColor}`}
                  >
                    <div className="flex items-start gap-3">
                      {tipoIcono}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{tipoLabel}</span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs text-gray-600">{alerta.categoria}</span>
                        </div>
                        <p className="text-sm text-gray-700">{alerta.mensaje}</p>
                        {alerta.detalles && (
                          <div className="mt-2 text-xs text-gray-600">
                            {typeof alerta.detalles === 'object'
                              ? Object.entries(alerta.detalles).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-medium">{key}:</span> {String(value)}
                                  </div>
                                ))
                              : String(alerta.detalles)}
                          </div>
                        )}
                        {alerta.accionUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => router.push(alerta.accionUrl || '#')}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Datos del Empleado */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Datos del Empleado</h2>
              <p className="text-sm text-gray-600">Información personal y laboral</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Nombre Completo</div>
              <div className="font-medium text-gray-900">
                {nomina.empleado.nombre} {nomina.empleado.apellidos}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Email</div>
              <div className="font-medium text-gray-900">{nomina.empleado.email}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Equipos</div>
              <div className="font-medium text-gray-900">
                {equiposLabel}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Puesto</div>
              <div className="font-medium text-gray-900">
                {nomina.contrato?.puesto || '-'}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Número Seguridad Social</div>
              <div className="font-medium text-gray-900">
                {nomina.empleado.numeroSeguroSocial || (
                  <span className="text-orange-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Sin configurar
                  </span>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">IBAN</div>
              <div className="font-medium text-gray-900">
                {nomina.empleado.iban || (
                  <span className="text-orange-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Sin configurar
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Período */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Período</h2>
              <p className="text-sm text-gray-600">Información del período de nómina</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Mes/Año</div>
              <div className="font-medium text-gray-900">
                {meses[nomina.mes - 1]} {nomina.anio}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Días Trabajados</div>
              <div className="font-medium text-gray-900">{nomina.diasTrabajados} días</div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Días de Ausencias</div>
              <div className="font-medium text-gray-900">{nomina.diasAusencias} días</div>
            </div>
          </div>
        </Card>

        {/* Compensación */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Compensación</h2>
              <p className="text-sm text-gray-600">Salario y complementos</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="text-gray-700">Salario Base</div>
              <div className="font-medium text-gray-900">
                €{nomina.salarioBase.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {nomina.complementosAsignados.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 mt-4 mb-2">Complementos:</div>
                {nomina.complementosAsignados.map((comp) => (
                  <div key={comp.id} className="flex items-center justify-between py-2 pl-4">
                    <div className="text-sm text-gray-600">
                      {comp.empleadoComplemento.tipoComplemento.nombre}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      €{comp.importe.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between py-3 border-b">
              <div className="text-gray-700">Total Complementos</div>
              <div className="font-medium text-gray-900">
                €{nomina.totalComplementos.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="text-gray-700">Total Bruto</div>
              <div className="font-semibold text-gray-900">
                €{nomina.totalBruto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="text-gray-700">Deducciones</div>
              <div className="font-medium text-red-600">
                -€{nomina.totalDeducciones.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center justify-between py-4 bg-green-50 rounded-lg px-4 mt-4">
              <div className="text-lg font-semibold text-gray-900">Total Neto</div>
              <div className="text-xl font-bold text-green-600">
                €{nomina.totalNeto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </Card>

        {/* Incidencias (Ausencias) */}
        {ausencias.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Incidencias</h2>
                <p className="text-sm text-gray-600">Ausencias del período</p>
              </div>
            </div>

            <div className="space-y-3">
              {ausencias.map((ausencia) => (
                <div key={ausencia.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      {tiposAusenciaLabels[ausencia.tipo] || ausencia.tipo}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(ausencia.fechaInicio).toLocaleDateString('es-ES')} -{' '}
                      {new Date(ausencia.fechaFin).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 capitalize">{ausencia.estado}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* PDF Documento */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Documento PDF</h2>
              <p className="text-sm text-gray-600">
                Nómina definitiva en PDF {nomina.documento ? '' : '(pendiente de subida)'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {nomina.documento ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleUploadPDF}
                  disabled={uploadingPDF}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingPDF ? 'Subiendo...' : 'Reemplazar PDF'}
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">PDF disponible</span>
                </div>
              </>
            ) : (
              <Button
                className="btn-primary"
                onClick={handleUploadPDF}
                disabled={uploadingPDF}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingPDF ? 'Subiendo...' : 'Subir PDF'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
