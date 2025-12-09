'use client';

// ========================================
// Solicitar Firma Step - Onboarding Employee
// ========================================
// Component for employees to sign requested documents

import { FileSignature, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { SolicitarFirmaConfig } from '@/lib/onboarding-config-types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SolicitudFirma {
  id: string;
  documentoId: string;
  titulo: string;
  firmado: boolean;
  urlFirmar: string;
}

interface SolicitarFirmaStepProps {
  config: SolicitarFirmaConfig;
  empleadoId: string;
  token: string;
  onTodasFirmadas: () => Promise<void>;
}

export function SolicitarFirmaStep({ config, empleadoId, token, onTodasFirmadas }: SolicitarFirmaStepProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudFirma[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarSolicitudesFirma();
  }, [config.documentosFirma]);

  const cargarSolicitudesFirma = async () => {
    try {
      setCargando(true);
      // Cargar solicitudes de firma desde la API
      const response = await fetch(`/api/onboarding/${token}/solicitudes-firma`);

      if (response.ok) {
        const data = await response.json();
        setSolicitudes(data.solicitudes || []);
      }
    } catch (error) {
      console.error('[SolicitarFirmaStep] Error al cargar solicitudes:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleFirmar = (solicitud: SolicitudFirma) => {
    // Abrir en nueva pestaña para firmar
    window.open(solicitud.urlFirmar, '_blank');
  };

  const handleRefrescar = async () => {
    await cargarSolicitudesFirma();
  };

  const handleContinuar = async () => {
    const todasFirmadas = solicitudes.every(s => s.firmado);
    if (!todasFirmadas) {
      alert('Por favor, firma todos los documentos requeridos');
      return;
    }

    await onTodasFirmadas();
  };

  const todasFirmadas = solicitudes.length > 0 && solicitudes.every(s => s.firmado);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Cargando documentos para firmar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Firmar Documentos</h2>
        <p className="text-gray-600 mt-2">
          Por favor, firma los siguientes documentos para completar tu onboarding.
        </p>
      </div>

      <div className="space-y-4">
        {solicitudes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No hay documentos pendientes de firma
            </CardContent>
          </Card>
        ) : (
          solicitudes.map((solicitud) => (
            <Card
              key={solicitud.id}
              className={solicitud.firmado ? 'border-green-500 bg-green-50' : ''}
            >
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileSignature className="h-5 w-5 text-blue-600" />
                    <span>{solicitud.titulo}</span>
                  </div>
                  {solicitud.firmado && (
                    <span className="text-sm font-normal text-green-600">✓ Firmado</span>
                  )}
                </CardTitle>
                <CardDescription>
                  {solicitud.firmado ? 'Documento firmado correctamente' : 'Pendiente de firma'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!solicitud.firmado && (
                  <Button onClick={() => handleFirmar(solicitud)} size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ir a Firmar
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {solicitudes.length > 0 && !todasFirmadas && (
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={handleRefrescar}>
            Refrescar Estado
          </Button>
          <p className="text-sm text-gray-600">
            Después de firmar, haz clic en "Refrescar Estado" para actualizar
          </p>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={handleContinuar} disabled={!todasFirmadas}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
