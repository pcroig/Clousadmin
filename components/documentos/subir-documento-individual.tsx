'use client';

// ========================================
// Subir Documento Individual - Con Extracción IA
// ========================================

import { AlertCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { FileUploadAdvanced } from '@/components/shared/file-upload-advanced';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadHandler } from '@/lib/hooks/use-file-upload';
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
  salarioBrutoAnual?: string;
  tipoContrato?: string;
  direccionCalle?: string;
  direccionNumero?: string;
  direccionPiso?: string;
  codigoPostal?: string;
  ciudad?: string;
  direccionProvincia?: string;
  nss?: string;
  iban?: string;
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
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [datosExtraidos, setDatosExtraidos] = useState<DatosExtraidos | null>(null);
  const [error, setError] = useState('');

  const handleUploadAndExtract: UploadHandler = useCallback(
    async ({ file, signal }) => {
      setError('');
      setProcesando(true);
      setArchivo(file);
      setDatosExtraidos(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/documentos/extraer', {
          method: 'POST',
          body: formData,
          signal,
        });

        const result = await parseJson<ExtraerDocumentoResponse>(response);

        if (result.success) {
          setDatosExtraidos(result.datosExtraidos ?? null);
          toast.success('Datos extraídos correctamente');
          return { success: true };
        }

        const errorMessage = result.error || 'Error al extraer datos del documento';
        setError(errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return { success: false, error: 'Procesamiento cancelado' };
        }
        setError('Error al procesar el documento');
        toast.error('Error al procesar el documento');
        console.error('Error:', err);
        return { success: false, error: 'Error al procesar el documento' };
      } finally {
        setProcesando(false);
      }
    },
    []
  );

  const handleGuardarEmpleado = async () => {
    if (!datosExtraidos) return;

    setError('');
    setGuardando(true);

    try {
      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosExtraidos),
      });

      const data = await parseJson<CrearEmpleadoResponse>(response);

      if (response.ok) {
        toast.success('Empleado creado correctamente');
        
        // Resetear formulario
        setArchivo(null);
        setDatosExtraidos(null);

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

      {/* Área de carga de archivo */}
      {!datosExtraidos && (
        <FileUploadAdvanced
          onUpload={handleUploadAndExtract}
          acceptedTypes={['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']}
          maxSizeMB={5}
          maxFiles={1}
          allowMultiple={false}
          disabled={procesando}
          buttonText="Seleccionar documento"
          className="bg-white p-4 rounded-xl border border-gray-100"
        />
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

            <div className="grid grid-cols-2 gap-4">
              {/* Nombre */}
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={datosExtraidos.nombre || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, nombre: e.target.value })}
                />
              </div>

              {/* Apellidos */}
              <div>
                <Label htmlFor="apellidos">Apellidos</Label>
                <Input
                  id="apellidos"
                  value={datosExtraidos.apellidos || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, apellidos: e.target.value })}
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={datosExtraidos.email || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, email: e.target.value })}
                />
              </div>

              {/* NIF */}
              <div>
                <Label htmlFor="nif">NIF/DNI/NIE</Label>
                <Input
                  id="nif"
                  value={datosExtraidos.nif || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, nif: e.target.value })}
                />
              </div>

              {/* Teléfono */}
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={datosExtraidos.telefono || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, telefono: e.target.value })}
                />
              </div>

              {/* Fecha de nacimiento */}
              <div>
                <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                <Input
                  id="fechaNacimiento"
                  type="date"
                  value={datosExtraidos.fechaNacimiento || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, fechaNacimiento: e.target.value })}
                />
              </div>

              {/* Puesto */}
              <div>
                <Label htmlFor="puesto">Puesto</Label>
                <Input
                  id="puesto"
                  value={datosExtraidos.puesto || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, puesto: e.target.value })}
                />
              </div>

              {/* Fecha de alta */}
              <div>
                <Label htmlFor="fechaAlta">Fecha de alta</Label>
                <Input
                  id="fechaAlta"
                  type="date"
                  value={datosExtraidos.fechaAlta || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, fechaAlta: e.target.value })}
                />
              </div>

              {/* Salario bruto anual */}
              <div>
                <Label htmlFor="salarioBrutoAnual">Salario bruto anual</Label>
                <Input
                  id="salarioBrutoAnual"
                  type="number"
                  value={datosExtraidos.salarioBrutoAnual || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, salarioBrutoAnual: e.target.value })}
                />
              </div>

              {/* Tipo de contrato */}
              <div>
                <Label htmlFor="tipoContrato">Tipo de contrato</Label>
                <Input
                  id="tipoContrato"
                  value={datosExtraidos.tipoContrato || ''}
                  onChange={(e) => setDatosExtraidos({ ...datosExtraidos, tipoContrato: e.target.value })}
                />
              </div>
            </div>

            {/* Dirección (colapsable o en otra sección) */}
            <details className="mt-4">
              <summary className="text-sm font-medium cursor-pointer text-gray-700 hover:text-gray-900">
                Dirección (opcional)
              </summary>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="direccionCalle">Calle</Label>
                  <Input
                    id="direccionCalle"
                    value={datosExtraidos.direccionCalle || ''}
                    onChange={(e) => setDatosExtraidos({ ...datosExtraidos, direccionCalle: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="direccionNumero">Número</Label>
                  <Input
                    id="direccionNumero"
                    value={datosExtraidos.direccionNumero || ''}
                    onChange={(e) => setDatosExtraidos({ ...datosExtraidos, direccionNumero: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="codigoPostal">Código postal</Label>
                  <Input
                    id="codigoPostal"
                    value={datosExtraidos.codigoPostal || ''}
                    onChange={(e) => setDatosExtraidos({ ...datosExtraidos, codigoPostal: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input
                    id="ciudad"
                    value={datosExtraidos.ciudad || ''}
                    onChange={(e) => setDatosExtraidos({ ...datosExtraidos, ciudad: e.target.value })}
                  />
                </div>
              </div>
            </details>
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

