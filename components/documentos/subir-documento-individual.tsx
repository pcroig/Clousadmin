'use client';

// ========================================
// Subir Documento Individual - Con Extracción IA
// ========================================

import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Combobox, type ComboboxOption } from '@/components/shared/combobox';
import { LoadingButton } from '@/components/shared/loading-button';
import { ResponsiveDatePicker } from '@/components/shared/responsive-date-picker';
import { SearchableSelect } from '@/components/shared/searchable-select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

interface DatosExtraidos {
  nombre?: string;
  apellidos?: string;
  email?: string;
  nif?: string;
  telefono?: string;
  fechaNacimiento?: string;
  puesto?: string;
  fechaAlta?: string;
  salarioBaseAnual?: string;
  tipoContrato?: string;
  direccionCalle?: string;
  direccionNumero?: string;
  direccionPiso?: string;
  codigoPostal?: string;
  ciudad?: string;
  direccionProvincia?: string;
  nss?: string;
  iban?: string;
  bic?: string;
  // Campos adicionales para formulario
  puestoId?: string;
  equipoId?: string;
  sedeId?: string;
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
  direccion?: string;
}

interface SubirDocumentoIndividualProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface ExtraerDocumentoResponse {
  success: boolean;
  datosExtraidos?: DatosExtraidos;
  error?: string;
}

interface CrearEmpleadoResponse {
  success?: boolean;
  error?: string;
  code?: string;
  empleadoExistente?: {
    id: string;
    nombre: string;
    apellidos: string;
  };
}

