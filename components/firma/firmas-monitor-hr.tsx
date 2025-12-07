'use client';

import { AlertCircle, FileSignature, FileText, Signature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

interface ApiFirmaPendiente {
  id: string;
  orden: number;
  firmado: boolean;
  empleadoId: string;
  solicitudes_firma: {
    id: string;
    titulo: string;
    mensaje?: string;
    ordenFirma: boolean;
    estado: string;
    documento: {
      id: string;
      nombre: string;
      tipoDocumento: string;
    };
  };
  empleados: {
    nombre: string;
    apellidos: string;
    email: string;
  };
}

interface FirmaDisplay {
  id: string;
  orden: number;
  firmado: boolean;
  empleadoNombre: string;
  empleadoEmail: string;
  requiereOrden: boolean;
  solicitudId: string;
  solicitudTitulo: string;
  solicitudMensaje?: string;
  solicitudEstado: string;
  solicitudCreada?: string;
  solicitudCompletada?: string;
  mantenerOriginal?: boolean;
  documentoId: string;
  documentoNombre: string;
  documentoFirmadoS3Key?: string;
  totalFirmantes: number;
  firmadasCount: number;
}

export function FirmasMonitorHR() {
  const router = useRouter();
  const [firmas, setFirmas] = useState<FirmaDisplay[]>([]);
  const [selectedFirmaId, setSelectedFirmaId] = useState<string | null>(null);
  const [loadingFirmas, setLoadingFirmas] = useState(true);
  const [errorFirmas, setErrorFirmas] = useState<string | null>(null);
  const [cacheBuster] = useState(() => Date.now());
  const [filtro, setFiltro] = useState<'todas' | 'pendientes' | 'completadas'>('todas');

  const cargarFirmas = useCallback(() => {
    setLoadingFirmas(true);
    setErrorFirmas(null);
    // HR obtiene todas las firmas de la empresa
    fetch('/api/firma/solicitudes')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Error al cargar firmas');
        }
        return parseJson<{ solicitudes: any[] }>(res);
      })
      .then((data) => {
        const items = data?.solicitudes ?? [];
        // Extraer todas las firmas de todas las solicitudes
        const todasLasFirmas: FirmaDisplay[] = [];

        items.forEach((solicitud: any) => {
          if (solicitud.firmas && Array.isArray(solicitud.firmas)) {
            const firmadasCount = solicitud.firmas.filter((f: any) => f.firmado).length;
            const totalFirmantes = solicitud.firmas.length;

            solicitud.firmas.forEach((firma: any) => {
              todasLasFirmas.push({
                id: firma.id,
                orden: firma.orden || 0,
                firmado: firma.firmado || false,
                empleadoNombre: firma.empleados ? `${firma.empleados.nombre} ${firma.empleados.apellidos}` : 'Desconocido',
                empleadoEmail: firma.empleados?.email || '',
                requiereOrden: solicitud.ordenFirma || false,
                solicitudId: solicitud.id,
                solicitudTitulo: solicitud.titulo || '',
                solicitudMensaje: solicitud.mensaje,
                solicitudEstado: solicitud.estado || '',
                solicitudCreada: solicitud.createdAt,
                solicitudCompletada: solicitud.completadaEn,
                mantenerOriginal: solicitud.mantenerOriginal ?? true,
                documentoId: solicitud.documentos?.id || '',
                documentoNombre: solicitud.documentos?.nombre || 'Sin nombre',
                documentoFirmadoS3Key: solicitud.pdfFirmadoS3Key,
                totalFirmantes,
                firmadasCount,
              });
            });
          }
        });

        setFirmas(todasLasFirmas);
        setSelectedFirmaId((prev) => {
          if (todasLasFirmas.length === 0) {
            return null;
          }
          if (prev && todasLasFirmas.some((f) => f.id === prev)) {
            return prev;
          }
          return todasLasFirmas[0].id;
        });
      })
      .catch(() => {
        setErrorFirmas('No se pudieron cargar las firmas');
      })
      .finally(() => setLoadingFirmas(false));
  }, []);

  useEffect(() => {
    cargarFirmas();
  }, [cargarFirmas]);

  const firmasFiltradas = useMemo(() => {
    if (filtro === 'pendientes') {
      return firmas.filter(f => !f.firmado);
    } else if (filtro === 'completadas') {
      return firmas.filter(f => f.firmado);
    }
    return firmas;
  }, [firmas, filtro]);

  const selectedFirma = useMemo(
    () => firmas.find((firma) => firma.id === selectedFirmaId) ?? null,
    [firmas, selectedFirmaId]
  );

  const previewUrl = useMemo(() => {
    if (!selectedFirma) return null;
    return `/api/documentos/${selectedFirma.documentoId}?inline=1&ts=${cacheBuster}`;
  }, [selectedFirma, cacheBuster]);

  const pendientesCount = firmas.filter(f => !f.firmado).length;
  const completadasCount = firmas.filter(f => f.firmado).length;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-base font-semibold text-gray-900">Monitor de Firmas</p>
          <p className="text-sm text-gray-500">
            Visualiza el estado de todas las solicitudes de firma de la empresa.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filtro === 'todas' ? 'default' : 'outline'}
            onClick={() => setFiltro('todas')}
          >
            Todas ({firmas.length})
          </Button>
          <Button
            size="sm"
            variant={filtro === 'pendientes' ? 'default' : 'outline'}
            onClick={() => setFiltro('pendientes')}
          >
            Pendientes ({pendientesCount})
          </Button>
          <Button
            size="sm"
            variant={filtro === 'completadas' ? 'default' : 'outline'}
            onClick={() => setFiltro('completadas')}
          >
            Completadas ({completadasCount})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4 lg:gap-6 flex-1 min-h-0">
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Signature className="w-4 h-4" />
              Firmas
            </div>
            <Button variant="ghost" size="sm" onClick={cargarFirmas}>
              Refrescar
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y">
            {loadingFirmas ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Spinner className="w-4 h-4" />
                Cargando firmas...
              </div>
            ) : errorFirmas ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-red-600 px-4 text-center">
                <AlertCircle className="w-5 h-5" />
                {errorFirmas}
                <Button variant="link" size="sm" onClick={cargarFirmas}>
                  Reintentar
                </Button>
              </div>
            ) : firmasFiltradas.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8 px-4">
                No hay firmas {filtro === 'pendientes' ? 'pendientes' : filtro === 'completadas' ? 'completadas' : ''}.
              </div>
            ) : (
              firmasFiltradas.map((firma) => (
                <button
                  key={firma.id}
                  onClick={() => setSelectedFirmaId(firma.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    firma.id === selectedFirmaId ? 'bg-gray-50 border-l-4 border-gray-900' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-1">{firma.documentoNombre}</p>
                    {firma.firmado ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs shrink-0">
                        Firmado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs shrink-0">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{firma.empleadoNombre}</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-xs text-gray-500 line-clamp-1">{firma.solicitudTitulo}</p>
                    <p className="text-xs text-gray-400 shrink-0">{firma.firmadasCount}/{firma.totalFirmantes}</p>
                  </div>
                  {firma.requiereOrden && (
                    <p className="text-xs text-amber-600 mt-1">Orden #{firma.orden}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg bg-white p-4 flex flex-col gap-4">
          {selectedFirma ? (
            <>
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedFirma.documentoNombre}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Empleado: {selectedFirma.empleadoNombre}
                    </p>
                    <p className="text-xs text-gray-500">{selectedFirma.empleadoEmail}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {selectedFirma.firmado ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <FileSignature className="w-3 h-3 mr-1" />
                        Firmado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        <FileSignature className="w-3 h-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                    <p className="text-xs text-gray-600">
                      Progreso: {selectedFirma.firmadasCount}/{selectedFirma.totalFirmantes}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-md space-y-1">
                  <p className="text-xs font-medium text-gray-700">Información de la solicitud</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Estado:</span>{' '}
                      <span className="font-medium capitalize">{selectedFirma.solicitudEstado}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Modo:</span>{' '}
                      <span className="font-medium">
                        {selectedFirma.mantenerOriginal ? 'Mantener original' : 'Reemplazar original'}
                      </span>
                    </div>
                    {selectedFirma.requiereOrden && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Orden de firma:</span>{' '}
                        <span className="font-medium">Sí (orden #{selectedFirma.orden})</span>
                      </div>
                    )}
                    {selectedFirma.documentoFirmadoS3Key && (
                      <div className="col-span-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/api/firma/solicitudes/${selectedFirma.solicitudId}/documento-firmado`, '_blank')}
                          className="w-full"
                        >
                          Ver documento firmado final
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {selectedFirma.solicitudMensaje && (
                  <p className="text-sm text-gray-600 whitespace-pre-line border-l-2 border-gray-200 pl-3">
                    {selectedFirma.solicitudMensaje}
                  </p>
                )}
              </div>

              {previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  className="w-full h-[60vh] border rounded-lg"
                  title={`Documento ${selectedFirma.documentoNombre}`}
                />
              ) : (
                <div className="h-[60vh] border rounded-lg flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                  <FileText className="w-6 h-6 text-gray-400" />
                  No se pudo cargar el documento
                </div>
              )}
            </>
          ) : loadingFirmas ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              Selecciona una firma para visualizar los detalles.
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-500 gap-2 py-10">
              <Signature className="w-6 h-6 text-gray-400" />
              No hay firmas seleccionadas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
