'use client';

import { AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';
interface FirmasPendientesResponse {
  firmasPendientes: ApiFirmaPendiente[];
}

interface ApiFirmaPendiente {
  id: string;
  orden: number;
  solicitudes_firma: {
    id: string;
    titulo: string;
    mensaje?: string;
    ordenFirma: boolean;
    documento: {
      id: string;
      nombre: string;
      tipoDocumento: string;
    };
  };
}

interface FirmaDisplay {
  id: string;
  orden: number;
  requiereOrden: boolean;
  solicitudTitulo: string;
  solicitudMensaje?: string;
  documentoNombre: string;
}

export function FirmasPendientesWidget() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firmas, setFirmas] = useState<FirmaDisplay[]>([]);

  const cargarFirmas = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch('/api/firma/pendientes')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Error al cargar firmas');
        }
        return parseJson<FirmasPendientesResponse>(res);
      })
      .then((data) => {
        const items: ApiFirmaPendiente[] = data?.firmasPendientes ?? [];
        const formateadas: FirmaDisplay[] = items.map((item) => ({
          id: item.id,
          orden: item.orden,
          requiereOrden: item.solicitudes_firma.ordenFirma,
          solicitudTitulo: item.solicitudes_firma.titulo,
          solicitudMensaje: item.solicitudes_firma.mensaje,
          documentoNombre: item.solicitudes_firma.documento.nombre,
        }));
        setFirmas(formateadas);
      })
      .catch(() => {
        setError('No se pudieron cargar las firmas pendientes');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargarFirmas();
  }, [cargarFirmas]);

  const handleFirmarClick = (firmaId: string) => {
    router.push(`/firma/firmar/${firmaId}`);
  };

  const totalPendientes = firmas.length;

  return (
    <>
      <Card className="h-full flex flex-col border border-gray-200">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Firmas pendientes</p>
              <p className="text-xs text-gray-500">Documentos que requieren tu firma digital</p>
            </div>
            <Badge variant={totalPendientes > 0 ? 'default' : 'secondary'}>
              {totalPendientes} pendiente{totalPendientes === 1 ? '' : 's'}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Spinner className="w-4 h-4 mr-2" />
              Cargando firmas...
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center text-sm text-red-600 py-6">
              <AlertCircle className="w-5 h-5 mb-1" />
              {error}
              <Button variant="link" size="sm" className="mt-2" onClick={cargarFirmas}>
                Reintentar
              </Button>
            </div>
          )}

          {!loading && !error && firmas.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-6">
              No tienes firmas pendientes en este momento.
            </div>
          )}

          {!loading &&
            !error &&
            firmas.map((firma) => (
              <div
                key={firma.id}
                className="border rounded-lg p-3 bg-white shadow-sm flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{firma.documentoNombre}</p>
                    <p className="text-xs text-gray-500">{firma.solicitudTitulo}</p>
                  </div>
                  {firma.requiereOrden && (
                    <Badge variant="outline">Turno #{firma.orden}</Badge>
                  )}
                </div>
                {firma.solicitudMensaje && (
                  <p className="text-xs text-gray-500 whitespace-pre-line">{firma.solicitudMensaje}</p>
                )}
                <Button size="sm" className="mt-1 w-full" onClick={() => handleFirmarClick(firma.id)}>
                  Firmar ahora
                </Button>
              </div>
            ))}
        </div>
      </Card>
    </>
  );
}

