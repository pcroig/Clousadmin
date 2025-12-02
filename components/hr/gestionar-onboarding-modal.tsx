'use client';

// ========================================
// Gestionar Onboarding Modal - Configuración de onboarding para HR
// ========================================

import { FileSignature, FileText, Plus, Settings, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DialogWithSidebar } from '@/components/shared/dialog-with-sidebar';
import { DocumentoSelector } from '@/components/shared/documento-selector';
import { LoadingButton } from '@/components/shared/loading-button';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { parseJson } from '@/lib/utils/json';

import type {
  CamposRequeridos,
  DocumentoRequerido,
} from '@/lib/onboarding-config-types';

const DESTINOS_SUGERIDOS = ['Contratos', 'Nóminas', 'Justificantes', 'Otros'] as const;

interface GestionarOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Equipo {
  id: string;
  nombre: string;
}

interface EquiposResponse {
  equipos?: Equipo[];
  data?: Equipo[];
}

export function GestionarOnboardingModal({
  open,
  onOpenChange,
}: GestionarOnboardingModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('campos');
  const [equipos, setEquipos] = useState<Equipo[]>([]);

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
      bic: true,
    },
  });

  const [documentosVisualizar, setDocumentosVisualizar] = useState<string[]>([]); // IDs de documentos existentes
  const [documentosSolicitar, setDocumentosSolicitar] = useState<DocumentoRequerido[]>([]); // Docs que el empleado debe subir
  const [firmasRequeridas, setFirmasRequeridas] = useState<DocumentoRequerido[]>([]);

  // Cargar equipos
  useEffect(() => {
    if (open) {
      cargarEquipos();
      cargarConfiguracion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cargarEquipos = async () => {
    try {
      const res = await fetch('/api/equipos');
      const data = await parseJson<EquiposResponse>(res);
      const equiposList = data.equipos || data.data || [];
      setEquipos(equiposList);
    } catch (err) {
      console.error('[cargarEquipos] Error:', err);
    }
  };

  interface OnboardingConfigResponse {
    success?: boolean;
    error?: string;
    config?: {
      camposRequeridos: CamposRequeridos;
      documentosRequeridos?: DocumentoRequerido[];
    };
  }

  const cargarConfiguracion = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/hr/onboarding-config');
      const data = await parseJson<OnboardingConfigResponse>(res);

      if (data.success && data.config) {
        setCamposRequeridos(data.config.camposRequeridos);
        
        const docs = (data.config.documentosRequeridos || []).map((doc) => ({
          ...doc,
          carpetaDestino: doc.carpetaDestino ?? 'Otros',
          asignadoA: doc.asignadoA ?? 'todos',
          equipoIds: doc.equipoIds ?? [],
          tipo: doc.tipo || (doc.requiereFirma ? 'firma' : doc.requiereVisualizacion ? 'visualizar' : 'solicitar'),
        }));

        // Separar por tipo
        const docsVisualizar = docs.filter((d) => d.tipo === 'visualizar' && d.documentoId).map((d) => d.documentoId!);
        const docsSolicitar = docs.filter((d) => d.tipo === 'solicitar');
        const firmas = docs.filter((d) => d.tipo === 'firma');

        setDocumentosVisualizar(docsVisualizar);
        setDocumentosSolicitar(docsSolicitar);
        setFirmasRequeridas(firmas);
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

      const data = await parseJson<{success?: boolean; error?: string}>(res);

      if (data.success) {
        toast.success('Campos actualizados correctamente');
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

  const guardarDocumentos = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Convertir documentos a visualizar (IDs) a objetos DocumentoRequerido
      const docsVisualizarObj: DocumentoRequerido[] = documentosVisualizar.map((docId) => ({
        id: `vis_${docId}`,
        nombre: 'Documento para visualizar',
        requerido: false,
        requiereVisualizacion: true,
        requiereFirma: false,
        tipo: 'visualizar' as const,
        documentoId: docId,
        asignadoA: 'todos' as const,
        equipoIds: [],
      }));

      // Combinar todos los documentos
      const todosLosDocumentos = [
        ...docsVisualizarObj,
        ...documentosSolicitar.map((doc) => ({
          ...doc,
          tipo: 'solicitar' as const,
          carpetaDestino: doc.carpetaDestino?.trim() || 'Otros',
        })),
        ...firmasRequeridas.map((doc) => ({
          ...doc,
          tipo: 'firma' as const,
          carpetaDestino: doc.carpetaDestino?.trim() || 'Contratos',
        })),
      ];

      const res = await fetch('/api/hr/onboarding-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'documentos_requeridos',
          data: todosLosDocumentos,
        }),
      });

      const data = await parseJson<{success?: boolean; error?: string}>(res);

      if (data.success) {
        toast.success('Documentos actualizados correctamente');
        setSuccess('Documentos actualizados correctamente');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al guardar documentos');
      }
    } catch (err) {
      console.error('[guardarDocumentos] Error:', err);
      setError('Error al guardar documentos');
    } finally {
      setSaving(false);
    }
  };

  const añadirDocumentoSolicitar = () => {
    const nuevoDoc: DocumentoRequerido = {
      id: `sol_${Date.now()}`,
      nombre: '',
      requerido: true,
      requiereVisualizacion: false,
      requiereFirma: false,
      tipo: 'solicitar',
      carpetaDestino: 'Otros',
      asignadoA: 'todos',
      equipoIds: [],
    };
    setDocumentosSolicitar([...documentosSolicitar, nuevoDoc]);
  };

  const añadirFirma = () => {
    const nuevaFirma: DocumentoRequerido = {
      id: `firma_${Date.now()}`,
      nombre: '',
      requerido: true,
      requiereVisualizacion: true,
      requiereFirma: true,
      tipo: 'firma',
      carpetaDestino: 'Contratos',
      esAsincronico: false,
      asignadoA: 'todos',
      equipoIds: [],
    };
    setFirmasRequeridas([...firmasRequeridas, nuevaFirma]);
  };

  const actualizarDocumentoSolicitar = (
    id: string,
    campo: keyof DocumentoRequerido,
    valor: unknown
  ) => {
    setDocumentosSolicitar(
      documentosSolicitar.map((doc) =>
        doc.id === id ? { ...doc, [campo]: valor } : doc
      )
    );
  };

  const actualizarFirma = (
    id: string,
    campo: keyof DocumentoRequerido,
    valor: unknown
  ) => {
    setFirmasRequeridas(
      firmasRequeridas.map((firma) =>
        firma.id === id ? { ...firma, [campo]: valor } : firma
      )
    );
  };

  const eliminarDocumentoSolicitar = (id: string) => {
    setDocumentosSolicitar(documentosSolicitar.filter((doc) => doc.id !== id));
  };

  const eliminarFirma = (id: string) => {
    setFirmasRequeridas(firmasRequeridas.filter((firma) => firma.id !== id));
  };

  const sidebar = [
    { id: 'campos', label: 'Campos', icon: Settings },
    { id: 'docs-visualizar', label: 'Ver/Descargar', icon: FileText },
    { id: 'docs-solicitar', label: 'Solicitar Documentos', icon: FileText },
    { id: 'firmas', label: 'Firmas', icon: FileSignature },
  ];

  return (
    <DialogWithSidebar
      open={open}
      onOpenChange={onOpenChange}
      title="Gestionar Onboarding"
      sidebar={sidebar}
      activeSidebarItem={activeSection}
      onSidebarItemChange={setActiveSection}
      width="5xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-8 text-gray-400" />
        </div>
      ) : (
        <>
          {/* Sección: Campos */}
          {activeSection === 'campos' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Campos Requeridos del Empleado
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Selecciona qué información debe completar el empleado durante el onboarding
                </p>
              </div>

              <Accordion type="multiple" defaultValue={['personales', 'bancarios']}>
                {/* Datos Personales */}
                <AccordionItem value="personales">
                  <AccordionTrigger className="text-sm font-medium">
                    Datos Personales
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {['nif', 'nss', 'telefono', 'direccionCalle', 'direccionNumero', 'direccionPiso', 'codigoPostal', 'ciudad', 'direccionProvincia', 'estadoCivil', 'numeroHijos'].map((campo) => (
                        <div key={campo} className="flex items-center space-x-3">
                          <Checkbox
                            id={`campo-${campo}`}
                            checked={camposRequeridos.datos_personales[campo as keyof typeof camposRequeridos.datos_personales]}
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
                          <Label htmlFor={`campo-${campo}`} className="cursor-pointer text-sm">
                            {campo === 'nif' ? 'DNI/NIE' :
                             campo === 'nss' ? 'Número Seguridad Social' :
                             campo === 'telefono' ? 'Teléfono' :
                             campo === 'direccionCalle' ? 'Calle' :
                             campo === 'direccionNumero' ? 'Número' :
                             campo === 'direccionPiso' ? 'Piso/Puerta' :
                             campo === 'codigoPostal' ? 'Código Postal' :
                             campo === 'ciudad' ? 'Ciudad' :
                             campo === 'direccionProvincia' ? 'Provincia' :
                             campo === 'estadoCivil' ? 'Estado Civil' :
                             'Número de Hijos'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Datos Bancarios */}
                <AccordionItem value="bancarios">
                  <AccordionTrigger className="text-sm font-medium">
                    Datos Bancarios
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
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
                          <Label htmlFor={`banco-${campo}`} className="cursor-pointer text-sm">
                            {campo === 'iban' ? 'IBAN' : 'Código BIC'}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex justify-start">
                <LoadingButton
                  onClick={guardarCamposRequeridos}
                  loading={saving}
                  disabled={saving}
                >
                  Guardar Campos
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Sección: Documentos para Visualizar/Descargar */}
          {activeSection === 'docs-visualizar' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Documentos para Ver/Descargar
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Selecciona los documentos existentes que el empleado podrá ver o descargar durante el onboarding
                </p>
              </div>

              <DocumentoSelector
                label="Documentos disponibles"
                description="Selecciona documentos de las carpetas globales"
                selectedDocuments={documentosVisualizar}
                onDocumentsChange={setDocumentosVisualizar}
                disabled={saving}
              />

              <div className="flex justify-start">
                <LoadingButton
                  onClick={guardarDocumentos}
                  loading={saving}
                  disabled={saving}
                >
                  Guardar
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Sección: Solicitar Documentos */}
          {activeSection === 'docs-solicitar' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Solicitar Documentos al Empleado
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Define qué documentos debe subir el empleado durante su onboarding
                  </p>
                </div>
                <Button onClick={añadirDocumentoSolicitar} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir
                </Button>
              </div>

              <div className="space-y-4">
                {documentosSolicitar.map((doc) => (
                  <DocumentoSolicitarCard
                    key={doc.id}
                    documento={doc}
                    equipos={equipos}
                    onUpdate={actualizarDocumentoSolicitar}
                    onDelete={eliminarDocumentoSolicitar}
                  />
                ))}

                {documentosSolicitar.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No hay documentos configurados</p>
                    <p className="text-sm">Haz clic en «Añadir» para solicitar documentos al empleado</p>
                  </div>
                )}
              </div>

              <div className="flex justify-start">
                <LoadingButton
                  onClick={guardarDocumentos}
                  loading={saving}
                  disabled={saving}
                >
                  Guardar
                </LoadingButton>
              </div>
            </div>
          )}

          {/* Sección: Firmas */}
          {activeSection === 'firmas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Documentos para Firma
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Documentos que requieren firma digital del empleado
                  </p>
                </div>
                <Button onClick={añadirFirma} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir
                </Button>
              </div>

              <div className="space-y-4">
                {firmasRequeridas.map((firma) => (
                  <FirmaCard
                    key={firma.id}
                    firma={firma}
                    equipos={equipos}
                    onUpdate={actualizarFirma}
                    onDelete={eliminarFirma}
                  />
                ))}

                {firmasRequeridas.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                    <FileSignature className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No hay documentos de firma configurados</p>
                    <p className="text-sm">Haz clic en «Añadir» para crear uno</p>
                  </div>
                )}
              </div>

              <div className="flex justify-start">
                <LoadingButton
                  onClick={guardarDocumentos}
                  loading={saving}
                  disabled={saving}
                >
                  Guardar
                </LoadingButton>
              </div>
            </div>
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
        </>
      )}
    </DialogWithSidebar>
  );
}

