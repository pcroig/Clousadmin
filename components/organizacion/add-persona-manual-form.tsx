// ========================================
// Add Persona Manual Form
// ========================================
// Formulario manual para añadir persona con todos los campos
// Incluye opción de importar empleados al inicio

'use client';

import { ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Combobox, type ComboboxOption } from '@/components/shared/combobox';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { AddPersonaDocumentForm } from './add-persona-document-form';

interface AddPersonaManualFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddPersonaManualForm({ onSuccess, onCancel }: AddPersonaManualFormProps) {
  const [loading, setLoading] = useState(false);
  const [equipos, setEquipos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [puestos, setPuestos] = useState<Array<{ id: string; nombre: string }>>([]);
  const [showImportSection, setShowImportSection] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [equiposRes, puestosRes] = await Promise.all([
          fetch('/api/organizacion/equipos'),
          fetch('/api/organizacion/puestos'),
        ]);
        
        if (equiposRes.ok) {
          const equiposData = await equiposRes.json();
          setEquipos(equiposData);
        }
        
        if (puestosRes.ok) {
          const puestosData = await puestosRes.json();
          setPuestos(puestosData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    fetchData();
  }, []);

  // Convertir equipos y puestos a formato ComboboxOption
  const equiposOptions: ComboboxOption[] = equipos.map((equipo) => ({
    value: equipo.id,
    label: equipo.nombre,
  }));

  const puestosOptions: ComboboxOption[] = puestos.map((puesto) => ({
    value: puesto.id,
    label: puesto.nombre,
  }));

  // Función para crear un nuevo equipo
  const handleCreateEquipo = async (nombre: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/organizacion/equipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Error al crear equipo');
        return null;
      }

      const nuevoEquipo = await response.json();
      setEquipos([...equipos, nuevoEquipo]);
      toast.success('Equipo creado correctamente');
      return nuevoEquipo.id;
    } catch (error) {
      console.error('[AddPersonaManualForm] Error creating equipo:', error);
      toast.error('Error al crear equipo');
      return null;
    }
  };

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
      console.error('[AddPersonaManualForm] Error creating puesto:', error);
      toast.error('Error al crear puesto');
      return null;
    }
  };

  const [formData, setFormData] = useState({
    // Datos básicos (requeridos)
    nombre: '',
    apellidos: '',
    email: '',
    fechaAlta: new Date().toISOString().split('T')[0],
    
    // Datos personales
    nif: '',
    nss: '',
    fechaNacimiento: '',
    telefono: '',
    estadoCivil: '',
    numeroHijos: 0,
    genero: '',

    // Dirección
    direccionCalle: '',
    direccionNumero: '',
    direccionPiso: '',
    codigoPostal: '',
    ciudad: '',
    direccionProvincia: '',

    // Datos bancarios
    iban: '',
    titularCuenta: '',

    // Datos laborales
    puestoId: '',
    equipoIds: [] as string[],
    tipoContrato: 'indefinido',
    salarioBrutoAnual: '',
    salarioBrutoMensual: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.nombre || !formData.apellidos || !formData.email) {
      toast.error('Nombre, apellidos y email son requeridos');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Empleado creado correctamente');
        onSuccess();
      } else {
        // Manejo específico para email duplicado
        if (data.code === 'EMAIL_DUPLICADO' && data.empleadoExistente) {
          const empleado = data.empleadoExistente;
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
          toast.error(data.error || 'Error al crear empleado');
        }
      }
    } catch (error) {
      console.error('[AddPersonaManualForm] Error:', error);
      toast.error('Error al crear empleado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sección de Importar */}
      <div className="border border-gray-200 rounded-lg bg-gray-50">
        <button
          type="button"
          onClick={() => setShowImportSection(!showImportSection)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">¿Prefieres importar empleado(s)?</span>
          </div>
          {showImportSection ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </button>
        
        {showImportSection && (
          <div className="px-4 pb-4">
            <AddPersonaDocumentForm onSuccess={onSuccess} onCancel={onCancel} />
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="text-sm text-gray-500 font-medium">O introduce los datos manualmente</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>

      {/* Datos Básicos */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Datos Básicos</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="apellidos">Apellidos *</Label>
            <Input
              id="apellidos"
              value={formData.apellidos}
              onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
              required
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
            />
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
        </div>
      </div>

      {/* Datos Personales */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Datos Personales</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nif">DNI/NIE</Label>
            <Input
              id="nif"
              value={formData.nif}
              onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="nss">Número de Seguridad Social</Label>
            <Input
              id="nss"
              value={formData.nss}
              onChange={(e) => setFormData({ ...formData, nss: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
            <Input
              id="fechaNacimiento"
              type="date"
              value={formData.fechaNacimiento}
              onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="estadoCivil">Estado Civil</Label>
            <Select value={formData.estadoCivil} onValueChange={(value) => setFormData({ ...formData, estadoCivil: value })}>
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
              min="0"
              value={formData.numeroHijos}
              onChange={(e) => setFormData({ ...formData, numeroHijos: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="genero">Género</Label>
            <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
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

      {/* Dirección */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Dirección</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="direccionCalle">Calle</Label>
            <Input
              id="direccionCalle"
              value={formData.direccionCalle}
              onChange={(e) => setFormData({ ...formData, direccionCalle: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="direccionNumero">Número</Label>
              <Input
                id="direccionNumero"
                value={formData.direccionNumero}
                onChange={(e) => setFormData({ ...formData, direccionNumero: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="direccionPiso">Piso/Puerta</Label>
              <Input
                id="direccionPiso"
                value={formData.direccionPiso}
                onChange={(e) => setFormData({ ...formData, direccionPiso: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="codigoPostal">Código Postal</Label>
              <Input
                id="codigoPostal"
                value={formData.codigoPostal}
                onChange={(e) => setFormData({ ...formData, codigoPostal: e.target.value })}
                maxLength={5}
              />
            </div>
            <div>
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="direccionProvincia">Provincia</Label>
              <Input
                id="direccionProvincia"
                value={formData.direccionProvincia}
                onChange={(e) => setFormData({ ...formData, direccionProvincia: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Datos Bancarios */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Datos Bancarios</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={formData.iban}
              onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              placeholder="ES00 0000 0000 0000 0000 0000"
            />
          </div>
          <div>
            <Label htmlFor="titularCuenta">Titular de la Cuenta</Label>
            <Input
              id="titularCuenta"
              value={formData.titularCuenta}
              onChange={(e) => setFormData({ ...formData, titularCuenta: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Datos Laborales */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Datos Laborales</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="puestoId">Puesto</Label>
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
          <div>
            <Label htmlFor="equipoIds">Equipo</Label>
            <Combobox
              options={equiposOptions}
              value={formData.equipoIds[0] || undefined}
              onValueChange={(value) => setFormData({ ...formData, equipoIds: value ? [value] : [] })}
              placeholder="Seleccionar o crear equipo"
              emptyText="No se encontraron equipos."
              createText="Crear nuevo equipo"
              onCreateNew={handleCreateEquipo}
            />
          </div>
          <div>
            <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
            <Select value={formData.tipoContrato} onValueChange={(value) => setFormData({ ...formData, tipoContrato: value })}>
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
          <div>
            <Label htmlFor="salarioBrutoAnual">Salario Bruto Anual (€)</Label>
            <Input
              id="salarioBrutoAnual"
              type="number"
              value={formData.salarioBrutoAnual}
              onChange={(e) => setFormData({ ...formData, salarioBrutoAnual: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <LoadingButton type="submit" loading={loading}>
          Crear Empleado
        </LoadingButton>
      </div>
    </form>
  );
}