export function SubirDocumentoIndividual({ onSuccess, onCancel }: SubirDocumentoIndividualProps = {}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [datosExtraidos, setDatosExtraidos] = useState<DatosExtraidos | null>(null);
  const [error, setError] = useState('');

  // Estados para catálogos
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);

  const parseDateValue = (value?: string) => (value ? new Date(`${value}T00:00:00`) : undefined);
  const updateDatosExtraidosDate = (field: 'fechaAlta' | 'fechaNacimiento', date: Date | undefined) =>
    setDatosExtraidos((prev) => (prev ? { ...prev, [field]: date ? format(date, 'yyyy-MM-dd') : '' } : prev));

  // Cargar puestos, equipos y sedes al montar
  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const [puestosRes, equiposRes, sedesRes] = await Promise.all([
          fetch('/api/organizacion/puestos'),
          fetch('/api/equipos'),
          fetch('/api/sedes'),
        ]);

        const puestosData = (await puestosRes.json()) as { data?: unknown[] };
        const equiposData = (await equiposRes.json()) as { data?: unknown[] };
        const sedesData = (await sedesRes.json()) as { data?: unknown[] };

        setPuestos((puestosData.data || []) as Puesto[]);
        setEquipos((equiposData.data || []) as Equipo[]);
        setSedes((sedesData.data || []) as Sede[]);
      } catch (err) {
        console.error('[SubirDocumentoIndividual] Error cargando catálogos:', err);
      }
    };

    cargarCatalogos();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
      setDatosExtraidos(null);
      setError('');
    }
  };

  // Preparar options para Combobox de puestos
  const puestosOptions: ComboboxOption[] = puestos.map((p) => ({
    value: p.id,
    label: p.nombre,
  }));

  // Preparar items para SearchableSelect
  const equiposItems = equipos.map((e) => ({ value: e.id, label: e.nombre }));
  const sedesItems = sedes.map((s) => ({ value: s.id, label: s.nombre }));

  // Función para crear puesto nuevo
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

  const handleAnalizarArchivo = async () => {
    if (!archivo) return;

    setError('');
    setProcesando(true);

    try {
      const formData = new FormData();
      formData.append('file', archivo);

      const response = await fetch('/api/documentos/extraer', {
        method: 'POST',
        body: formData,
      });

      const result = await parseJson<ExtraerDocumentoResponse>(response);

      if (result.success) {
        setDatosExtraidos(result.datosExtraidos ?? null);
        toast.success('Datos extraídos correctamente');
      } else {
        const errorMessage = result.error || 'Error al extraer datos del documento';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      setError('Error al procesar el documento');
      toast.error('Error al procesar el documento');
      console.error('Error:', err);
    } finally {
      setProcesando(false);
    }
  };

  const handleGuardarEmpleado = async () => {
    if (!datosExtraidos) return;

    // Validaciones obligatorias
    if (!datosExtraidos.nombre || !datosExtraidos.apellidos || !datosExtraidos.email) {
      toast.error('Nombre, apellidos y email son obligatorios');
      return;
    }

    if (!datosExtraidos.puestoId || !datosExtraidos.equipoId) {
      toast.error('Puesto y equipo son obligatorios');
      return;
    }

    setError('');
    setGuardando(true);

    try {
      // Preparar datos del empleado con todos los campos opcionales
      const empleadoData: Record<string, unknown> = {
        nombre: datosExtraidos.nombre,
        apellidos: datosExtraidos.apellidos,
        email: datosExtraidos.email,
        fechaAlta: datosExtraidos.fechaAlta || new Date().toISOString().split('T')[0],
        puestoId: datosExtraidos.puestoId,
        sedeId: datosExtraidos.sedeId || undefined,
        activo: true, // Empleado existente ya está activo
      };

      // Añadir campos opcionales si están presentes
      if (datosExtraidos.nif) empleadoData.nif = datosExtraidos.nif;
      if (datosExtraidos.nss) empleadoData.nss = datosExtraidos.nss;
      if (datosExtraidos.fechaNacimiento) empleadoData.fechaNacimiento = datosExtraidos.fechaNacimiento;
      if (datosExtraidos.telefono) empleadoData.telefono = datosExtraidos.telefono;
      if (datosExtraidos.direccionCalle) empleadoData.direccionCalle = datosExtraidos.direccionCalle;
      if (datosExtraidos.direccionNumero) empleadoData.direccionNumero = datosExtraidos.direccionNumero;
      if (datosExtraidos.direccionPiso) empleadoData.direccionPiso = datosExtraidos.direccionPiso;
      if (datosExtraidos.codigoPostal) empleadoData.codigoPostal = datosExtraidos.codigoPostal;
      if (datosExtraidos.ciudad) empleadoData.ciudad = datosExtraidos.ciudad;
      if (datosExtraidos.direccionProvincia) empleadoData.direccionProvincia = datosExtraidos.direccionProvincia;
      if (datosExtraidos.salarioBaseAnual) empleadoData.salarioBaseAnual = datosExtraidos.salarioBaseAnual;
      if (datosExtraidos.tipoContrato) empleadoData.tipoContrato = datosExtraidos.tipoContrato;
      if (datosExtraidos.iban) empleadoData.iban = datosExtraidos.iban;
      if (datosExtraidos.bic) empleadoData.bic = datosExtraidos.bic;

      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empleadoData),
      });

      const data = await parseJson<CrearEmpleadoResponse & {id?: string}>(response);

      if (response.ok && data.id) {
        // Asignar a equipo si fue seleccionado
        if (datosExtraidos.equipoId) {
          await fetch(`/api/equipos/${datosExtraidos.equipoId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empleadoId: data.id }),
          });
        }

        toast.success('Empleado creado correctamente');

        // Resetear formulario
        setArchivo(null);
        setDatosExtraidos(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Llamar onSuccess si existe
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/hr/organizacion/personas');
          router.refresh();
        }
      } else {
        // Manejo específico para email duplicado
        if (data.code === 'EMAIL_DUPLICADO' && data.empleadoExistente) {
          const empleado = data.empleadoExistente;
          toast.error(
            `El email ${datosExtraidos.email} ya está registrado para ${empleado.nombre} ${empleado.apellidos}`,
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
    } catch (err) {
      setError('Error al guardar empleado');
      toast.error('Error al guardar empleado');
      console.error('Error:', err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h3 className="text-lg font-medium">Subir documento individual</h3>
        <p className="text-sm text-gray-500">
          Sube un contrato, DNI u otro documento y la IA extraerá automáticamente los datos del empleado
        </p>
      </div>

      {/* Selección de archivo */}
      {!archivo && !datosExtraidos && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors"
          >
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Seleccionar documento</p>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (máx. 5MB)</p>
            </div>
          </button>
        </div>
      )}

      {/* Archivo seleccionado - Mostrar botón analizar */}
      {archivo && !datosExtraidos && !procesando && (
        <div className="space-y-4">
          <div className="rounded-lg border bg-gray-50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{archivo.name}</p>
                <p className="text-xs text-gray-500">{(archivo.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setArchivo(null);
                setError('');
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              Cambiar
            </Button>
          </div>

          <LoadingButton
            onClick={handleAnalizarArchivo}
            loading={procesando}
            className="w-full"
          >
            Analizar Documento
          </LoadingButton>
        </div>
      )}

      {/* Estado de procesamiento */}
      {procesando && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-6 flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-blue-600" />
          <div className="text-center">
            <h4 className="font-medium text-sm text-blue-900">Analizando documento...</h4>
            <p className="text-xs text-blue-700 mt-1">
              La IA está extrayendo los datos del empleado
            </p>
          </div>
        </div>
      )}

      {/* Vista previa de datos extraídos */}
      {datosExtraidos && (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm text-green-900">Datos extraídos correctamente</h4>
              <p className="text-xs text-green-700 mt-1">
                Revisa y edita los datos antes de guardar
              </p>
            </div>
          </div>

          {/* Formulario editable con datos extraídos */}
          <div className="rounded-lg border p-6 space-y-4">
            <h4 className="font-medium text-sm mb-4">Datos del empleado</h4>

            {/* Campos obligatorios visibles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={datosExtraidos.nombre || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, nombre: e.target.value })}
                  placeholder="Juan"
                  required
                />
              </div>

              <div>
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  value={datosExtraidos.apellidos || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, apellidos: e.target.value })}
                  placeholder="García López"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={datosExtraidos.email || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, email: e.target.value })}
                  placeholder="juan.garcia@empresa.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="fechaAlta">Fecha de Alta</Label>
                <ResponsiveDatePicker
                  date={parseDateValue(datosExtraidos.fechaAlta)}
                  onSelect={(date) => updateDatosExtraidosDate('fechaAlta', date)}
                  placeholder="Seleccionar fecha"
                  label="Seleccionar fecha de alta"
                />
              </div>

              <div className="col-span-2">
                <Label>Puesto *</Label>
                <Combobox
                  options={puestosOptions}
                  value={datosExtraidos.puestoId || ''}
                  onValueChange={(value) => setDatosExtraidos({ ...datosExtraidos, puestoId: value || '' })}
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
                  value={datosExtraidos.equipoId || ''}
                  onChange={(value) => setDatosExtraidos({ ...datosExtraidos, equipoId: value })}
                  placeholder="Seleccionar equipo"
                />
              </div>

              <div>
                <Label>Sede</Label>
                <SearchableSelect
                  items={sedesItems}
                  value={datosExtraidos.sedeId || ''}
                  onChange={(value) => setDatosExtraidos({ ...datosExtraidos, sedeId: value })}
                  placeholder="Seleccionar sede"
                />
              </div>
            </div>

            {/* Campos opcionales colapsados en Accordions */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="datos-personales">
                <AccordionTrigger className="text-sm font-medium">
                  Datos Personales (opcional)
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <Label>DNI/NIE</Label>
                      <Input
                        value={datosExtraidos.nif || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, nif: e.target.value })}
                        placeholder="12345678A"
                      />
                    </div>

                    <div>
                      <Label>Número de Seguridad Social</Label>
                      <Input
                        value={datosExtraidos.nss || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, nss: e.target.value })}
                        placeholder="123456789012"
                      />
                    </div>

                    <div>
                      <Label>Fecha de Nacimiento</Label>
                      <ResponsiveDatePicker
                        date={parseDateValue(datosExtraidos.fechaNacimiento)}
                        onSelect={(date) => updateDatosExtraidosDate('fechaNacimiento', date)}
                        placeholder="Seleccionar fecha"
                        label="Seleccionar fecha de nacimiento"
                      />
                    </div>

                    <div>
                      <Label>Teléfono</Label>
                      <Input
                        value={datosExtraidos.telefono || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, telefono: e.target.value })}
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
                        value={datosExtraidos.direccionCalle || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, direccionCalle: e.target.value })}
                        placeholder="Calle Mayor"
                      />
                    </div>

                    <div>
                      <Label>Número</Label>
                      <Input
                        value={datosExtraidos.direccionNumero || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, direccionNumero: e.target.value })}
                        placeholder="123"
                      />
                    </div>

                    <div>
                      <Label>Piso/Puerta</Label>
                      <Input
                        value={datosExtraidos.direccionPiso || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, direccionPiso: e.target.value })}
                        placeholder="3º A"
                      />
                    </div>

                    <div>
                      <Label>Código Postal</Label>
                      <Input
                        value={datosExtraidos.codigoPostal || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, codigoPostal: e.target.value })}
                        placeholder="28001"
                      />
                    </div>

                    <div>
                      <Label>Ciudad</Label>
                      <Input
                        value={datosExtraidos.ciudad || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, ciudad: e.target.value })}
                        placeholder="Madrid"
                      />
                    </div>

                    <div>
                      <Label>Provincia</Label>
                      <Input
                        value={datosExtraidos.direccionProvincia || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, direccionProvincia: e.target.value })}
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
                        value={datosExtraidos.salarioBaseAnual || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, salarioBaseAnual: e.target.value })}
                        placeholder="30000"
                      />
                    </div>

                    <div>
                      <Label>Tipo de Contrato</Label>
                      <SearchableSelect
                        items={[
                          { value: 'indefinido', label: 'Indefinido' },
                          { value: 'temporal', label: 'Temporal' },
                          { value: 'practicas', label: 'Prácticas' },
                          { value: 'formacion', label: 'Formación' },
                        ]}
                        value={datosExtraidos.tipoContrato || ''}
                        onChange={(value) => setDatosExtraidos({ ...datosExtraidos, tipoContrato: value })}
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
                        value={datosExtraidos.iban || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, iban: e.target.value })}
                        placeholder="ES91 2100 0418 4502 0005 1332"
                      />
                    </div>

                    <div>
                      <Label>BIC/SWIFT</Label>
                      <Input
                        value={datosExtraidos.bic || ''}
                        onChange={(e) => setDatosExtraidos({ ...datosExtraidos, bic: e.target.value })}
                        placeholder="CAIXESBBXXX"
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (onCancel) {
                  onCancel();
                } else {
                  setDatosExtraidos(null);
                  setArchivo(null);
                }
              }}
            >
              Cancelar
            </Button>
            <LoadingButton onClick={handleGuardarEmpleado} loading={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Empleado'}
            </LoadingButton>
          </div>
        </div>
      )}

      {/* Mensajes de error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Información adicional */}
      {!datosExtraidos && !archivo && (
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            <strong>💡 Tip:</strong> La IA puede extraer datos de contratos, DNIs, y otros documentos. Los datos son editables antes de guardar.
          </p>
        </div>
      )}
    </div>
  );
}

