'use client';

// ========================================
// Add Persona Onboarding Form - Wizard Multi-paso
// ========================================
// Formulario para crear empleado y activar onboarding con navegación por pasos

import { FileSignature, FileText, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Combobox, type ComboboxOption } from '@/components/shared/combobox';
import { DialogWithSidebar } from '@/components/shared/dialog-with-sidebar';
import { DocumentUploader } from '@/components/shared/document-uploader';
import { LoadingButton } from '@/components/shared/loading-button';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { WizardSteps } from '@/components/shared/wizard-steps';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type DocumentoRequerido, filtrarDocumentosPorEquipo } from '@/lib/onboarding-config-types';
import { parseJson } from '@/lib/utils/json';
import { cn } from '@/lib/utils';

interface AddPersonaOnboardingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tipoEmpleado: 'nuevo' | 'existente';
}

interface FormData {
  nombre: string;
  apellidos: string;
  email: string;
  fechaAlta: string;
  puestoId: string;
  equipoId: string;
  sedeId: string;
}

interface DocumentoSubido {
  id: string;
  nombre: string;
  file: File;
  carpetaDestino: string;
}

interface Puesto {
  id: string;
  nombre: string;
}

interface Equipo {
  id: string;
  nombre: string;
}

interface Sede {
  id: string;
  nombre: string;
  ciudad?: string;
}

interface EmpleadoExistente {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
}

