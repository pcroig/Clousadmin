'use client';

import { AlertCircle, ChevronDown, ChevronUp, FileSignature, Signature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

interface ApiEmpleado {
  nombre: string;
  apellidos: string;
  email: string;
}

interface ApiDocumento {
  id: string;
  nombre: string;
  tipoDocumento?: string;
  carpetaId?: string;
}

interface ApiFirma {
  id: string;
  orden: number;
  firmado: boolean;
  firmadoEn?: string;
  empleado: ApiEmpleado;
}

interface ApiSolicitudFirma {
  id: string;
  titulo: string;
  mensaje?: string;
  ordenFirma: boolean;
  estado: string;
  documentos?: ApiDocumento;
  documento?: ApiDocumento; // Para endpoint de pendientes
  firmas?: ApiFirma[];
}

interface ApiFirmaPendiente {
  id: string;
  orden: number;
  firmado: boolean;
  firmadoEn?: string;
  empleadoId: string;
  solicitudes_firma: ApiSolicitudFirma;
  empleado?: ApiEmpleado;
}

interface FirmaDisplay {
  id: string;
  orden: number;
  firmado: boolean;
  firmadoEn?: Date;
  empleadoNombre?: string;
  empleadoEmail?: string;
  requiereOrden: boolean;
  solicitudTitulo: string;
  solicitudMensaje?: string;
  solicitudEstado: string;
  solicitudId: string;
  documentoId: string;
  documentoNombre: string;
  carpetaId: string;
}

interface FirmasCardCompactProps {
  /**
   * Si es true, muestra todas las firmas de la empresa (para HR admins)
   * Si es false, muestra solo las firmas pendientes del empleado actual
   */
  isHRView?: boolean;
}

export function FirmasCardCompact({ isHRView = false }: FirmasCardCompactProps) {
  const router = useRouter();
  const [firmas, setFirmas] = useState<FirmaDisplay[]>([]);
  const [loadingFirmas, setLoadingFirmas] = useState(true);
  const [errorFirmas, setErrorFirmas] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const cargarFirmas = useCallback(() => {
    setLoadingFirmas(true);
    setErrorFirmas(null);

    const endpoint = isHRView ? '/api/firma/solicitudes' : '/api/firma/pendientes';

    fetch(endpoint)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Error al cargar firmas');
        }
        return parseJson<{ solicitudes?: ApiSolicitudFirma[]; firmasPendientes?: ApiFirmaPendiente[] }>(res);
      })
      .then((data) => {
        let todasLasFirmas: FirmaDisplay[] = [];

        if (isHRView) {
          // HR View: Obtener todas las firmas de todas las solicitudes
          const items = data?.solicitudes ?? [];
          items.forEach((solicitud) => {
            if (solicitud.firmas && Array.isArray(solicitud.firmas)) {
              solicitud.firmas.forEach((firma) => {
                todasLasFirmas.push({
                  id: firma.id,
                  orden: firma.orden || 0,
                  firmado: firma.firmado || false,
                  firmadoEn: firma.firmadoEn ? new Date(firma.firmadoEn) : undefined,
                  empleadoNombre: firma.empleado
                    ? `${firma.empleado.nombre} ${firma.empleado.apellidos}`
                    : 'Desconocido',
                  empleadoEmail: firma.empleado?.email || '',
                  requiereOrden: solicitud.ordenFirma || false,
                  solicitudTitulo: solicitud.titulo || '',
                  solicitudMensaje: solicitud.mensaje,
                  solicitudEstado: solicitud.estado || '',
                  solicitudId: solicitud.id || '',
                  documentoId: solicitud.documentos?.id || '',
                  documentoNombre: solicitud.documentos?.nombre || 'Sin nombre',
                  carpetaId: solicitud.documentos?.carpetaId || '',
                });
              });
            }
          });
        } else {
          // Employee View: Solo firmas pendientes del empleado
          const items: ApiFirmaPendiente[] = data?.firmasPendientes ?? [];
          todasLasFirmas = items.map((item) => ({
            id: item.id,
            orden: item.orden,
            firmado: item.firmado,
            firmadoEn: item.firmadoEn ? new Date(item.firmadoEn) : undefined,
            requiereOrden: item.solicitudes_firma.ordenFirma,
            solicitudTitulo: item.solicitudes_firma.titulo,
            solicitudMensaje: item.solicitudes_firma.mensaje,
            solicitudEstado: item.solicitudes_firma.estado,
            solicitudId: item.solicitudes_firma.id,
            documentoId: item.solicitudes_firma.documento?.id || '',
            documentoNombre: item.solicitudes_firma.documento?.nombre || 'Sin nombre',
            carpetaId: item.solicitudes_firma.documento?.carpetaId || '',
          }));
        }

        setFirmas(todasLasFirmas);
      })
      .catch(() => {
        setErrorFirmas('No se pudieron cargar las firmas');
      })
      .finally(() => setLoadingFirmas(false));
  }, [isHRView]);

  useEffect(() => {
    cargarFirmas();
  }, [cargarFirmas]);

  // Filtrar firmas: pendientes + completadas recientes (< 7 días)
  const firmasFiltradas = useMemo(() => {
    const ahora = new Date();
    const unaSemanaAtras = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

    return firmas.filter((firma) => {
      // Siempre mostrar pendientes
      if (!firma.firmado) return true;

      // Completadas: solo si tienen fecha y son recientes (< 7 días)
      if (firma.firmadoEn) {
        return firma.firmadoEn > unaSemanaAtras;
      }

      // Si está marcada como firmada pero no tiene fecha, no mostrarla
      return false;
    });
  }, [firmas]);

  const handleFirmarClick = useCallback(
    (firmaId: string) => {
      // Solo empleados pueden firmar desde la card
      if (!isHRView) {
        router.push(`/firma/firmar/${firmaId}`);
      }
    },
    [router, isHRView]
  );

  const handleVerClick = useCallback(
    (solicitudId: string) => {
      // Navegar a la página de solicitud de firma (donde está el documento firmado)
      router.push(`/firma/solicitud/${solicitudId}`);
    },
    [router]
  );

  const pendientesCount = firmasFiltradas.filter((f) => !f.firmado).length;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-white">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Signature className="w-4 h-4 text-gray-700" />
          <span className="text-sm font-semibold text-gray-800">Firmas</span>
          {pendientesCount > 0 && (
            <Badge variant="default" className="ml-1">
              {pendientesCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500 ml-1" />
          )}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={cargarFirmas}
        >
          Refrescar
        </Button>
      </div>

      {isExpanded && (
        <div className="max-h-[280px] overflow-y-auto divide-y">
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
            {isHRView ? 'No hay firmas recientes.' : 'No tienes firmas pendientes.'}
          </div>
        ) : (
          firmasFiltradas.map((firma) => (
            <div
              key={firma.id}
              className="px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {firma.documentoNombre}
                  </p>
                  {isHRView && firma.empleadoNombre && (
                    <>
                      <span className="text-gray-300">|</span>
                      <p className="text-xs text-gray-600 truncate">
                        {firma.empleadoNombre}
                      </p>
                    </>
                  )}
                  {firma.requiereOrden && !firma.firmado && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs ml-auto">
                      Orden #{firma.orden}
                    </Badge>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {firma.firmado ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerClick(firma.solicitudId)}
                    >
                      Ver
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleFirmarClick(firma.id)}
                    >
                      <FileSignature className="w-3 h-3 mr-1.5" />
                      Firmar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      )}
    </div>
  );
}
