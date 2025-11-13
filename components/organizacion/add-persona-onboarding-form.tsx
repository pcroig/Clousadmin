// ========================================
// Add Persona Onboarding Form
// ========================================
// Formulario para crear empleado y activar onboarding (envía email con link)
// Incluye funcionalidad para subir documentos iniciales

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Mail, CheckCircle2, Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingButton } from '@/components/shared/loading-button';
import { Combobox, type ComboboxOption } from '@/components/shared/combobox';
import { DocumentUploader } from '@/components/shared/document-uploader';
import { DocumentList } from '@/components/shared/document-list';
import { CarpetaSelector } from '@/components/shared/carpeta-selector';

interface DocumentoSubido {
  id: string;
  nombre: string;
  tipoDocumento: string;
  file: File;
  carpetaId?: string;
}

interface AddPersonaOnboardingFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  tipoOnboarding?: 'completo' | 'simplificado';
}

export function AddPersonaOnboardingForm({ onSuccess, onCancel, tipoOnboarding = 'completo' }: AddPersonaOnboardingFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [puestos, setPuestos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [documentosSubidos, setDocumentosSubidos] = useState<DocumentoSubido[]>([]);
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const [tipoDocumentoActual, setTipoDocumentoActual] = useState<string>('otro');
  const [nombreDocumentoActual, setNombreDocumentoActual] = useState<string>('');
  const [carpetaIdSeleccionada, setCarpetaIdSeleccionada] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    fechaAlta: new Date().toISOString().split('T')[0],
    puestoId: '',
  });

  useEffect(() => {
    async function fetchPuestos() {
      try {
        const response = await fetch('/api/organizacion/puestos');
        if (response.ok) {
          const data = await response.json();
          setPuestos(data || []);
        }
      } catch (error) {
        console.error('Error fetching puestos:', error);
      }
    }
    fetchPuestos();
  }, []);

  // Convertir puestos a formato ComboboxOption
  const puestosOptions: ComboboxOption[] = puestos.map((puesto) => ({
    value: puesto.id,
    label: puesto.nombre,
  }));

  // Función para crear un nuevo puesto
  const handleCreatePuesto = async (nombre: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/organizacion/puestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Error al crear puesto');
        return null;
      }

      const nuevoPuesto = await response.json();
      setPuestos([...puestos, nuevoPuesto]);
      toast.success('Puesto creado correctamente');
      return nuevoPuesto.id;
    } catch (error) {
      console.error('[AddPersonaOnboardingForm] Error creating puesto:', error);
      toast.error('Error al crear puesto');
      return null;
    }
  };

  // Manejar subida de documento
  const handleDocumentUpload = async (file: File, tipoDocumento: string, nombreDocumento: string) => {
    if (!empleadoId) {
      toast.error('Primero debes crear el empleado');
      return;
    }

    setUploadingDocs(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('nombreDocumento', nombreDocumento);
      formData.append('tipoDocumento', tipoDocumento);
      
      // Añadir carpetaId si se seleccionó una carpeta
      if (carpetaIdSeleccionada) {
        formData.append('carpetaId', carpetaIdSeleccionada);
      }

      const response = await fetch(`/api/empleados/${empleadoId}/onboarding/documentos`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Añadir a la lista de documentos subidos
        setDocumentosSubidos((prev) => [
          ...prev,
          {
            id: data.documento.id,
            nombre: nombreDocumento,
            tipoDocumento,
            file,
          },
        ]);
        toast.success('Documento subido correctamente');
      } else {
        toast.error(data.error || 'Error al subir documento');
        throw new Error(data.error || 'Error al subir documento');
      }
    } catch (error) {
      console.error('[AddPersonaOnboardingForm] Error subiendo documento:', error);
      throw error;
    } finally {
      setUploadingDocs(false);
    }
  };

  // Eliminar documento de la lista (solo local, no del servidor)
  const handleRemoveDocument = (id: string) => {
    setDocumentosSubidos((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.nombre || !formData.apellidos || !formData.email) {
      toast.error('Nombre, apellidos y email son requeridos');
      return;
    }

    setLoading(true);

    try {
      // Crear empleado
      interface EmpleadoCreateData {
        nombre: string;
        apellidos: string;
        email: string;
        fechaAlta: string;
        activo: boolean;
        onboardingCompletado: boolean;
        puestoId?: string;
      }
      
      const empleadoData: EmpleadoCreateData = {
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        email: formData.email,
        fechaAlta: formData.fechaAlta,
        activo: false, // Inactivo hasta que complete onboarding
        onboardingCompletado: false,
      };

      // Añadir puestoId si está seleccionado
      if (formData.puestoId) {
        empleadoData.puestoId = formData.puestoId;
      }

      const responseEmpleado = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empleadoData),
      });

      const dataEmpleado = await responseEmpleado.json();

      if (!responseEmpleado.ok) {
        // Manejo específico para email duplicado
        if (dataEmpleado.code === 'EMAIL_DUPLICADO' && dataEmpleado.empleadoExistente) {
          const empleado = dataEmpleado.empleadoExistente;
          toast.error(
            `El email ${formData.email} ya está registrado para ${empleado.nombre} ${empleado.apellidos}`,
            {
              duration: 6000,
              action: {
                label: 'Ver empleado',
                onClick: () => {
                  window.location.href = `/hr/organizacion/personas/${empleado.id}`;
                },
              },
            }
          );
        } else {
          toast.error(dataEmpleado.error || 'Error al crear empleado');
        }
        setLoading(false);
        return;
      }

      // Guardar empleadoId para subir documentos
      setEmpleadoId(dataEmpleado.id);

      // Activar onboarding (crea token y envía email)
      const responseOnboarding = await fetch('/api/empleados/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoId: dataEmpleado.id,
          tipoOnboarding: tipoOnboarding,
        }),
      });

      const onboardingData = await responseOnboarding.json();

      if (!responseOnboarding.ok) {
        toast.error(onboardingData.error || 'Error al activar onboarding');
        setLoading(false);
        return;
      }

      // Subir documentos si hay alguno pendiente (solo los temporales, no los ya subidos)
      const documentosPendientes = documentosSubidos.filter((doc) => doc.id.startsWith('temp-'));
      if (documentosPendientes.length > 0) {
        setUploadingDocs(true);
        try {
          for (const doc of documentosPendientes) {
            const formDataDoc = new FormData();
            formDataDoc.append('file', doc.file);
            formDataDoc.append('nombreDocumento', doc.nombre);
            formDataDoc.append('tipoDocumento', doc.tipoDocumento);

            const responseDoc = await fetch(`/api/empleados/${dataEmpleado.id}/onboarding/documentos`, {
              method: 'POST',
              body: formDataDoc,
            });

            const dataDoc = await responseDoc.json();

            if (!responseDoc.ok) {
              toast.error(`Error al subir ${doc.nombre}: ${dataDoc.error || 'Error desconocido'}`);
              continue; // Continuar con el siguiente documento
            }

            // Actualizar el documento temporal con el ID real
            setDocumentosSubidos((prev) =>
              prev.map((d) =>
                d.id === doc.id
                  ? { ...d, id: dataDoc.documento.id }
                  : d
              )
            );
          }
          if (documentosPendientes.length > 0) {
            toast.success(`${documentosPendientes.length} documento(s) subido(s) correctamente`);
          }
        } catch (error) {
          console.error('[AddPersonaOnboardingForm] Error subiendo documentos:', error);
          toast.error('Algunos documentos no se pudieron subir. Puedes subirlos más tarde desde el perfil del empleado.');
        } finally {
          setUploadingDocs(false);
        }
      }

      toast.success(
        `Empleado creado y email de onboarding enviado a ${formData.email}`,
        { duration: 5000 }
      );
      onSuccess();
    } catch (error) {
      console.error('[AddPersonaOnboardingForm] Error:', error);
      toast.error('Error al crear empleado y activar onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos Básicos */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 border-b pb-2 flex-1">
            Datos Básicos del Empleado
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          Se enviará un email automático con un link único para que el empleado complete su onboarding. El link expira en 7 días.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
              placeholder="Juan"
            />
          </div>
          <div>
            <Label htmlFor="apellidos">Apellidos *</Label>
            <Input
              id="apellidos"
              value={formData.apellidos}
              onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
              required
              placeholder="García López"
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="juan.garcia@empresa.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              El email de onboarding se enviará a esta dirección
            </p>
          </div>
          <div>
            <Label htmlFor="fechaAlta">Fecha de Alta</Label>
            <Input
              id="fechaAlta"
              type="date"
              value={formData.fechaAlta}
              onChange={(e) => setFormData({ ...formData, fechaAlta: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="puestoId">Puesto (opcional)</Label>
            <Combobox
              options={puestosOptions}
              value={formData.puestoId || undefined}
              onValueChange={(value) => setFormData({ ...formData, puestoId: value || '' })}
              placeholder="Seleccionar o crear puesto"
              emptyText="No se encontraron puestos."
              createText="Crear nuevo puesto"
              onCreateNew={handleCreatePuesto}
            />
          </div>
        </div>
      </div>

      {/* Subida de Documentos (Opcional) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
          Documentos Iniciales (Opcional)
        </h3>
        <p className="text-sm text-gray-600">
          Puedes subir documentos ahora o más tarde. Los documentos se asociarán al proceso de onboarding del empleado.
        </p>

        {/* Uploader de documentos */}
        {!empleadoId ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipoDocumento">Tipo de Documento</Label>
                <Select
                  value={tipoDocumentoActual}
                  onValueChange={(value) => {
                    setTipoDocumentoActual(value);
                  }}
                >
                  <SelectTrigger id="tipoDocumento">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="dni">DNI/NIE</SelectItem>
                    <SelectItem value="nomina">Nómina</SelectItem>
                    <SelectItem value="medico">Certificado Médico</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nombreDocumento">Nombre del Documento</Label>
                <Input
                  id="nombreDocumento"
                  placeholder="Ej: Contrato laboral"
                  value={nombreDocumentoActual}
                  onChange={(e) => {
                    setNombreDocumentoActual(e.target.value);
                  }}
                />
              </div>
            </div>
            
            {/* Selector de Carpeta - solo cuando el empleado ya existe */}
            {empleadoId && (
              <CarpetaSelector
                empleadoId={empleadoId}
                value={carpetaIdSeleccionada}
                onChange={setCarpetaIdSeleccionada}
                label="Carpeta de destino (opcional)"
                placeholder="Seleccionar carpeta o crear automáticamente"
                onNuevaCarpeta={async (nombre) => {
                  try {
                    const response = await fetch('/api/carpetas', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        nombre,
                        empleadoId,
                        compartida: false,
                      }),
                    });
                    
                    if (!response.ok) {
                      toast.error('Error al crear carpeta');
                      return null;
                    }
                    
                    const { carpeta } = await response.json();
                    toast.success('Carpeta creada correctamente');
                    return carpeta.id;
                  } catch (error) {
                    toast.error('Error al crear carpeta');
                    return null;
                  }
                }}
              />
            )}
            <DocumentUploader
              label="Subir documento"
              description="PDF, JPG o PNG (máx. 5MB)"
              onUpload={async (file) => {
                // Obtener tipo y nombre del documento
                const tipoDocumento = tipoDocumentoActual || 'otro';
                const nombreDocumento = nombreDocumentoActual || file.name.split('.')[0];
                
                // Crear documento temporal en la lista
                const tempId = `temp-${Date.now()}`;
                
                setDocumentosSubidos((prev) => [
                  ...prev,
                  {
                    id: tempId,
                    nombre: nombreDocumento,
                    tipoDocumento,
                    file,
                    carpetaId: carpetaIdSeleccionada || undefined,
                  },
                ]);
                
                // Limpiar campos
                setTipoDocumentoActual('otro');
                setNombreDocumentoActual('');
                
                toast.success('Documento añadido. Se subirá al crear el empleado.');
              }}
              disabled={loading}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipoDocumentoAdicional">Tipo de Documento</Label>
                <Select
                  value={tipoDocumentoActual}
                  onValueChange={(value) => {
                    setTipoDocumentoActual(value);
                  }}
                >
                  <SelectTrigger id="tipoDocumentoAdicional">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="dni">DNI/NIE</SelectItem>
                    <SelectItem value="nomina">Nómina</SelectItem>
                    <SelectItem value="medico">Certificado Médico</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nombreDocumentoAdicional">Nombre del Documento</Label>
                <Input
                  id="nombreDocumentoAdicional"
                  placeholder="Ej: Contrato laboral"
                  value={nombreDocumentoActual}
                  onChange={(e) => {
                    setNombreDocumentoActual(e.target.value);
                  }}
                />
              </div>
            </div>
            
            {/* Selector de Carpeta */}
            <CarpetaSelector
              empleadoId={empleadoId}
              value={carpetaIdSeleccionada}
              onChange={setCarpetaIdSeleccionada}
              label="Carpeta de destino (opcional)"
              placeholder="Seleccionar carpeta o crear automáticamente"
              onNuevaCarpeta={async (nombre) => {
                try {
                  const response = await fetch('/api/carpetas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      nombre,
                      empleadoId,
                      compartida: false,
                    }),
                  });
                  
                  if (!response.ok) {
                    toast.error('Error al crear carpeta');
                    return null;
                  }
                  
                  const { carpeta } = await response.json();
                  toast.success('Carpeta creada correctamente');
                  return carpeta.id;
                } catch (error) {
                  toast.error('Error al crear carpeta');
                  return null;
                }
              }}
            />
            <DocumentUploader
              label="Subir documento adicional"
              description="PDF, JPG o PNG (máx. 5MB)"
              onUpload={async (file) => {
                const tipoDocumento = tipoDocumentoActual || 'otro';
                const nombreDocumento = nombreDocumentoActual || file.name.split('.')[0];
                await handleDocumentUpload(file, tipoDocumento, nombreDocumento);
                
                // Limpiar campos
                setTipoDocumentoActual('otro');
                setNombreDocumentoActual('');
              }}
              disabled={uploadingDocs || loading}
            />
          </div>
        )}

        {/* Lista de documentos subidos */}
        {documentosSubidos.length > 0 && (
          <div className="mt-4">
            <Label>Documentos a subir ({documentosSubidos.length})</Label>
            <div className="mt-2 space-y-2">
              {documentosSubidos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {doc.tipoDocumento} • {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  {!empleadoId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDocument(doc.id)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info adicional */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> El empleado estará inactivo hasta que complete el proceso de onboarding.
          {documentosSubidos.length > 0 && (
            <span className="block mt-1">
              {documentosSubidos.length} documento(s) se subirán automáticamente después de crear el empleado.
            </span>
          )}
        </p>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading || uploadingDocs}>
          Cancelar
        </Button>
        <LoadingButton type="submit" loading={loading || uploadingDocs}>
          <Mail className="h-4 w-4 mr-2" />
          Crear y Enviar Onboarding
        </LoadingButton>
      </div>
    </form>
  );
}






