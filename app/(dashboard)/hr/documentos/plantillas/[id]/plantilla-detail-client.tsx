'use client';

// ========================================
// Plantilla Detail Client Component
// ========================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Eye,
  Edit,
  Send,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  FileType,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GenerarDesdePlantillaModal } from '@/components/hr/generar-desde-plantilla-modal';

interface PlantillaDetailClientProps {
  plantilla: {
    id: string;
    nombre: string;
    descripcion: string | null;
    categoria: string | null;
    tipo: string;
    formato: string;
    esOficial: boolean;
    activa: boolean;
    requiereContrato: boolean;
    requiereFirma: boolean;
    carpetaDestinoDefault: string | null;
    variablesUsadas: string[];
    usarIAParaExtraer: boolean;
    configuracionIA: any;
    totalDocumentosGenerados: number;
    createdAt: string;
    updatedAt: string;
    documentosGenerados: Array<{
      id: string;
      empleadoNombre: string;
      generadoEn: string;
      documentoId: string;
      firmado: boolean;
      requiereFirma: boolean;
    }>;
  };
}

export function PlantillaDetailClient({ plantilla }: PlantillaDetailClientProps) {
  const router = useRouter();
  const [modalGenerarMasivo, setModalGenerarMasivo] = useState(false);

  return (
    <>
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/hr/documentos?tab=plantillas')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{plantilla.nombre}</h1>

                {/* Badges */}
                {plantilla.esOficial && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Oficial
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {plantilla.formato === 'docx' ? 'DOCX' : 'PDF Rellenable'}
                </span>
                {plantilla.categoria && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    {plantilla.categoria}
                  </span>
                )}
                {plantilla.requiereFirma && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Requiere firma
                  </span>
                )}
                {!plantilla.activa && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Inactiva
                  </span>
                )}
              </div>

              {plantilla.descripcion && (
                <p className="text-sm text-gray-600 max-w-3xl">{plantilla.descripcion}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implementar previsualización
                  alert('Previsualización próximamente');
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Previsualizar
              </Button>
              {!plantilla.esOficial && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // TODO: Implementar edición
                    alert('Edición de metadata próximamente');
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button onClick={() => setModalGenerarMasivo(true)}>
                <Send className="w-4 h-4 mr-2" />
                Enviar en masa
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 pb-6">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Documentos generados</span>
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{plantilla.totalDocumentosGenerados}</p>
            </div>

            <div className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Variables utilizadas</span>
                <FileType className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{plantilla.variablesUsadas.length}</p>
            </div>

            <div className="border rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Última generación</span>
                <Clock className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                {plantilla.documentosGenerados.length > 0
                  ? format(new Date(plantilla.documentosGenerados[0].generadoEn), "d MMM yyyy 'a las' HH:mm", { locale: es })
                  : 'Nunca'}
              </p>
            </div>
          </div>

          {/* Variables utilizadas */}
          <div className="border rounded-lg p-6 bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileType className="w-5 h-5" />
              Variables utilizadas ({plantilla.variablesUsadas.length})
            </h2>
            {plantilla.variablesUsadas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {plantilla.variablesUsadas.map((variable) => (
                  <div
                    key={variable}
                    className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <code className="font-mono text-xs">{`{{${variable}}}`}</code>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay variables definidas para esta plantilla</p>
            )}
          </div>

          {/* Configuración */}
          <div className="border rounded-lg p-6 bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-600">Tipo</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {plantilla.esOficial ? 'Plantilla oficial' : 'Plantilla personalizada'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-600">Formato</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {plantilla.formato === 'docx' ? 'Microsoft Word (DOCX)' : 'PDF Rellenable'}
                </dd>
              </div>
              {plantilla.carpetaDestinoDefault && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">Carpeta destino</dt>
                  <dd className="text-sm text-gray-900 mt-1">{plantilla.carpetaDestinoDefault}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-600">Estado</dt>
                <dd className="text-sm text-gray-900 mt-1">
                  {plantilla.activa ? 'Activa' : 'Inactiva'}
                </dd>
              </div>
              {plantilla.requiereContrato && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">Requiere contrato</dt>
                  <dd className="text-sm text-gray-900 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Sí
                  </dd>
                </div>
              )}
              {plantilla.requiereFirma && (
                <div>
                  <dt className="text-sm font-medium text-gray-600">Requiere firma digital</dt>
                  <dd className="text-sm text-gray-900 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    Sí
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Historial de generaciones */}
          <div className="border rounded-lg p-6 bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Historial de generaciones (últimos 10)
            </h2>
            {plantilla.documentosGenerados.length > 0 ? (
              <div className="space-y-3">
                {plantilla.documentosGenerados.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.empleadoNombre}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(doc.generadoEn), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.requiereFirma && (
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            doc.firmado
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {doc.firmado ? 'Firmado' : 'Pendiente firma'}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // TODO: Ver documento
                          alert('Ver documento próximamente');
                        }}
                      >
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No hay documentos generados aún</p>
                <p className="text-sm">Usa el botón "Enviar en masa" para generar documentos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Generar Masivo */}
      <GenerarDesdePlantillaModal
        open={modalGenerarMasivo}
        onOpenChange={setModalGenerarMasivo}
        onSuccess={() => {
          router.refresh();
        }}
        plantillaIdPreseleccionada={plantilla.id}
      />
    </>
  );
}

