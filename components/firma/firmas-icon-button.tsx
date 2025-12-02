'use client';

import { FileSignature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface FirmasIconButtonProps {
  /**
   * Si es true, muestra todas las firmas de la empresa (para HR admins)
   * Si es false, muestra solo las firmas pendientes del empleado actual
   */
  isHRView?: boolean;
}

/**
 * Botón de icono compacto para acceder a firmas
 * Muestra solo el icono con un badge del número de pendientes
 */
export function FirmasIconButton({ isHRView = false }: FirmasIconButtonProps) {
  const router = useRouter();
  const [pendientesCount, setPendientesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargarFirmas = useCallback(() => {
    setLoading(true);

    const endpoint = isHRView ? '/api/firma/solicitudes' : '/api/firma/pendientes';

    fetch(endpoint)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Error al cargar firmas');
        }
        return parseJson<{ solicitudes?: ApiSolicitudFirma[]; firmasPendientes?: ApiFirmaPendiente[] }>(res);
      })
      .then((data) => {
        let count = 0;

        if (isHRView) {
          // HR View: Contar firmas pendientes en todas las solicitudes
          const items = data?.solicitudes ?? [];
          items.forEach((solicitud) => {
            if (solicitud.firmas && Array.isArray(solicitud.firmas)) {
              count += solicitud.firmas.filter((f) => !f.firmado).length;
            }
          });
        } else {
          // Employee View: Contar firmas pendientes del empleado
          const items: ApiFirmaPendiente[] = data?.firmasPendientes ?? [];
          count = items.filter((f) => !f.firmado).length;
        }

        setPendientesCount(count);
      })
      .catch(() => {
        setPendientesCount(0);
      })
      .finally(() => setLoading(false));
  }, [isHRView]);

  useEffect(() => {
    cargarFirmas();
  }, [cargarFirmas]);

  const handleClick = () => {
    if (isHRView) {
      router.push('/hr/documentos?tab=firmas');
    } else {
      router.push('/empleado/mi-espacio/documentos?tab=firmas');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className="relative h-9 w-9"
      aria-label={`Firmas${pendientesCount > 0 ? ` (${pendientesCount} pendientes)` : ''}`}
      disabled={loading}
    >
      <FileSignature className="h-5 w-5 text-gray-600" />
      {pendientesCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {pendientesCount > 9 ? '9+' : pendientesCount}
        </Badge>
      )}
    </Button>
  );
}
