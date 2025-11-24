'use client';

import { AlertCircle, FileText, Signature } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

import { type FirmaPendiente, FirmarDocumentoDialog } from './firmar-documento-dialog';
interface FirmasPendientesResponse {
  firmasPendientes: ApiFirmaPendiente[];
}

interface ApiFirmaPendiente {
  id: string;
  orden: number;
  solicitudFirma: {
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

export function FirmasTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firmas, setFirmas] = useState<FirmaPendiente[]>([]);
  const [selectedFirmaId, setSelectedFirmaId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cacheBuster] = useState(() => Date.now());

  const cargarFirmas = () => {
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
        const formateadas: FirmaPendiente[] = items.map((item) => ({
          id: item.id,
          orden: item.orden,
          requiereOrden: item.solicitudFirma.ordenFirma,
          solicitudTitulo: item.solicitudFirma.titulo,
          solicitudMensaje: item.solicitudFirma.mensaje,
          documento: {
            id: item.solicitudFirma.documento.id,
            nombre: item.solicitudFirma.documento.nombre,
          },
        }));
        setFirmas(formateadas);
        setSelectedFirmaId((prev) => {
          if (formateadas.length === 0) {
            return null;
          }
          if (prev && formateadas.some((f) => f.id === prev)) {
            return prev;
          }
          return formateadas[0].id;
        });
      })
      .catch(() => {
        setError('No se pudieron cargar las firmas pendientes');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarFirmas();
  }, []);

  const selectedFirma = useMemo(
    () => firmas.find((firma) => firma.id === selectedFirmaId) ?? null,
    [firmas, selectedFirmaId]
  );

  const previewUrl = useMemo(() => {
    if (!selectedFirma) return null;
    return `/api/documentos/${selectedFirma.documento.id}?inline=1&ts=${cacheBuster}`;
  }, [selectedFirma, cacheBuster]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900">Firmas pendientes</p>
          <p className="text-sm text-gray-500">
            Selecciona un documento para revisarlo y firmarlo cuando estés listo.
          </p>
        </div>
        <Badge variant={firmas.length > 0 ? 'default' : 'secondary'}>
          {firmas.length} pendiente{firmas.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4 lg:gap-6">
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Signature className="w-4 h-4" />
              Solicitudes
            </div>
            <Button variant="ghost" size="sm" onClick={cargarFirmas}>
              Refrescar
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                <Spinner className="w-4 h-4" />
                Cargando firmas...
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-red-600 px-4 text-center">
                <AlertCircle className="w-5 h-5" />
                {error}
                <Button variant="link" size="sm" onClick={cargarFirmas}>
                  Reintentar
                </Button>
              </div>
            ) : firmas.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8 px-4">
                No tienes documentos pendientes de firma.
              </div>
            ) : (
              firmas.map((firma) => (
                <button
                  key={firma.id}
                  onClick={() => setSelectedFirmaId(firma.id)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    firma.id === selectedFirmaId ? 'bg-gray-50 border-l-4 border-gray-900' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">{firma.documento.nombre}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{firma.solicitudTitulo}</p>
                  {firma.requiereOrden && (
                    <p className="text-xs text-amber-600 mt-1">Turno #{firma.orden}. Se respeta orden secuencial.</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg bg-white p-4 flex flex-col gap-4">
          {selectedFirma ? (
            <>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedFirma.documento.nombre}
                  </p>
                  <p className="text-sm text-gray-500 whitespace-pre-line">
                    {selectedFirma.solicitudMensaje || selectedFirma.solicitudTitulo}
                  </p>
                </div>
                <Button onClick={() => setDialogOpen(true)}>Firmar documento</Button>
              </div>

              {previewUrl ? (
                <iframe
                  key={previewUrl}
                  src={previewUrl}
                  className="w-full h-[70vh] border rounded-lg"
                  title={`Documento ${selectedFirma.documento.nombre}`}
                />
              ) : (
                <div className="h-[70vh] border rounded-lg flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
                  <FileText className="w-6 h-6 text-gray-400" />
                  No se pudo cargar el documento
                </div>
              )}
            </>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              Selecciona una firma pendiente para visualizar el documento.
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-500 gap-2 py-10">
              <Signature className="w-6 h-6 text-gray-400" />
              No hay documentos seleccionados
            </div>
          )}
        </div>
      </div>

      <FirmarDocumentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        firma={selectedFirma}
        onSigned={() => {
          cargarFirmas();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

