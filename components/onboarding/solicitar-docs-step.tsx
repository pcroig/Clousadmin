'use client';

// ========================================
// Solicitar Docs Step - Onboarding Employee
// ========================================
// Component for employees to upload requested documents

import { Upload } from 'lucide-react';
import { useState } from 'react';

import type { SolicitarDocsConfig } from '@/lib/onboarding-config-types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface SolicitarDocsStepProps {
  config: SolicitarDocsConfig;
  empleadoId: string;
  onDocumentosSubidos: () => Promise<void>;
}

export function SolicitarDocsStep({ config, empleadoId, onDocumentosSubidos }: SolicitarDocsStepProps) {
  const [archivosSubidos, setArchivosSubidos] = useState<Record<string, File>>({});
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState<Record<string, boolean>>({});

  const handleFileChange = (docRequeridoId: string, file: File | null) => {
    if (file) {
      setArchivosSubidos(prev => ({ ...prev, [docRequeridoId]: file }));
    } else {
      const { [docRequeridoId]: _, ...rest } = archivosSubidos;
      setArchivosSubidos(rest);
    }
  };

  const handleSubirDocumento = async (docRequerido: typeof config.documentosRequeridos[0]) => {
    const archivo = archivosSubidos[docRequerido.id];
    if (!archivo) return;

    try {
      setSubiendo(true);

      // Crear FormData para subir archivo
      const formData = new FormData();
      formData.append('file', archivo);
      formData.append('nombre', docRequerido.nombre);
      formData.append('carpetaId', docRequerido.carpetaDestinoId);
      formData.append('empleadoId', empleadoId);

      // Subir documento
      const response = await fetch('/api/documentos/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setProgreso(prev => ({ ...prev, [docRequerido.id]: true }));
        // Limpiar archivo subido
        const { [docRequerido.id]: _, ...rest } = archivosSubidos;
        setArchivosSubidos(rest);
      } else {
        console.error('Error al subir documento');
      }
    } catch (error) {
      console.error('[SolicitarDocsStep] Error:', error);
    } finally {
      setSubiendo(false);
    }
  };

  const handleContinuar = async () => {
    // Verificar que todos los documentos requeridos estén subidos
    const todosSubidos = config.documentosRequeridos
      .filter(d => d.requerido)
      .every(d => progreso[d.id]);

    if (!todosSubidos) {
      alert('Por favor, sube todos los documentos requeridos');
      return;
    }

    await onDocumentosSubidos();
  };

  const documentosRequeridos = config.documentosRequeridos.filter(d => d.requerido);
  const documentosOpcionales = config.documentosRequeridos.filter(d => !d.requerido);
  const todosRequeridosSubidos = documentosRequeridos.every(d => progreso[d.id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Documentos Solicitados</h2>
        <p className="text-gray-600 mt-2">
          Por favor, sube los siguientes documentos para continuar con tu onboarding.
        </p>
      </div>

      {/* Documentos requeridos */}
      {documentosRequeridos.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documentos Requeridos</h3>
          {documentosRequeridos.map((doc) => (
            <Card key={doc.id} className={progreso[doc.id] ? 'border-green-500 bg-green-50' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {doc.nombre}
                  {progreso[doc.id] && (
                    <span className="text-sm font-normal text-green-600">✓ Subido</span>
                  )}
                </CardTitle>
                <CardDescription>Documento requerido</CardDescription>
              </CardHeader>
              <CardContent>
                {!progreso[doc.id] && (
                  <div className="flex items-center space-x-3">
                    <Input
                      type="file"
                      onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                      disabled={subiendo}
                    />
                    <Button
                      onClick={() => handleSubirDocumento(doc)}
                      disabled={!archivosSubidos[doc.id] || subiendo}
                      size="sm"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Documentos opcionales */}
      {documentosOpcionales.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documentos Opcionales</h3>
          {documentosOpcionales.map((doc) => (
            <Card key={doc.id} className={progreso[doc.id] ? 'border-blue-500 bg-blue-50' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {doc.nombre}
                  {progreso[doc.id] && (
                    <span className="text-sm font-normal text-blue-600">✓ Subido</span>
                  )}
                </CardTitle>
                <CardDescription>Documento opcional</CardDescription>
              </CardHeader>
              <CardContent>
                {!progreso[doc.id] && (
                  <div className="flex items-center space-x-3">
                    <Input
                      type="file"
                      onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                      disabled={subiendo}
                    />
                    <Button
                      onClick={() => handleSubirDocumento(doc)}
                      disabled={!archivosSubidos[doc.id] || subiendo}
                      size="sm"
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={handleContinuar} disabled={!todosRequeridosSubidos || subiendo}>
          {subiendo ? 'Subiendo...' : 'Continuar'}
        </Button>
      </div>
    </div>
  );
}
