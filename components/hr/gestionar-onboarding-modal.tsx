'use client';

// ========================================
// Gestionar Onboarding Modal - Configuración de onboarding para HR
// ========================================

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Settings, FileText, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { PlantillasTab } from './plantillas-tab';
import type {
  CamposRequeridos,
  DocumentoRequerido,
  PlantillaDocumento,
  OnboardingConfigData,
} from '@/lib/onboarding-config';

interface GestionarOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GestionarOnboardingModal({
  open,
  onOpenChange,
}: GestionarOnboardingModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('campos');

  // Estado de la configuración
  const [camposRequeridos, setCamposRequeridos] = useState<CamposRequeridos>({
    datos_personales: {
      nif: true,
      nss: true,
      telefono: true,
      direccionCalle: true,
      direccionNumero: true,
      direccionPiso: false,
      codigoPostal: true,
      ciudad: true,
      direccionProvincia: true,
      estadoCivil: false,
      numeroHijos: false,
    },
    datos_bancarios: {
      iban: true,
      titularCuenta: true,
    },
  });

  const [documentosRequeridos, setDocumentosRequeridos] = useState<DocumentoRequerido[]>([]);
  const [plantillasDocumentos, setPlantillasDocumentos] = useState<PlantillaDocumento[]>([]);

  // Cargar configuración al abrir el modal
  useEffect(() => {
    if (open) {
      cargarConfiguracion();
    }
  }, [open]);

  const cargarConfiguracion = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/hr/onboarding-config');
      const data = await res.json();

      if (data.success && data.config) {
        setCamposRequeridos(data.config.camposRequeridos);
        setDocumentosRequeridos(data.config.documentosRequeridos || []);
        setPlantillasDocumentos(data.config.plantillasDocumentos || []);
      }
    } catch (err) {
      console.error('[cargarConfiguracion] Error:', err);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const guardarCamposRequeridos = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/hr/onboarding-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'campos_requeridos',
          data: camposRequeridos,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Campos actualizados correctamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al guardar campos');
      }
    } catch (err) {
      console.error('[guardarCamposRequeridos] Error:', err);
      setError('Error al guardar campos');
    } finally {
      setSaving(false);
    }
  };

  const guardarDocumentosRequeridos = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/hr/onboarding-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'documentos_requeridos',
          data: documentosRequeridos,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Documentos actualizados correctamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al guardar documentos');
      }
    } catch (err) {
      console.error('[guardarDocumentosRequeridos] Error:', err);
      setError('Error al guardar documentos');
    } finally {
      setSaving(false);
    }
  };

  const añadirDocumentoRequerido = () => {
    const nuevoDoc: DocumentoRequerido = {
      id: `doc_${Date.now()}`,
      nombre: '',
      descripcion: '',
      requerido: true,
      tipoDocumento: 'otro',
    };
    setDocumentosRequeridos([...documentosRequeridos, nuevoDoc]);
  };

  const actualizarDocumentoRequerido = (
    id: string,
    campo: keyof DocumentoRequerido,
    valor: unknown
  ) => {
    setDocumentosRequeridos(
      documentosRequeridos.map((doc) =>
        doc.id === id ? { ...doc, [campo]: valor } : doc
      )
    );
  };

  const eliminarDocumentoRequerido = (id: string) => {
    setDocumentosRequeridos(documentosRequeridos.filter((doc) => doc.id !== id));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-gray-600" />
            Gestionar On/Offboarding
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner className="size-8 text-gray-400" />
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="campos">
                    <Settings className="h-4 w-4 mr-2" />
                    Campos
                  </TabsTrigger>
                  <TabsTrigger value="documentos">
                    <FileText className="h-4 w-4 mr-2" />
                    Documentos
                  </TabsTrigger>
                  <TabsTrigger value="plantillas">
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Plantillas
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Campos Requeridos */}
                <TabsContent value="campos" className="space-y-6 mt-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Datos Personales</h3>
                    <div className="space-y-3">
                      {Object.entries(camposRequeridos.datos_personales).map(([campo, requerido]) => (
                        <div key={campo} className="flex items-center space-x-3">
                          <Checkbox
                            id={`campo-${campo}`}
                            checked={requerido}
                            onCheckedChange={(checked) => {
                              setCamposRequeridos({
                                ...camposRequeridos,
                                datos_personales: {
                                  ...camposRequeridos.datos_personales,
                                  [campo]: checked === true,
                                },
                              });
                            }}
                          />
                          <Label htmlFor={`campo-${campo}`} className="cursor-pointer">
                            {campo
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (str) => str.toUpperCase())}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Datos Bancarios</h3>
                    <div className="space-y-3">
                      {Object.entries(camposRequeridos.datos_bancarios).map(([campo, requerido]) => (
                        <div key={campo} className="flex items-center space-x-3">
                          <Checkbox
                            id={`banco-${campo}`}
                            checked={requerido}
                            onCheckedChange={(checked) => {
                              setCamposRequeridos({
                                ...camposRequeridos,
                                datos_bancarios: {
                                  ...camposRequeridos.datos_bancarios,
                                  [campo]: checked === true,
                                },
                              });
                            }}
                          />
                          <Label htmlFor={`banco-${campo}`} className="cursor-pointer">
                            {campo === 'iban' ? 'IBAN' : 'Titular de la cuenta'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <LoadingButton
                    onClick={guardarCamposRequeridos}
                    loading={saving}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? 'Guardando...' : 'Guardar Campos'}
                  </LoadingButton>
                </TabsContent>

                {/* Tab: Documentos Requeridos */}
                <TabsContent value="documentos" className="space-y-4 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
                      Configura qué documentos deben subir los empleados durante el onboarding
                    </p>
                    <Button onClick={añadirDocumentoRequerido} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Añadir
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {documentosRequeridos.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label>Nombre del documento</Label>
                                <Input
                                  value={doc.nombre}
                                  onChange={(e) =>
                                    actualizarDocumentoRequerido(doc.id, 'nombre', e.target.value)
                                  }
                                  placeholder="ej: DNI/NIE"
                                />
                              </div>
                              <div>
                                <Label>Tipo</Label>
                                <select
                                  value={doc.tipoDocumento}
                                  onChange={(e) =>
                                    actualizarDocumentoRequerido(
                                      doc.id,
                                      'tipoDocumento',
                                      e.target.value
                                    )
                                  }
                                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                                >
                                  <option value="dni">DNI/NIE</option>
                                  <option value="contrato">Contrato</option>
                                  <option value="seguridad_social">Seguridad Social</option>
                                  <option value="certificado">Certificado</option>
                                  <option value="otro">Otro</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <Label>Descripción (opcional)</Label>
                              <Input
                                value={doc.descripcion || ''}
                                onChange={(e) =>
                                  actualizarDocumentoRequerido(doc.id, 'descripcion', e.target.value)
                                }
                                placeholder="Descripción del documento"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`req-${doc.id}`}
                                checked={doc.requerido}
                                onCheckedChange={(checked) =>
                                  actualizarDocumentoRequerido(doc.id, 'requerido', checked === true)
                                }
                              />
                              <Label htmlFor={`req-${doc.id}`}>Requerido</Label>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarDocumentoRequerido(doc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {documentosRequeridos.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>No hay documentos requeridos configurados</p>
                        <p className="text-sm">Haz clic en "Añadir" para crear uno</p>
                      </div>
                    )}
                  </div>

                  <LoadingButton
                    onClick={guardarDocumentosRequeridos}
                    loading={saving}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? 'Guardando...' : 'Guardar Documentos'}
                  </LoadingButton>
                </TabsContent>

                {/* Tab: Plantillas */}
                <TabsContent value="plantillas" className="space-y-4 mt-6">
                  <PlantillasTab />
                </TabsContent>
              </Tabs>
            )}

            {/* Mensajes de error/éxito */}
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            {success && (
              <div className="mt-4 rounded-md bg-green-50 p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