// Componente para tarjeta de documento a solicitar (simplificado)
function DocumentoSolicitarCard({
  documento,
  equipos,
  onUpdate,
  onDelete,
}: {
  documento: DocumentoRequerido;
  equipos: Equipo[];
  onUpdate: (id: string, campo: keyof DocumentoRequerido, valor: unknown) => void;
  onDelete: (id: string) => void;
}) {
  const carpetaDestinoActual = documento.carpetaDestino?.trim() || 'Otros';
  const esDestinoPersonalizado =
    !!carpetaDestinoActual &&
    !DESTINOS_SUGERIDOS.includes(carpetaDestinoActual as typeof DESTINOS_SUGERIDOS[number]);
  const valorSelect = esDestinoPersonalizado ? 'personalizada' : carpetaDestinoActual;

  const equiposItems = equipos.map((eq) => ({
    value: eq.id,
    label: eq.nombre,
  }));

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-amber-50 border-amber-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div>
            <Label>Título del documento *</Label>
            <Input
              value={documento.nombre}
              onChange={(e) => onUpdate(documento.id, 'nombre', e.target.value)}
              placeholder="ej: Foto del DNI, Certificado de estudios"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Asignado a</Label>
              <Select
                value={documento.asignadoA || 'todos'}
                onValueChange={(value: 'todos' | 'equipos') => {
                  onUpdate(documento.id, 'asignadoA', value);
                  if (value === 'todos') {
                    onUpdate(documento.id, 'equipoIds', []);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los empleados</SelectItem>
                  <SelectItem value="equipos">Equipos específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Carpeta destino *</Label>
              <Select
                value={valorSelect}
                onValueChange={(value) => {
                  if (value !== 'personalizada') {
                    onUpdate(documento.id, 'carpetaDestino', value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESTINOS_SUGERIDOS.map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                  <SelectItem value="personalizada">Carpeta personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {valorSelect === 'personalizada' && (
            <div>
              <Input
                value={carpetaDestinoActual}
                onChange={(e) => onUpdate(documento.id, 'carpetaDestino', e.target.value)}
                placeholder="Nombre de la carpeta personalizada"
              />
            </div>
          )}

          {documento.asignadoA === 'equipos' && (
            <div>
              <Label>Equipos</Label>
              <SearchableMultiSelect
                items={equiposItems}
                values={documento.equipoIds || []}
                onChange={(values) => onUpdate(documento.id, 'equipoIds', values)}
                placeholder="Seleccionar equipos"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`req-${documento.id}`}
              checked={documento.requerido}
              onCheckedChange={(checked) =>
                onUpdate(documento.id, 'requerido', checked === true)
              }
            />
            <Label htmlFor={`req-${documento.id}`} className="text-sm">Requerido</Label>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(documento.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Componente para tarjeta de firma
function FirmaCard({
  firma,
  equipos,
  onUpdate,
  onDelete,
}: {
  firma: DocumentoRequerido;
  equipos: Equipo[];
  onUpdate: (id: string, campo: keyof DocumentoRequerido, valor: unknown) => void;
  onDelete: (id: string) => void;
}) {
  const carpetaDestinoActual = firma.carpetaDestino?.trim() || 'Contratos';
  const esDestinoPersonalizado =
    !!carpetaDestinoActual &&
    !DESTINOS_SUGERIDOS.includes(carpetaDestinoActual as typeof DESTINOS_SUGERIDOS[number]);
  const valorSelect = esDestinoPersonalizado ? 'personalizada' : carpetaDestinoActual;

  const equiposItems = equipos.map((eq) => ({
    value: eq.id,
    label: eq.nombre,
  }));

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-3">
          <div>
            <Label>Nombre del documento</Label>
            <Input
              value={firma.nombre}
              onChange={(e) => onUpdate(firma.id, 'nombre', e.target.value)}
              placeholder="ej: Contrato laboral, Acuerdo de confidencialidad"
            />
          </div>

          <div>
            <Label>Descripción (opcional)</Label>
            <Input
              value={firma.descripcion || ''}
              onChange={(e) => onUpdate(firma.id, 'descripcion', e.target.value)}
              placeholder="Breve descripción del documento"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Asignado a</Label>
              <Select
                value={firma.asignadoA || 'todos'}
                onValueChange={(value: 'todos' | 'equipos') => {
                  onUpdate(firma.id, 'asignadoA', value);
                  if (value === 'todos') {
                    onUpdate(firma.id, 'equipoIds', []);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los empleados</SelectItem>
                  <SelectItem value="equipos">Equipos específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Carpeta destino</Label>
              <Select
                value={valorSelect}
                onValueChange={(value) => {
                  if (value !== 'personalizada') {
                    onUpdate(firma.id, 'carpetaDestino', value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DESTINOS_SUGERIDOS.map((dest) => (
                    <SelectItem key={dest} value={dest}>
                      {dest}
                    </SelectItem>
                  ))}
                  <SelectItem value="personalizada">Carpeta personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {valorSelect === 'personalizada' && (
            <div>
              <Input
                value={carpetaDestinoActual}
                onChange={(e) => onUpdate(firma.id, 'carpetaDestino', e.target.value)}
                placeholder="Nombre de la carpeta personalizada"
              />
            </div>
          )}

          {firma.asignadoA === 'equipos' && (
            <div>
              <Label>Equipos</Label>
              <SearchableMultiSelect
                items={equiposItems}
                values={firma.equipoIds || []}
                onChange={(values) => onUpdate(firma.id, 'equipoIds', values)}
                placeholder="Seleccionar equipos"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Switch
              id={`async-${firma.id}`}
              checked={firma.esAsincronico || false}
              onCheckedChange={(checked) =>
                onUpdate(firma.id, 'esAsincronico', checked)
              }
            />
            <Label htmlFor={`async-${firma.id}`} className="text-sm">
              Firma asíncrona
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="text-gray-400 cursor-help">(?)</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    El documento se subirá después de que el empleado complete el onboarding. 
                    Útil cuando necesitas datos del empleado antes de generar el documento.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`req-firma-${firma.id}`}
              checked={firma.requerido}
              onCheckedChange={(checked) =>
                onUpdate(firma.id, 'requerido', checked === true)
              }
            />
            <Label htmlFor={`req-firma-${firma.id}`} className="text-sm">Requerido</Label>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(firma.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
