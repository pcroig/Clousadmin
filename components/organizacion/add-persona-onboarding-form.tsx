'use client';

// ========================================
// Add Persona Onboarding Form - Wizard Multi-paso
// ========================================
// Formulario para crear empleado y activar onboarding con navegación por pasos

import { FileSignature, FileText, Mail, Upload } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type DocumentoRequerido, filtrarDocumentosPorEquipo, type WorkflowAccion, getTipoAccionLabel } from '@/lib/onboarding-config-types';
import { parseJson } from '@/lib/utils/json';
import { cn } from '@/lib/utils';
import { AddPersonaDocumentForm } from './add-persona-document-form';

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
  // Datos personales opcionales
  nif?: string;
  nss?: string;
  fechaNacimiento?: string;
  telefono?: string;
  // Dirección opcional
  direccionCalle?: string;
  direccionNumero?: string;
  direccionPiso?: string;
  codigoPostal?: string;
  ciudad?: string;
  direccionProvincia?: string;
  // Datos laborales opcionales
  salarioBaseAnual?: string;
  tipoContrato?: string;
  // Datos bancarios opcionales
  iban?: string;
  bic?: string;
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

  // Documentos y firmas (DEPRECADO - solo para empleado existente)
  const [documentosSubidos, setDocumentosSubidos] = useState<DocumentoSubido[]>([]);
  const [documentosConfig, setDocumentosConfig] = useState<DocumentoRequerido[]>([]);
  const [firmasConfig, setFirmasConfig] = useState<DocumentoRequerido[]>([]);

  // Workflow de onboarding (para empleado nuevo)
  const [workflowAcciones, setWorkflowAcciones] = useState<WorkflowAccion[]>([]);
  const [accionesActivas, setAccionesActivas] = useState<Record<string, boolean>>({});

  // Si es empleado existente, solo mostrar el paso de datos básicos (sin onboarding)
  const steps = tipoEmpleado === 'existente'
    ? [{ id: 'basicos', label: 'Datos del Empleado' }]
    : [
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
      ]);

      // Si es empleado existente, cargar config antigua + empleados sin onboarding
      if (tipoEmpleado === 'existente') {
        await cargarConfiguracionOnboarding(); // Sistema antiguo
        await cargarEmpleadosExistentes();
      } else {
        // Si es empleado nuevo, cargar workflow nuevo
        await cargarWorkflowOnboarding();
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

  const cargarWorkflowOnboarding = async () => {
    try {
      const res = await fetch('/api/onboarding/config');
      const data = await parseJson<{ workflowAcciones?: WorkflowAccion[] }>(res);

      if (data.workflowAcciones && Array.isArray(data.workflowAcciones)) {
        setWorkflowAcciones(data.workflowAcciones);

        // Inicializar todas las acciones como activas por defecto
        const activasDefault: Record<string, boolean> = {};
        data.workflowAcciones.forEach((accion) => {
          activasDefault[accion.id] = accion.activo;
        });
        setAccionesActivas(activasDefault);
      }
    } catch (error) {
      console.error('[cargarWorkflowOnboarding] Error:', error);
      toast.error('Error al cargar configuración de onboarding');
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
      // Crear empleado con todos los campos opcionales
      const empleadoData: Record<string, unknown> = {
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        email: formData.email,
        fechaAlta: formData.fechaAlta,
        puestoId: formData.puestoId || undefined,
        sedeId: formData.sedeId || undefined,
        activo: tipoEmpleado === 'existente' ? true : false, // Existente ya está activo, nuevo espera onboarding
      };

      // Añadir campos opcionales si están presentes
      if (formData.nif) empleadoData.nif = formData.nif;
      if (formData.nss) empleadoData.nss = formData.nss;
      if (formData.fechaNacimiento) empleadoData.fechaNacimiento = formData.fechaNacimiento;
      if (formData.telefono) empleadoData.telefono = formData.telefono;
      if (formData.direccionCalle) empleadoData.direccionCalle = formData.direccionCalle;
      if (formData.direccionNumero) empleadoData.direccionNumero = formData.direccionNumero;
      if (formData.direccionPiso) empleadoData.direccionPiso = formData.direccionPiso;
      if (formData.codigoPostal) empleadoData.codigoPostal = formData.codigoPostal;
      if (formData.ciudad) empleadoData.ciudad = formData.ciudad;
      if (formData.direccionProvincia) empleadoData.direccionProvincia = formData.direccionProvincia;
      if (formData.salarioBaseAnual) empleadoData.salarioBaseAnual = formData.salarioBaseAnual;
      if (formData.tipoContrato) empleadoData.tipoContrato = formData.tipoContrato;
      if (formData.iban) empleadoData.iban = formData.iban;
      if (formData.bic) empleadoData.bic = formData.bic;

      const resEmpleado = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empleadoData),
      });

      const dataEmpleado = await parseJson<{id: string; error?: string}>(resEmpleado);

      if (!resEmpleado.ok || !dataEmpleado.id) {
        throw new Error(dataEmpleado.error || 'Error al crear empleado');
      }

      const empleadoId = dataEmpleado.id;

      // Asignar a equipo si fue seleccionado
      if (formData.equipoId) {
        try {
          const resEquipo = await fetch(`/api/equipos/${formData.equipoId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empleadoId }),
          });

          if (!resEquipo.ok) {
            console.error('[handleSubmit] Error al asignar equipo:', await resEquipo.text());
            // No lanzar error, solo log - continuar con el onboarding
          }
        } catch (equipoError) {
          console.error('[handleSubmit] Error al asignar equipo:', equipoError);
          // No lanzar error, solo log - continuar con el onboarding
        }
      }

      // Si es empleado existente, solo creamos y terminamos (sin onboarding)
      if (tipoEmpleado === 'existente') {
        toast.success('Empleado añadido correctamente', { duration: 5000 });
        onSuccess();
        onOpenChange(false);
        return;
      }

      // Si es empleado nuevo, continuar con onboarding
      // Subir documentos
      if (documentosSubidos.length > 0) {
        setUploadingDocs(true);
        await subirDocumentos(empleadoId);
        setUploadingDocs(false);
      }

      // Enviar invitación de onboarding con acciones seleccionadas
      console.log('[handleSubmit] Enviando invitación con:', {
        empleadoId,
        tipoOnboarding: 'completo',
        accionesActivas,
      });

      const resOnboarding = await fetch('/api/empleados/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoId,
          tipoOnboarding: 'completo',
          accionesActivas,
        }),
      });

      if (!resOnboarding.ok) {
        const errorData = await resOnboarding.json() as { error?: string };
        throw new Error(errorData.error || 'Error al enviar invitación');
      }

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
      // Para nuevo y existente manual, validar los mismos campos básicos
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

  // Si es empleado existente, usar Dialog simple (sin sidebar ni wizard)
  if (tipoEmpleado === 'existente') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Añadir Empleado Existente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Añadir Manualmente</TabsTrigger>
                <TabsTrigger value="import">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 mt-4">
                {/* Campos obligatorios */}
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
                    <Label>Sede</Label>
                    <SearchableSelect
                      items={sedesItems}
                      value={formData.sedeId}
                      onChange={(value) => setFormData({...formData, sedeId: value})}
                      placeholder="Seleccionar sede"
                    />
                  </div>
                </div>

                {/* Campos opcionales adicionales - Colapsados */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="datos-personales">
                    <AccordionTrigger className="text-sm font-medium">
                      Datos Personales (opcional)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <Label>NIF/DNI/NIE</Label>
                          <Input
                            value={formData.nif || ''}
                            onChange={(e) => setFormData({...formData, nif: e.target.value})}
                            placeholder="12345678A"
                          />
                        </div>

                        <div>
                          <Label>NSS</Label>
                          <Input
                            value={formData.nss || ''}
                            onChange={(e) => setFormData({...formData, nss: e.target.value})}
                            placeholder="123456789012"
                          />
                        </div>

                        <div>
                          <Label>Fecha de Nacimiento</Label>
                          <Input
                            type="date"
                            value={formData.fechaNacimiento || ''}
                            onChange={(e) => setFormData({...formData, fechaNacimiento: e.target.value})}
                          />
                        </div>

                        <div>
                          <Label>Teléfono</Label>
                          <Input
                            value={formData.telefono || ''}
                            onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                            placeholder="+34 600 000 000"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="direccion">
                    <AccordionTrigger className="text-sm font-medium">
                      Dirección (opcional)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <Label>Calle</Label>
                          <Input
                            value={formData.direccionCalle || ''}
                            onChange={(e) => setFormData({...formData, direccionCalle: e.target.value})}
                            placeholder="Calle Mayor"
                          />
                        </div>

                        <div>
                          <Label>Número</Label>
                          <Input
                            value={formData.direccionNumero || ''}
                            onChange={(e) => setFormData({...formData, direccionNumero: e.target.value})}
                            placeholder="123"
                          />
                        </div>

                        <div>
                          <Label>Piso/Puerta</Label>
                          <Input
                            value={formData.direccionPiso || ''}
                            onChange={(e) => setFormData({...formData, direccionPiso: e.target.value})}
                            placeholder="3º A"
                          />
                        </div>

                        <div>
                          <Label>Código Postal</Label>
                          <Input
                            value={formData.codigoPostal || ''}
                            onChange={(e) => setFormData({...formData, codigoPostal: e.target.value})}
                            placeholder="28001"
                          />
                        </div>

                        <div>
                          <Label>Ciudad</Label>
                          <Input
                            value={formData.ciudad || ''}
                            onChange={(e) => setFormData({...formData, ciudad: e.target.value})}
                            placeholder="Madrid"
                          />
                        </div>

                        <div>
                          <Label>Provincia</Label>
                          <Input
                            value={formData.direccionProvincia || ''}
                            onChange={(e) => setFormData({...formData, direccionProvincia: e.target.value})}
                            placeholder="Madrid"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="datos-laborales">
                    <AccordionTrigger className="text-sm font-medium">
                      Datos Laborales (opcional)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <Label>Salario Base Anual</Label>
                          <Input
                            type="number"
                            value={formData.salarioBaseAnual || ''}
                            onChange={(e) => setFormData({...formData, salarioBaseAnual: e.target.value})}
                            placeholder="30000"
                          />
                        </div>

                        <div>
                          <Label>Tipo de Contrato</Label>
                          <SearchableSelect
                            items={[
                              { id: 'indefinido', label: 'Indefinido' },
                              { id: 'temporal', label: 'Temporal' },
                              { id: 'practicas', label: 'Prácticas' },
                              { id: 'formacion', label: 'Formación' },
                            ]}
                            value={formData.tipoContrato || ''}
                            onChange={(value) => setFormData({...formData, tipoContrato: value})}
                            placeholder="Seleccionar tipo"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="datos-bancarios">
                    <AccordionTrigger className="text-sm font-medium">
                      Datos Bancarios (opcional)
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <Label>IBAN</Label>
                          <Input
                            value={formData.iban || ''}
                            onChange={(e) => setFormData({...formData, iban: e.target.value})}
                            placeholder="ES91 2100 0418 4502 0005 1332"
                          />
                        </div>

                        <div>
                          <Label>BIC/SWIFT</Label>
                          <Input
                            value={formData.bic || ''}
                            onChange={(e) => setFormData({...formData, bic: e.target.value})}
                            placeholder="CAIXESBBXXX"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <LoadingButton
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={!canGoNext() || loading}
                  >
                    Añadir Empleado
                  </LoadingButton>
                </div>
              </TabsContent>

              <TabsContent value="import" className="mt-4">
                <AddPersonaDocumentForm
                  onSuccess={() => {
                    toast.success('Empleado(s) importado(s) correctamente');
                    onSuccess();
                    onOpenChange(false);
                  }}
                  onCancel={() => onOpenChange(false)}
                />
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    );
  }


  // Para empleado nuevo, usar Dialog simple con 2 pasos
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'basicos' ? 'Nuevo Empleado - Datos Básicos' : 'Nuevo Empleado - Configurar Onboarding'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Paso 1: Datos Básicos */}
          {currentStep === 'basicos' && (
            <div className="space-y-4">
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

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (canGoNext()) {
                      setCurrentStep('acciones-workflow');
                    }
                  }}
                  disabled={!canGoNext()}
                >
                  Siguiente: Configurar Onboarding
                </Button>
              </div>
            </div>
          )}

          {/* Paso 2: Acciones del Workflow */}
          {currentStep === 'acciones-workflow' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  Acciones del Onboarding
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona qué acciones debe completar este empleado durante su onboarding
                </p>
              </div>

              {workflowAcciones.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-gray-50">
                  <p className="text-gray-600">No hay acciones configuradas en el workflow</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Ve a "Gestionar Onboarding" para configurar el workflow
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflowAcciones.map((accion) => {
                    const isActive = accionesActivas[accion.id] !== false;

                    return (
                      <div
                        key={accion.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{accion.titulo}</p>
                            <Badge variant="outline">
                              {getTipoAccionLabel(accion.tipo)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`accion-${accion.id}`} className="text-sm text-gray-600">
                            {isActive ? 'Activa' : 'Inactiva'}
                          </Label>
                          <Switch
                            id={`accion-${accion.id}`}
                            checked={isActive}
                            onCheckedChange={(checked) => {
                              setAccionesActivas({
                                ...accionesActivas,
                                [accion.id]: checked,
                              });
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-between gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep('basicos')}
                  disabled={loading}
                >
                  Anterior
                </Button>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <LoadingButton
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={loading}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Invitación
                  </LoadingButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