export function AddPersonaOnboardingForm({
  open,
  onOpenChange,
  onSuccess,
  tipoEmpleado,
}: AddPersonaOnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState('basicos');
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  
  // Datos del formulario
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    apellidos: '',
    email: '',
    fechaAlta: new Date().toISOString().split('T')[0],
    puestoId: '',
    equipoId: '',
    sedeId: '',
  });

  // Empleado seleccionado (si es existente)
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState('');
  const [empleadosExistentes, setEmpleadosExistentes] = useState<EmpleadoExistente[]>([]);

  // Opciones disponibles
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);

  // Documentos y firmas
  const [documentosSubidos, setDocumentosSubidos] = useState<DocumentoSubido[]>([]);
  const [documentosConfig, setDocumentosConfig] = useState<DocumentoRequerido[]>([]);
  const [firmasConfig, setFirmasConfig] = useState<DocumentoRequerido[]>([]);

  const steps = [
    { id: 'basicos', label: 'Datos Básicos' },
    { id: 'docs-visualizar', label: 'Ver/Descargar' },
    { id: 'docs-solicitar', label: 'Solicitar Documentos' },
    { id: 'firmas', label: 'Firmas' },
  ];

  // Cargar datos iniciales al montar el componente
  useEffect(() => {
    cargarDatosIniciales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatosIniciales = async () => {
    try {
      // Cargar puestos, equipos y sedes
      await Promise.all([
        cargarPuestos(),
        cargarEquipos(),
        cargarSedes(),
        cargarConfiguracionOnboarding(),
      ]);

      // Si es empleado existente, cargar lista de empleados sin onboarding
      if (tipoEmpleado === 'existente') {
        await cargarEmpleadosExistentes();
      }
    } catch (error) {
      console.error('[cargarDatosIniciales] Error:', error);
      toast.error('Error al cargar datos iniciales');
    }
  };

  const cargarPuestos = async () => {
    try {
      const res = await fetch('/api/organizacion/puestos');
      const data = await parseJson<Puesto[]>(res);
      setPuestos(data);
    } catch (error) {
      console.error('[cargarPuestos] Error:', error);
    }
  };

  const cargarEquipos = async () => {
    try {
      const res = await fetch('/api/equipos');
      const data = await parseJson<{ data: Equipo[] }>(res);
      setEquipos(data.data || []);
    } catch (error) {
      console.error('[cargarEquipos] Error:', error);
      setEquipos([]); // Asegurar que siempre sea array
    }
  };

  const cargarSedes = async () => {
    try {
      const res = await fetch('/api/sedes');
      const data = await parseJson<Sede[]>(res);
      setSedes(data);
    } catch (error) {
      console.error('[cargarSedes] Error:', error);
    }
  };

  const cargarConfiguracionOnboarding = async () => {
    try {
      const res = await fetch('/api/hr/onboarding-config');
      const data = await parseJson<{
        success?: boolean;
        config?: { documentosRequeridos?: DocumentoRequerido[] };
      }>(res);

      if (data.success && data.config?.documentosRequeridos) {
        const docs = data.config.documentosRequeridos;
        setDocumentosConfig(docs.filter((d) => !d.requiereFirma));
        setFirmasConfig(docs.filter((d) => d.requiereFirma));
      }
    } catch (error) {
      console.error('[cargarConfiguracionOnboarding] Error:', error);
    }
  };

  const cargarEmpleadosExistentes = async () => {
    try {
      const res = await fetch('/api/empleados?onboardingActivo=false');
      const data = await parseJson<{data?: EmpleadoExistente[]}>(res);
      setEmpleadosExistentes(data.data || []);
    } catch (error) {
      console.error('[cargarEmpleadosExistentes] Error:', error);
    }
  };

  const handleCreatePuesto = async (nombre: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/organizacion/puestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });

      const data = await parseJson<Puesto>(res);
      if (res.ok) {
        setPuestos((prev) => [...prev, data]);
        toast.success('Puesto creado correctamente');
        return data.id;
      }
      return null;
    } catch (error) {
      console.error('[handleCreatePuesto] Error:', error);
      toast.error('Error al crear puesto');
      return null;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      let empleadoId: string;

      if (tipoEmpleado === 'existente') {
        // Usar empleado existente
        empleadoId = empleadoSeleccionadoId;
      } else {
        // Crear nuevo empleado
        const resEmpleado = await fetch('/api/empleados', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: formData.nombre,
            apellidos: formData.apellidos,
            email: formData.email,
            fechaAlta: formData.fechaAlta,
            puestoId: formData.puestoId || undefined,
            sedeId: formData.sedeId || undefined,
            activo: false, // Inactivo hasta completar onboarding
          }),
        });

        const dataEmpleado = await parseJson<{id: string; error?: string}>(resEmpleado);
        
        if (!resEmpleado.ok || !dataEmpleado.id) {
          throw new Error(dataEmpleado.error || 'Error al crear empleado');
        }

        empleadoId = dataEmpleado.id;

        // Asignar a equipo si fue seleccionado
        if (formData.equipoId) {
          await fetch(`/api/equipos/${formData.equipoId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empleadoId }),
          });
        }
      }

      // Subir documentos
      if (documentosSubidos.length > 0) {
        setUploadingDocs(true);
        await subirDocumentos(empleadoId);
        setUploadingDocs(false);
      }

      // Enviar invitación de onboarding
      const resOnboarding = await fetch('/api/onboarding/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId }),
      });

      const dataOnboarding = await parseJson<{success?: boolean; error?: string}>(resOnboarding);

      if (!dataOnboarding.success) {
        throw new Error(dataOnboarding.error || 'Error al enviar invitación');
      }

      toast.success('Empleado creado y email de onboarding enviado', { duration: 5000 });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('[handleSubmit] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear empleado');
    } finally {
      setLoading(false);
      setUploadingDocs(false);
    }
  };

  const subirDocumentos = async (empleadoId: string) => {
    for (const doc of documentosSubidos) {
      try {
        const formData = new FormData();
        formData.append('file', doc.file);
        formData.append('nombre', doc.nombre);
        formData.append('carpetaDestino', doc.carpetaDestino);
        formData.append('empleadoId', empleadoId);

        await fetch('/api/documentos', {
          method: 'POST',
          body: formData,
        });
      } catch (error) {
        console.error(`[subirDocumentos] Error subiendo ${doc.nombre}:`, error);
      }
    }
  };

  const añadirDocumento = async (file: File, carpetaDestino: string) => {
    const nuevoDoc: DocumentoSubido = {
      id: `temp_${Date.now()}`,
      nombre: file.name,
      file,
      carpetaDestino,
    };
    setDocumentosSubidos((prev) => [...prev, nuevoDoc]);
    toast.success('Documento añadido');
  };

  const eliminarDocumento = (id: string) => {
    setDocumentosSubidos((prev) => prev.filter((d) => d.id !== id));
  };

  // Filtrar documentos por equipo seleccionado
  const documentosFiltrados = filtrarDocumentosPorEquipo(
    documentosConfig,
    formData.equipoId ? [formData.equipoId] : []
  );

  const firmasFiltradas = filtrarDocumentosPorEquipo(
    firmasConfig,
    formData.equipoId ? [formData.equipoId] : []
  );

  // Validaciones por paso
  const canGoNext = () => {
    if (currentStep === 'basicos') {
      if (tipoEmpleado === 'existente') {
        return empleadoSeleccionadoId !== '';
      }
      return formData.nombre && formData.apellidos && formData.email && formData.puestoId && formData.equipoId;
    }
    return true;
  };

  const handleNext = () => {
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    if (currentIndex < steps.length - 1 && canGoNext()) {
      setCurrentStep(steps[currentIndex + 1].id);
    } else if (currentIndex === steps.length - 1) {
      // Último paso, submit
      handleSubmit();
    }
  };

  const puestosOptions: ComboboxOption[] = puestos.map((p) => ({
    value: p.id,
    label: p.nombre,
  }));

  const equiposItems = equipos.map((e) => ({
    value: e.id,
    label: e.nombre,
  }));

  const sedesItems = sedes.map((s) => ({
    value: s.id,
    label: s.ciudad ? `${s.nombre} (${s.ciudad})` : s.nombre,
  }));

  const empleadosItems = empleadosExistentes.map((e) => ({
    value: e.id,
    label: `${e.nombre} ${e.apellidos} (${e.email})`,
  }));

  const sidebarItems = steps.map((step) => ({
    id: step.id,
    label: step.label,
    icon: () => {
      const index = steps.findIndex((s) => s.id === step.id);
      const currentIndex = steps.findIndex((s) => s.id === currentStep);
      const isCompleted = index < currentIndex;
      const isActive = step.id === currentStep;
      
      return (
        <div
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold',
            isActive && 'bg-gray-400 text-white',
            isCompleted && !isActive && 'bg-primary text-primary-foreground',
            index > currentIndex && 'bg-gray-200 text-gray-500'
          )}
        >
          {index + 1}
        </div>
      );
    },
  }));

  return (
    <DialogWithSidebar
      open={open}
      onOpenChange={onOpenChange}
      title={tipoEmpleado === 'nuevo' ? 'Nuevo Empleado' : 'Activar Onboarding'}
      sidebar={sidebarItems}
      activeSidebarItem={currentStep}
      onSidebarItemChange={(stepId) => {
        // Solo permitir ir a pasos anteriores o actual
        const targetIndex = steps.findIndex((s) => s.id === stepId);
        const currentIndex = steps.findIndex((s) => s.id === currentStep);
        if (targetIndex <= currentIndex) {
          setCurrentStep(stepId);
        }
      }}
      width="4xl"
      showCloseButton={!loading}
    >
      <div className="flex flex-col h-full">{/* Contenido sin WizardSteps */}
        {/* Contenido del paso actual */}
        <div className="flex-1 overflow-y-auto">
          {/* Paso 1: Datos Básicos */}
        {currentStep === 'basicos' && (
          <div className="space-y-6">
            {tipoEmpleado === 'existente' ? (
              <>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    Seleccionar Empleado
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Elige el empleado para el que deseas activar el onboarding
                  </p>
                </div>

                <div>
                  <Label>Empleado</Label>
                  <SearchableSelect
                    items={empleadosItems}
                    value={empleadoSeleccionadoId}
                    onChange={setEmpleadoSeleccionadoId}
                    placeholder="Buscar empleado..."
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    Información del Empleado
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Completa los datos básicos del nuevo empleado
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      placeholder="Juan"
                      required
                    />
                  </div>

                  <div>
                    <Label>Apellidos *</Label>
                    <Input
                      value={formData.apellidos}
                      onChange={(e) => setFormData({...formData, apellidos: e.target.value})}
                      placeholder="García López"
                      required
                    />
                  </div>

                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="juan.garcia@empresa.com"
                      required
                    />
                  </div>

                  <div>
                    <Label>Fecha de Alta</Label>
                    <Input
                      type="date"
                      value={formData.fechaAlta}
                      onChange={(e) => setFormData({...formData, fechaAlta: e.target.value})}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>Puesto *</Label>
                    <Combobox
                      options={puestosOptions}
                      value={formData.puestoId}
                      onValueChange={(value) => setFormData({...formData, puestoId: value || ''})}
                      placeholder="Seleccionar o crear puesto"
                      emptyText="No se encontraron puestos"
                      createText="Crear nuevo puesto"
                      onCreateNew={handleCreatePuesto}
                    />
                  </div>

                  <div>
                    <Label>Equipo *</Label>
                    <SearchableSelect
                      items={equiposItems}
                      value={formData.equipoId}
                      onChange={(value) => setFormData({...formData, equipoId: value})}
                      placeholder="Seleccionar equipo"
                    />
                  </div>

                  <div>
                    <Label>Sede (opcional)</Label>
                    <SearchableSelect
                      items={sedesItems}
                      value={formData.sedeId}
                      onChange={(value) => setFormData({...formData, sedeId: value})}
                      placeholder="Seleccionar sede"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Paso 2: Documentos para Visualizar */}
        {currentStep === 'docs-visualizar' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Documentos para Visualizar/Descargar
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Documentos que el empleado podrá ver o descargar durante el onboarding
              </p>
            </div>

            {documentosFiltrados.filter((d) => d.tipo === 'visualizar').length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Documentos configurados:
                </p>
                {documentosFiltrados
                  .filter((d) => d.tipo === 'visualizar')
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{doc.nombre}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No hay documentos de visualización configurados</p>
                <p className="text-xs mt-1">
                  Puedes configurarlos en "Gestionar Onboarding"
                </p>
              </div>
            )}

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Documentos adicionales:
              </p>
              <div className="space-y-3">
                <DocumentUploader
                  label="Subir documento adicional"
                  description="PDF, JPG o PNG (máx. 5MB)"
                  onUpload={(file) => añadirDocumento(file, 'Otros')}
                  disabled={loading || uploadingDocs}
                />

                {documentosSubidos.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{doc.nombre}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarDocumento(doc.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Paso 3: Solicitar Documentos */}
        {currentStep === 'docs-solicitar' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Documentos a Solicitar al Empleado
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Estos son los documentos que el empleado deberá subir durante su onboarding
              </p>
            </div>

            {documentosFiltrados.filter((d) => d.tipo === 'solicitar').length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Documentos configurados:
                </p>
                {documentosFiltrados
                  .filter((d) => d.tipo === 'solicitar')
                  .map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-amber-50 border-amber-200"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-amber-600" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{doc.nombre}</span>
                          <span className="text-xs text-gray-500">
                            Carpeta: {doc.carpetaDestino || 'Otros'}
                          </span>
                        </div>
                        {doc.requerido && (
                          <Badge variant="secondary" className="text-xs bg-amber-100">
                            Requerido
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No hay documentos configurados para solicitar</p>
                <p className="text-xs mt-1">
                  El empleado no tendrá que subir ningún documento obligatorio
                </p>
              </div>
            )}

          </div>
        )}

        {/* Paso 4: Firmas */}
        {currentStep === 'firmas' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Documentos para Firma
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Documentos que requieren firma digital del empleado
              </p>
            </div>

            {firmasFiltradas.length > 0 ? (
              <div className="space-y-2">
                {firmasFiltradas.map((firma) => (
                  <div
                    key={firma.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <FileSignature className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{firma.nombre}</span>
                          {firma.requerido && (
                            <Badge variant="secondary" className="text-xs">
                              Requerido
                            </Badge>
                          )}
                          {firma.esAsincronico && (
                            <Badge variant="outline" className="text-xs">
                              Se subirá después del onboarding
                            </Badge>
                          )}
                        </div>
                        {firma.descripcion && (
                          <p className="text-xs text-gray-500 mt-1">{firma.descripcion}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
                <FileSignature className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No hay documentos de firma configurados</p>
              </div>
            )}

          </div>
        )}
        </div>

        {/* Navegación de pasos */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const currentIndex = steps.findIndex((s) => s.id === currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1].id);
              }
            }}
            disabled={steps.findIndex((s) => s.id === currentStep) === 0 || loading || uploadingDocs}
          >
            Anterior
          </Button>

          <div className="text-sm text-gray-500">
            Paso {steps.findIndex((s) => s.id === currentStep) + 1} de {steps.length}
          </div>

          {steps.findIndex((s) => s.id === currentStep) === steps.length - 1 ? (
            <LoadingButton
              type="button"
              onClick={handleSubmit}
              loading={loading || uploadingDocs}
              disabled={loading || uploadingDocs}
            >
              Finalizar y Enviar
            </LoadingButton>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext() || loading || uploadingDocs}
            >
              Siguiente
            </Button>
          )}
        </div>
      </div>
    </DialogWithSidebar>
  );
}
