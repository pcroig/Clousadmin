'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Loader2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/shared/loading-button';
import { Combobox, type ComboboxOption } from '@/components/shared/combobox';

interface GeneralTabProps {
  empleado: any;
  usuario: any;
  rol?: 'empleado' | 'hr_admin' | 'manager';
  onFieldUpdate?: (field: string, value: any) => Promise<void>;
}

export function GeneralTab({ empleado, usuario, rol = 'empleado', onFieldUpdate }: GeneralTabProps) {
  const isEmpleado = rol === 'empleado';
  const isHrAdmin = rol === 'hr_admin';

  // Estados para datos del formulario
  const [formData, setFormData] = useState({
    // Información Personal
    nif: empleado.nif || '',
    nss: empleado.nss || '',
    fechaNacimiento: empleado.fechaNacimiento ? new Date(empleado.fechaNacimiento).toISOString().split('T')[0] : '',
    estadoCivil: empleado.estadoCivil || '',
    numeroHijos: empleado.numeroHijos || 0,
    genero: empleado.genero || '',

    // Información de Contacto
    email: usuario.email || '',
    telefono: empleado.telefono || '',
    direccionCalle: empleado.direccionCalle || '',
    direccionNumero: empleado.direccionNumero || '',
    direccionPiso: empleado.direccionPiso || '',
    codigoPostal: empleado.codigoPostal || '',
    ciudad: empleado.ciudad || '',
    direccionProvincia: empleado.direccionProvincia || '',

    // Información Laboral
    puestoId: empleado.puestoId || '',
    equipoIds: empleado.equipos?.map((eq: any) => eq.equipoId || eq.equipo?.id || eq.id) || [],
    managerId: empleado.managerId || '',
    fechaAlta: empleado.fechaAlta ? new Date(empleado.fechaAlta).toISOString().split('T')[0] : '',
    tipoContrato: empleado.tipoContrato || 'indefinido',

    // Información Bancaria
    iban: empleado.iban || '',
    titularCuenta: empleado.titularCuenta || '',
    salarioBrutoAnual: empleado.salarioBrutoAnual || '',
    salarioBrutoMensual: empleado.salarioBrutoMensual || '',
  });

  // Estados para listas de opciones
  const [puestos, setPuestos] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  // Estados para modales de crear nuevo
  const [showNuevoEquipoModal, setShowNuevoEquipoModal] = useState(false);
  const [nuevoEquipo, setNuevoEquipo] = useState({ nombre: '', descripcion: '', tipo: 'proyecto' });

  // Estados de carga
  const [saving, setSaving] = useState(false);
  const [creatingEquipo, setCreatingEquipo] = useState(false);
  
  // Función helper para actualizar campos individualmente (guardado automático)
  const handleFieldUpdate = async (field: string, value: any) => {
    if (isEmpleado || !onFieldUpdate) {
      // Si es empleado o no hay onFieldUpdate, usar el método anterior
      return;
    }
    
    try {
      await onFieldUpdate(field, value);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      // El error ya se maneja en onFieldUpdate
    }
  };

  // Cargar datos de opciones
  useEffect(() => {
    if (!isEmpleado) {
      fetchPuestos();
      fetchEquipos();
      fetchManagers();
    }
  }, [isEmpleado]);

  async function fetchPuestos() {
    try {
      const response = await fetch('/api/organizacion/puestos');
      if (response.ok) {
        const data = await response.json();
        console.log('[GeneralTab] Puestos recibidos:', data);
        // Asegurar que data es un array de puestos
        if (Array.isArray(data)) {
          setPuestos(data);
          console.log('[GeneralTab] Puestos establecidos:', data.length, 'puestos');
        } else {
          console.error('Error: respuesta de puestos no es un array', data);
          setPuestos([]);
        }
      } else {
        console.error('[GeneralTab] Error en respuesta de puestos:', response.status);
      }
    } catch (error) {
      console.error('[GeneralTab] Error fetching puestos:', error);
      setPuestos([]);
    }
  }

  async function fetchEquipos() {
    try {
      const response = await fetch('/api/organizacion/equipos');
      if (response.ok) {
        const data = await response.json();
        setEquipos(data);
      }
    } catch (error) {
      console.error('Error fetching equipos:', error);
    }
  }

  async function fetchManagers() {
    try {
      const response = await fetch('/api/empleados');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo HR Admin y Managers
        const managersData = data.filter((emp: any) => 
          emp.usuario?.rol === 'hr_admin' || emp.usuario?.rol === 'manager'
        );
        setManagers(managersData);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  }

  // Función para crear un nuevo puesto (usado por Combobox)
  async function handleCreatePuesto(nombre: string): Promise<string | null> {
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
      console.error('[GeneralTab] Error creating puesto:', error);
      toast.error('Error al crear puesto');
      return null;
    }
  }

  async function handleCrearEquipo() {
    if (!nuevoEquipo.nombre.trim()) {
      toast.error('El nombre del equipo es requerido');
      return;
    }

    setCreatingEquipo(true);
    try {
      const response = await fetch('/api/organizacion/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEquipo),
      });

      if (response.ok) {
        const equipo = await response.json();
        setEquipos([...equipos, equipo]);
        setFormData({ ...formData, equipoIds: [...formData.equipoIds, equipo.id] });
        setShowNuevoEquipoModal(false);
        setNuevoEquipo({ nombre: '', descripcion: '', tipo: 'proyecto' });
        toast.success('Equipo creado correctamente');
      } else {
        toast.error('Error al crear equipo');
      }
    } catch (error) {
      console.error('Error creating equipo:', error);
      toast.error('Error al crear equipo');
    } finally {
      setCreatingEquipo(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isEmpleado) {
        // Crear solicitud de cambio
        const response = await fetch('/api/solicitudes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo: 'cambio_datos',
            camposCambiados: formData,
            motivo: 'Actualización de datos personales solicitada por el empleado',
          }),
        });

        if (response.ok) {
          toast.success('Solicitud enviada correctamente. Pendiente de aprobación por Recursos Humanos.');
        } else {
          toast.error('Error al enviar solicitud');
        }
      } else {
        // Guardar directamente
        const response = await fetch(`/api/empleados/${empleado.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          toast.success('Cambios guardados correctamente');
          window.location.reload();
        } else {
          toast.error('Error al guardar cambios');
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const toggleEquipo = (equipoId: string) => {
    let newEquipoIds: string[];
    if (formData.equipoIds.includes(equipoId)) {
      newEquipoIds = formData.equipoIds.filter((id: string) => id !== equipoId);
    } else {
      newEquipoIds = [...formData.equipoIds, equipoId];
    }
    
    setFormData({
      ...formData,
      equipoIds: newEquipoIds,
    });
    
    // Guardar automáticamente si es HR Admin
    if (isHrAdmin && onFieldUpdate) {
      handleFieldUpdate('equipoIds', newEquipoIds);
    }
  };

  return (
    <div className="space-y-6">
      {/* Botón Guardar Cambios - Solo para empleados */}
      {isEmpleado && (
        <div className="flex justify-end">
          <LoadingButton
            onClick={handleSave}
            loading={saving}
          >
            Solicitar cambios
          </LoadingButton>
        </div>
      )}

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
                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.nif || null)) {
                      handleFieldUpdate('nif', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
                placeholder="No especificado"
              />
            </div>
            <div>
              <Label htmlFor="nss">Número de Seguridad Social</Label>
              <Input
                id="nss"
                value={formData.nss}
                onChange={(e) => setFormData({ ...formData, nss: e.target.value })}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.nss || null)) {
                      handleFieldUpdate('nss', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
                placeholder="No especificado"
              />
            </div>
            <div>
              <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
              <Input
                id="fechaNacimiento"
                type="date"
                value={formData.fechaNacimiento}
                onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
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
                disabled={isEmpleado}
              />
            </div>
            <div>
              <Label htmlFor="estadoCivil">Estado Civil</Label>
              <Select
                value={formData.estadoCivil}
                onValueChange={(value) => {
                  setFormData({ ...formData, estadoCivil: value });
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = value || null;
                    if (newValue !== (empleado.estadoCivil || null)) {
                      handleFieldUpdate('estadoCivil', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
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
                onChange={(e) => setFormData({ ...formData, numeroHijos: parseInt(e.target.value) || 0 })}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = parseInt(e.target.value) || 0;
                    if (newValue !== (empleado.numeroHijos || 0)) {
                      handleFieldUpdate('numeroHijos', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor="genero">Género</Label>
              <Select
                value={formData.genero}
                onValueChange={(value) => {
                  setFormData({ ...formData, genero: value });
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = value || null;
                    if (newValue !== (empleado.genero || null)) {
                      handleFieldUpdate('genero', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
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
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, direccionCalle: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, direccionNumero: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, direccionPiso: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, direccionProvincia: e.target.value })}
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

        {/* Información Laboral */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Laboral</h3>
          <div className="space-y-4">
            {/* Puesto con Combobox sincronizado */}
            <div>
              <Label htmlFor="puesto">Puesto</Label>
              {isEmpleado ? (
                <Input
                  value={empleado.puestoRelacion?.nombre || empleado.puesto || 'No especificado'}
                  disabled
                />
              ) : (
                <Combobox
                  options={puestos.map((p: any) => ({ value: p.id, label: p.nombre }))}
                  value={formData.puestoId || undefined}
                  onValueChange={(value) => {
                    setFormData({ ...formData, puestoId: value || '' });
                    if (isHrAdmin && onFieldUpdate) {
                      const newValue = value || null;
                      if (newValue !== (empleado.puestoId || null)) {
                        handleFieldUpdate('puestoId', newValue);
                      }
                    }
                  }}
                  placeholder="Seleccionar o crear puesto"
                  emptyText="No se encontraron puestos."
                  createText="Crear nuevo puesto"
                  onCreateNew={handleCreatePuesto}
                />
              )}
            </div>

            {/* Equipos con multi-selección - Popover */}
            <div>
              <Label>Equipos</Label>
              {isEmpleado ? (
                <Input
                  value={empleado.equipos?.map((eq: any) => eq.equipo?.nombre || eq.nombre).join(', ') || 'Sin equipo asignado'}
                  disabled
                />
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      role="combobox"
                    >
                      <span className="truncate">
                        {formData.equipoIds.length === 0
                          ? 'Seleccionar equipos'
                          : formData.equipoIds.length === 1
                          ? equipos.find((e) => e.id === formData.equipoIds[0])?.nombre || '1 equipo seleccionado'
                          : `${formData.equipoIds.length} equipos seleccionados`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                      {equipos.length === 0 ? (
                        <p className="text-sm text-gray-500 p-2">No hay equipos disponibles</p>
                      ) : (
                        <>
                          {equipos.map((equipo) => (
                            <label
                              key={equipo.id}
                              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={formData.equipoIds.includes(equipo.id)}
                                onChange={() => toggleEquipo(equipo.id)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm flex-1">{equipo.nombre}</span>
                            </label>
                          ))}
                          <div className="border-t border-gray-200 my-1"></div>
                          <button
                            type="button"
                            onClick={() => setShowNuevoEquipoModal(true)}
                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded w-full text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Añadir nuevo equipo</span>
                          </button>
                        </>
                      )}
                      {equipos.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowNuevoEquipoModal(true)}
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-2 rounded w-full text-sm mt-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Añadir nuevo equipo</span>
                        </button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Manager */}
            <div>
              <Label htmlFor="manager">Manager</Label>
              {isEmpleado ? (
                <Input
                  value={empleado.manager ? `${empleado.manager.nombre} ${empleado.manager.apellidos}` : 'Sin manager asignado'}
                  disabled
                />
              ) : (
                <Select
                  value={formData.managerId || 'sin-manager'}
                  onValueChange={(value) => {
                    const newValue = value === 'sin-manager' ? '' : value;
                    setFormData({ ...formData, managerId: newValue });
                    if (isHrAdmin && onFieldUpdate) {
                      const finalValue = newValue || null;
                      if (finalValue !== (empleado.managerId || null)) {
                        handleFieldUpdate('managerId', finalValue);
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin-manager">Sin manager</SelectItem>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.nombre} {manager.apellidos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <Label htmlFor="fechaAlta">Fecha de Alta</Label>
              <Input
                id="fechaAlta"
                type="date"
                value={formData.fechaAlta}
                onChange={(e) => setFormData({ ...formData, fechaAlta: e.target.value })}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    const currentValue = empleado.fechaAlta 
                      ? new Date(empleado.fechaAlta).toISOString().split('T')[0] 
                      : null;
                    if (newValue !== currentValue) {
                      handleFieldUpdate('fechaAlta', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
              />
            </div>

            <div>
              <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
              <Select
                value={formData.tipoContrato}
                onValueChange={(value) => {
                  setFormData({ ...formData, tipoContrato: value });
                  if (isHrAdmin && onFieldUpdate) {
                    if (value !== (empleado.tipoContrato || 'indefinido')) {
                      handleFieldUpdate('tipoContrato', value);
                    }
                  }
                }}
                disabled={isEmpleado}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="fijo_discontinuo">Fijo discontinuo</SelectItem>
                  <SelectItem value="indefinido">Indefinido</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                  <SelectItem value="becario">Becario</SelectItem>
                  <SelectItem value="practicas">Prácticas</SelectItem>
                  <SelectItem value="obra_y_servicio">Obra y servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.tipoContrato === 'temporal' && (
              <div>
                <Label htmlFor="fechaFinContrato">Fecha de Fin</Label>
                <Input
                  id="fechaFinContrato"
                  type="date"
                  value={empleado.contratos?.[0]?.fechaFin ? new Date(empleado.contratos[0].fechaFin).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    // Esto se manejará cuando se implemente la actualización de contratos
                    // Por ahora solo muestra el valor existente
                  }}
                  disabled={isEmpleado}
                />
              </div>
            )}
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
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.iban || null)) {
                      handleFieldUpdate('iban', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
                placeholder="ES00 0000 0000 0000 0000 0000"
              />
            </div>
            <div>
              <Label htmlFor="titularCuenta">Titular de la Cuenta</Label>
              <Input
                id="titularCuenta"
                value={formData.titularCuenta}
                onChange={(e) => setFormData({ ...formData, titularCuenta: e.target.value })}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = e.target.value || null;
                    if (newValue !== (empleado.titularCuenta || null)) {
                      handleFieldUpdate('titularCuenta', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
                placeholder="Nombre del titular"
              />
            </div>
            <div>
              <Label htmlFor="salarioBrutoAnual">Salario Bruto Anual (€)</Label>
              <Input
                id="salarioBrutoAnual"
                type="number"
                value={formData.salarioBrutoAnual}
                onChange={(e) => setFormData({ ...formData, salarioBrutoAnual: parseFloat(e.target.value) || 0 })}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = parseFloat(e.target.value);
                    const currentValue = empleado.salarioBrutoAnual || 0;
                    if (!isNaN(newValue) && newValue !== currentValue) {
                      handleFieldUpdate('salarioBrutoAnual', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="salarioBrutoMensual">Salario Bruto Mensual (€)</Label>
              <Input
                id="salarioBrutoMensual"
                type="number"
                value={formData.salarioBrutoMensual}
                onChange={(e) => setFormData({ ...formData, salarioBrutoMensual: parseFloat(e.target.value) || 0 })}
                onBlur={(e) => {
                  if (isHrAdmin && onFieldUpdate) {
                    const newValue = parseFloat(e.target.value);
                    const currentValue = empleado.salarioBrutoMensual || 0;
                    if (!isNaN(newValue) && newValue !== currentValue) {
                      handleFieldUpdate('salarioBrutoMensual', newValue);
                    }
                  }
                }}
                disabled={isEmpleado}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal Crear Nuevo Equipo */}
      <Dialog open={showNuevoEquipoModal} onOpenChange={setShowNuevoEquipoModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Equipo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nuevoEquipoNombre">Nombre del Equipo *</Label>
              <Input
                id="nuevoEquipoNombre"
                value={nuevoEquipo.nombre}
                onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, nombre: e.target.value })}
                placeholder="ej. Equipo de Desarrollo"
              />
            </div>
            <div>
              <Label htmlFor="nuevoEquipoDescripcion">Descripción</Label>
              <Input
                id="nuevoEquipoDescripcion"
                value={nuevoEquipo.descripcion}
                onChange={(e) => setNuevoEquipo({ ...nuevoEquipo, descripcion: e.target.value })}
                placeholder="Descripción del equipo (opcional)"
              />
            </div>
            <div>
              <Label htmlFor="nuevoEquipoTipo">Tipo</Label>
              <Select
                value={nuevoEquipo.tipo}
                onValueChange={(value) => setNuevoEquipo({ ...nuevoEquipo, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proyecto">Proyecto</SelectItem>
                  <SelectItem value="squad">Squad</SelectItem>
                  <SelectItem value="temporal">Temporal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevoEquipoModal(false)} disabled={creatingEquipo}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleCrearEquipo} loading={creatingEquipo}>
              Crear Equipo
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

