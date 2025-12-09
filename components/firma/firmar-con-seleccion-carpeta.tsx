'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type {
  InfoCarpetaOrigen,
  CarpetaCentralizada,
  CrearCarpetaCentralizadaResponse,
} from '@/lib/firma-digital/types-api';
import { parseJson } from '@/lib/utils/json';

import { FirmarDocumentoDialog, FirmaPendiente } from './firmar-documento-dialog';
import { SeleccionarCarpetaDestinoDialog } from './seleccionar-carpeta-destino-dialog';

interface FirmarConSeleccionCarpetaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firma: FirmaPendiente | null;
  onSigned?: (data?: {
    solicitudCompletada?: boolean;
    solicitudId?: string;
    documentoFirmado?: { id: string; nombre: string };
  }) => void;
}

export function FirmarConSeleccionCarpeta({
  open,
  onOpenChange,
  firma,
  onSigned,
}: FirmarConSeleccionCarpetaProps) {
  const [infoCarpeta, setInfoCarpeta] = useState<InfoCarpetaOrigen | null>(null);
  const [carpetaDestinoSeleccionada, setCarpetaDestinoSeleccionada] = useState<string | null>(
    null
  );
  const [mostrarDialogCarpeta, setMostrarDialogCarpeta] = useState(false);
  const [mostrarDialogFirma, setMostrarDialogFirma] = useState(false);
  const [loadingCarpeta, setLoadingCarpeta] = useState(false);

  // Cargar info de carpeta cuando se abre
  useEffect(() => {
    if (!open || !firma) {
      setInfoCarpeta(null);
      setCarpetaDestinoSeleccionada(null);
      setMostrarDialogCarpeta(false);
      setMostrarDialogFirma(false);
      return;
    }

    fetch(`/api/firma/solicitudes/${firma.solicitudId}/carpeta-origen`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Error al obtener información de carpeta');
        return parseJson<InfoCarpetaOrigen>(res);
      })
      .then((data) => {
        setInfoCarpeta(data);

        if (data.necesitaSeleccion) {
          // Necesita seleccionar carpeta → mostrar dialog de selección
          setMostrarDialogCarpeta(true);
        } else {
          // No necesita selección → ir directo a firmar
          setMostrarDialogFirma(true);
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Error al cargar información');
        onOpenChange(false);
      });
  }, [open, firma]);

  const handleConfirmarCarpeta = async (
    carpetaId: string | null,
    nuevaCarpetaNombre?: string
  ) => {
    if (!carpetaId && !nuevaCarpetaNombre) return;

    setLoadingCarpeta(true);
    try {
      let carpetaFinalId = carpetaId;

      // Si necesita crear nueva carpeta
      if (!carpetaId && nuevaCarpetaNombre) {
        const res = await fetch('/api/carpetas/centralizada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nuevaCarpetaNombre }),
        });

        if (!res.ok) {
          const data = await parseJson<{ error?: string }>(res);
          throw new Error(data.error || 'Error al crear carpeta');
        }

        const data = await parseJson<CrearCarpetaCentralizadaResponse>(res);
        carpetaFinalId = data.carpeta.id;
      }

      if (!carpetaFinalId) {
        throw new Error('No se pudo obtener ID de carpeta');
      }

      // Guardar selección
      setCarpetaDestinoSeleccionada(carpetaFinalId);

      // Cerrar dialog de carpeta y abrir dialog de firma
      setMostrarDialogCarpeta(false);
      setMostrarDialogFirma(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al procesar carpeta');
    } finally {
      setLoadingCarpeta(false);
    }
  };

  const handleCancelarCarpeta = () => {
    setMostrarDialogCarpeta(false);
    onOpenChange(false);
  };

  const handleCerrarFirma = (openState: boolean) => {
    setMostrarDialogFirma(openState);
    if (!openState) {
      onOpenChange(false);
    }
  };

  return (
    <>
      {/* Dialog de selección de carpeta (solo para carpetas compartidas) */}
      <SeleccionarCarpetaDestinoDialog
        open={mostrarDialogCarpeta}
        onOpenChange={(open) => {
          if (!open) handleCancelarCarpeta();
        }}
        carpetasCentralizadas={infoCarpeta?.carpetasCentralizadas || []}
        onConfirm={handleConfirmarCarpeta}
        isLoading={loadingCarpeta}
      />

      {/* Dialog de firma (con carpetaDestinoId si es necesario) */}
      <FirmarDocumentoDialogWithCarpeta
        open={mostrarDialogFirma}
        onOpenChange={handleCerrarFirma}
        firma={firma}
        onSigned={onSigned}
        carpetaDestinoId={carpetaDestinoSeleccionada}
      />
    </>
  );
}

// Wrapper interno que pasa carpetaDestinoId al proceso de firma
function FirmarDocumentoDialogWithCarpeta({
  open,
  onOpenChange,
  firma,
  onSigned,
  carpetaDestinoId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firma: FirmaPendiente | null;
  onSigned?: (data?: {
    solicitudCompletada?: boolean;
    solicitudId?: string;
    documentoFirmado?: { id: string; nombre: string };
  }) => void;
  carpetaDestinoId: string | null;
}) {
  return (
    <FirmarDocumentoDialog
      open={open}
      onOpenChange={onOpenChange}
      firma={firma}
      onSigned={onSigned}
      carpetaDestinoId={carpetaDestinoId}
    />
  );
}
