'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { UsuarioRol } from '@/lib/constants/enums';

type GeneralFormData = {
  nif: string;
  nss: string;
  fechaNacimiento: string;
  estadoCivil: string;
  numeroHijos: string;
  genero: string;
  email: string;
  telefono: string;
  direccionCalle: string;
  direccionNumero: string;
  direccionPiso: string;
  codigoPostal: string;
  ciudad: string;
  direccionProvincia: string;
  iban: string;
  titularCuenta: string;
};

const FORM_FIELDS: Array<keyof GeneralFormData> = [
  'nif',
  'nss',
  'fechaNacimiento',
  'estadoCivil',
  'numeroHijos',
  'genero',
  'email',
  'telefono',
  'direccionCalle',
  'direccionNumero',
  'direccionPiso',
  'codigoPostal',
  'ciudad',
  'direccionProvincia',
  'iban',
  'titularCuenta',
];

const buildInitialFormData = (empleado: any, usuario: any): GeneralFormData => ({
  nif: empleado.nif ?? '',
  nss: empleado.nss ?? '',
  fechaNacimiento: empleado.fechaNacimiento ? new Date(empleado.fechaNacimiento).toISOString().split('T')[0] : '',
  estadoCivil: empleado.estadoCivil ?? '',
  numeroHijos: typeof empleado.numeroHijos === 'number' ? String(empleado.numeroHijos) : '',
  genero: empleado.genero ?? '',
  email: usuario.email ?? '',
  telefono: empleado.telefono ?? '',
  direccionCalle: empleado.direccionCalle ?? '',
  direccionNumero: empleado.direccionNumero ?? '',
  direccionPiso: empleado.direccionPiso ?? '',
  codigoPostal: empleado.codigoPostal ?? '',
  ciudad: empleado.ciudad ?? '',
  direccionProvincia: empleado.direccionProvincia ?? '',
  iban: empleado.iban ?? '',
  titularCuenta: empleado.titularCuenta ?? '',
});

const normalizeValue = (value: string) => value.trim();

const formsAreEqual = (current: GeneralFormData, initial: GeneralFormData) =>
  FORM_FIELDS.every((field) => normalizeValue(current[field]) === normalizeValue(initial[field]));

