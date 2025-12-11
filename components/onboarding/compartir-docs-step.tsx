'use client';

// ========================================
// Compartir Docs Step - Onboarding Employee
// ========================================
// Component for employees to view and acknowledge shared documents

import { Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { CompartirDocsConfig } from '@/lib/onboarding-config-types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface Documento {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
}

interface CompartirDocsStepProps {
  config: CompartirDocsConfig;
  onMarcarLeido: () => Promise<void>;
}

export function CompartirDocsStep({
  config,
  onMarcarLeido,
}: CompartirDocsStepProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [leido, setLeido] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDocumentos();
  }, [config.documentoIds]);

  const cargarDocumentos = async () => {
    try {
      setCargando(true);
      // Cargar documentos desde la API
      const response = await fetch('/api/documentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: config.documentoIds }),
      });

      if (response.ok) {
        const data = await response.json() as { documentos?: Documento[] };
        setDocumentos(data.documentos || []);
      }
    } catch (error) {
      console.error('[CompartirDocsStep] Error al cargar documentos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleDescargar = (documento: Documento) => {
    window.open(documento.url, '_blank');
  };

  const handleMarcarLeido = async () => {
    if (!leido) return;

    try {
      setGuardando(true);
      await onMarcarLeido();
    } catch (error) {
      console.error('[CompartirDocsStep] Error al marcar como leído:', error);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Cargando documentos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Documentos de la Empresa</h2>
        <p className="text-gray-600 mt-2">
          Revisa los siguientes documentos que hemos compartido contigo.
        </p>
      </div>

      <div className="space-y-4">
        {documentos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No hay documentos disponibles
            </CardContent>
          </Card>
        ) : (
          documentos.map((documento) => (
            <Card key={documento.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-base">{documento.nombre}</CardTitle>
                    <CardDescription>{documento.tipo}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDescargar(documento)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar
                </Button>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="leido"
              checked={leido}
              onCheckedChange={(checked) => setLeido(checked === true)}
            />
            <label
              htmlFor="leido"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              He revisado y leído todos los documentos compartidos
            </label>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t">
            <Button onClick={handleMarcarLeido} disabled={!leido || guardando}>
              {guardando ? 'Guardando...' : 'Marcar como leído'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
