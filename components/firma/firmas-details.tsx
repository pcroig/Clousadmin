// ========================================
// Firmas Details Component - Sheet Lateral
// ========================================

'use client';

import { AlertCircle, CheckCircle2, Clock, FileSignature, Signature, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
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
  documento?: ApiDocumento;
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

interface FirmasDetailsProps {
  /**
   * Si es true, muestra todas las firmas de la empresa (para HR admins)
   * Si es false, muestra solo las firmas pendientes del empleado actual
   */
  isHRView?: boolean;
  onClose: () => void;
}

export function FirmasDetails({ isHRView = false, onClose }: FirmasDetailsProps) {
  const router = useRouter();
  const [firmas, setFirmas] = useState<FirmaDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarFirmas = useCallback(() => {
    setLoading(true);
    setError(null);

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
        setError('No se pudieron cargar las firmas');
      })
      .finally(() => setLoading(false));
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
  const completadasCount = firmasFiltradas.filter((f) => f.firmado).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header con stats */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span>
            <strong className="text-gray-900">{pendientesCount}</strong> pendientes
          </span>
          <span>
            <strong className="text-gray-900">{completadasCount}</strong> completadas (7d)
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto divide-y">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Spinner className="w-5 h-5" />
            Cargando firmas...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-red-600 text-center px-6">
            <AlertCircle className="w-8 h-8" />
            {error}
            <Button variant="link" size="sm" onClick={cargarFirmas}>
              Reintentar
            </Button>
          </div>
        ) : firmasFiltradas.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-12 px-6">
            {isHRView ? 'No hay firmas recientes.' : 'No tienes firmas pendientes.'}
          </div>
        ) : (
          firmasFiltradas.map((firma) => (
            <div
              key={firma.id}
              className="px-6 py-3 hover:bg-gray-50/50 transition-colors"
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
                    <Badge variant="outline" className="text-amber-700 border-amber-200 text-xs ml-auto">
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
                    !isHRView && (
                      <Button
                        size="sm"
                        onClick={() => handleFirmarClick(firma.id)}
                      >
                        <FileSignature className="w-3 h-3 mr-1.5" />
                        Firmar
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