const prepareValueForPayload = (field: keyof GeneralFormData, value: string) => {
  const trimmed = value.trim();

  if (trimmed === '') {
    return null;
  }

  if (field === 'numeroHijos') {
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (field === 'iban') {
    return trimmed.replace(/\s+/g, '').toUpperCase();
  }

  if (field === 'fechaNacimiento') {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return trimmed;
};

const diffFormData = (current: GeneralFormData, initial: GeneralFormData) => {
  const diff: Record<string, any> = {};

  FORM_FIELDS.forEach((field) => {
    if (normalizeValue(current[field]) !== normalizeValue(initial[field])) {
      diff[field] = prepareValueForPayload(field, current[field]);
    }
  });

  return diff;
};

interface GeneralTabProps {
  empleado: any;
  usuario: any;
  rol?: 'empleado' | 'hr_admin' | 'manager';
  onFieldUpdate?: (field: string, value: any) => Promise<void>;
  onSaveReady?: (saveFunction: () => Promise<void>, hasChanges: boolean) => void;
}

export function GeneralTab({ empleado, usuario, rol = 'empleado', onFieldUpdate, onSaveReady }: GeneralTabProps) {
  const router = useRouter();
  const isEmpleado = rol === UsuarioRol.empleado;
  const isManager = rol === UsuarioRol.manager;
  const isHrAdmin = rol === UsuarioRol.hr_admin;
  const requiresSolicitud = isEmpleado || isManager; // Empleados y managers crean solicitudes

  // Estados para datos del formulario (solo info personal, contacto, bancaria)
  const [formData, setFormData] = useState<GeneralFormData>(() => buildInitialFormData(empleado, usuario));
  const initialFormDataRef = useRef<GeneralFormData>(formData);

  // Estados de carga
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sincronizar estado inicial cuando cambian los datos externos
  useEffect(() => {
    const nextInitial = buildInitialFormData(empleado, usuario);
    setFormData(nextInitial);
    initialFormDataRef.current = nextInitial;
    if (requiresSolicitud) {
      setHasChanges(false);
    }
  }, [empleado, usuario, requiresSolicitud]);

  // Calcular si hay cambios pendientes (empleados y managers)
  useEffect(() => {
    if (requiresSolicitud) {
      setHasChanges(!formsAreEqual(formData, initialFormDataRef.current));
    }
  }, [formData, requiresSolicitud]);
  
  const setFieldValue = useCallback(
    (field: keyof GeneralFormData, value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );
  
  // Función helper para actualizar campos individualmente (guardado automático para HR)
  const handleFieldUpdate = async (field: string, value: any) => {
    if (!isHrAdmin || !onFieldUpdate) {
      return;
    }
    
    try {
      await onFieldUpdate(field, value);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  }

  const handleSave = useCallback(async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    try {
      if (requiresSolicitud) {
        const cambios = diffFormData(formData, initialFormDataRef.current);

        if (Object.keys(cambios).length === 0) {
          toast.info('No hay cambios pendientes por enviar');
          return;
        }

        // Empleados y managers: crear solicitud de cambio
        const response = await fetch('/api/solicitudes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'cambio_datos',
            camposCambiados: cambios,
            motivo: 'Actualización de datos personales',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || 'Error al enviar solicitud');
          return;
        }

        // Auto-aprobar la solicitud
        try {
          const autoaprobarResponse = await fetch('/api/solicitudes/autoaprobar', {
            method: 'POST',
          });
          
          if (autoaprobarResponse.ok) {
            toast.success('Cambios solicitados y procesados correctamente');
            setTimeout(() => router.refresh(), 1500);
          } else {
            toast.success('Solicitud enviada. Pendiente de revisión por Recursos Humanos');
          }
        } catch (error) {
          console.error('Error al auto-aprobar:', error);
          toast.success('Solicitud enviada. Pendiente de revisión por Recursos Humanos');
        }

        // Revertir formulario a su estado original mientras se procesa la solicitud
        setFormData(initialFormDataRef.current);
        setHasChanges(false);
      } else {
        // HR Admin: guardar directamente
        const response = await fetch(`/api/empleados/${empleado.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || 'Error al guardar cambios');
          return;
        }

        toast.success('Cambios guardados correctamente');
        setTimeout(() => router.refresh(), 1000);
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  }, [saving, requiresSolicitud, formData, empleado.id, router]);

  // Escuchar evento de guardado desde el header
  useEffect(() => {
    const handleSaveEvent = () => {
      if (requiresSolicitud) {
        handleSave();
      }
    };

    window.addEventListener('saveGeneral', handleSaveEvent);
    return () => window.removeEventListener('saveGeneral', handleSaveEvent);
  }, [requiresSolicitud, handleSave]);

  // Notificar al padre sobre la función de guardado
  useEffect(() => {
    if (onSaveReady && requiresSolicitud) {
      onSaveReady(handleSave, hasChanges);
    }
  }, [hasChanges, requiresSolicitud, onSaveReady, handleSave]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información Personal */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nif">DNI/NIE</Label>
              <Input
                id="nif"
                value={formData.nif}
                onChange={(e) => setFieldValue('nif', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.nif || null)) {
                      handleFieldUpdate('nif', newValue);
                    }
                  }
                }}
                placeholder="No especificado"
              />
            </div>
            <div>
              <Label htmlFor="nss">Número de Seguridad Social</Label>
              <Input
                id="nss"
                value={formData.nss}
                onChange={(e) => setFieldValue('nss', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.nss || null)) {
                      handleFieldUpdate('nss', newValue);
                    }
                  }
                }}
                placeholder="No especificado"
              />
            </div>
            <div>
              <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
              <Input
                id="fechaNacimiento"
                type="date"
                value={formData.fechaNacimiento}
                onChange={(e) => setFieldValue('fechaNacimiento', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    const currentValue = empleado.fechaNacimiento 
                      ? new Date(empleado.fechaNacimiento).toISOString().split('T')[0] 
                      : null;
                    if (newValue !== currentValue) {
                      handleFieldUpdate('fechaNacimiento', newValue);
                    }
                  }
                }}
              />
            </div>
            <div>
              <Label htmlFor="estadoCivil">Estado Civil</Label>
              <Select
                value={formData.estadoCivil}
                onValueChange={(value) => {
                  setFieldValue('estadoCivil', value);
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = value || null;
                    if (newValue !== (empleado.estadoCivil || null)) {
                      handleFieldUpdate('estadoCivil', newValue);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soltero">Soltero/a</SelectItem>
                  <SelectItem value="casado">Casado/a</SelectItem>
                  <SelectItem value="divorciado">Divorciado/a</SelectItem>
                  <SelectItem value="viudo">Viudo/a</SelectItem>
                  <SelectItem value="pareja_hecho">Pareja de hecho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="numeroHijos">Número de Hijos</Label>
              <Input
                id="numeroHijos"
                type="number"
                value={formData.numeroHijos}
                onChange={(e) => setFieldValue('numeroHijos', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const parsed = parseInt(e.target.value, 10);
                    const newValue = Number.isNaN(parsed) ? 0 : parsed;
                    if (newValue !== (empleado.numeroHijos || 0)) {
                      handleFieldUpdate('numeroHijos', newValue);
                    }
                  }
                }}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="genero">Género</Label>
              <Select
                value={formData.genero}
                onValueChange={(value) => {
                  setFieldValue('genero', value);
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = value || null;
                    if (newValue !== (empleado.genero || null)) {
                      handleFieldUpdate('genero', newValue);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hombre">Hombre</SelectItem>
                  <SelectItem value="mujer">Mujer</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                  <SelectItem value="no_especificado">Prefiero no especificar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFieldValue('email', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFieldValue('telefono', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.telefono || null)) {
                      handleFieldUpdate('telefono', newValue);
                    }
                  }
                }}
                placeholder="No especificado"
              />
            </div>
            <div>
              <Label htmlFor="direccionCalle">Calle</Label>
              <Input
                id="direccionCalle"
                value={formData.direccionCalle}
                onChange={(e) => setFieldValue('direccionCalle', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.direccionCalle || null)) {
                      handleFieldUpdate('direccionCalle', newValue);
                    }
                  }
                }}
                placeholder="No especificada"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="direccionNumero">Número</Label>
                <Input
                  id="direccionNumero"
                  value={formData.direccionNumero}
                  onChange={(e) => setFieldValue('direccionNumero', e.target.value)}
                  onBlur={(e) => {
                    if (isHrAdmin && onFieldUpdate) {
                      const newValue = e.target.value || null;
                      if (newValue !== (empleado.direccionNumero || null)) {
                        handleFieldUpdate('direccionNumero', newValue);
                      }
                    }
                  }}
                  placeholder="No especificado"
                />
              </div>
              <div>
                <Label htmlFor="direccionPiso">Piso/Puerta</Label>
                <Input
                  id="direccionPiso"
                  value={formData.direccionPiso}
                  onChange={(e) => setFieldValue('direccionPiso', e.target.value)}
                  onBlur={(e) => {
                    if (isHrAdmin && onFieldUpdate) {
                      const newValue = e.target.value || null;
                      if (newValue !== (empleado.direccionPiso || null)) {
                        handleFieldUpdate('direccionPiso', newValue);
                      }
                    }
                  }}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigoPostal">Código Postal</Label>
                <Input
                  id="codigoPostal"
                  value={formData.codigoPostal}
                  onChange={(e) => setFieldValue('codigoPostal', e.target.value)}
                  onBlur={(e) => {
                    if (isHrAdmin && onFieldUpdate) {
                      const newValue = e.target.value || null;
                      if (newValue !== (empleado.codigoPostal || null)) {
                        handleFieldUpdate('codigoPostal', newValue);
                      }
                    }
                  }}
                  placeholder="No especificado"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  value={formData.ciudad}
                  onChange={(e) => setFieldValue('ciudad', e.target.value)}
                  onBlur={(e) => {
                    if (isHrAdmin && onFieldUpdate) {
                      const newValue = e.target.value || null;
                      if (newValue !== (empleado.ciudad || null)) {
                        handleFieldUpdate('ciudad', newValue);
                      }
                    }
                  }}
                  placeholder="No especificada"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="direccionProvincia">Provincia</Label>
              <Input
                id="direccionProvincia"
                value={formData.direccionProvincia}
                onChange={(e) => setFieldValue('direccionProvincia', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.direccionProvincia || null)) {
                      handleFieldUpdate('direccionProvincia', newValue);
                    }
                  }
                }}
                placeholder="No especificada"
              />
            </div>
          </div>
        </div>

        {/* Información Bancaria */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Bancaria</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="iban">IBAN</Label>
              <Input
                id="iban"
                value={formData.iban}
                onChange={(e) => setFieldValue('iban', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.iban || null)) {
                      handleFieldUpdate('iban', newValue);
                    }
                  }
                }}
                placeholder="ES00 0000 0000 0000 0000 0000"
              />
            </div>
            <div>
              <Label htmlFor="titularCuenta">Titular de la Cuenta</Label>
              <Input
                id="titularCuenta"
                value={formData.titularCuenta}
                onChange={(e) => setFieldValue('titularCuenta', e.target.value)}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.titularCuenta || null)) {
                      handleFieldUpdate('titularCuenta', newValue);
                    }
                  }
                }}
                placeholder="Nombre del titular"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

