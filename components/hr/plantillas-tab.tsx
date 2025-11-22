'use client';

// ========================================
// Plantillas Tab - Gestión de plantillas de documentos
// ========================================

import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileType,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

import type {
  CamposRequeridos,
  PlantillaDocumento as ConfigPlantilla,
} from '@/lib/onboarding-config';


interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: 'oficial' | 'personalizada';
  formato: 'docx' | 'pdf_rellenable';
  categoria: string | null;
  esOficial: boolean;
  activa: boolean;
  variablesUsadas: string[];
  requiereFirma: boolean;
  carpetaDestinoDefault: string | null;
  totalDocumentosGenerados?: number;
  creadoEn: string;
  s3Key: string;
}

interface PlantillasTabProps {
  seleccionadas: ConfigPlantilla[];
  onSeleccionChange: (plantillas: ConfigPlantilla[]) => void;
  camposRequeridos: CamposRequeridos;
}

const VARIABLE_TO_CAMPO: Record<
  string,
  { grupo: keyof CamposRequeridos; campo: string; label: string }
> = {
  empleado_nif: { grupo: 'datos_personales', campo: 'nif', label: 'NIF/NIE' },
  empleado_nss: { grupo: 'datos_personales', campo: 'nss', label: 'Nº Seguridad Social' },
  empleado_telefono: { grupo: 'datos_personales', campo: 'telefono', label: 'Teléfono' },
  empleado_direccion_calle: {
    grupo: 'datos_personales',
    campo: 'direccionCalle',
    label: 'Dirección - Calle',
  },
  empleado_direccion_numero: {
    grupo: 'datos_personales',
    campo: 'direccionNumero',
    label: 'Dirección - Número',
  },
  empleado_direccion_piso: {
    grupo: 'datos_personales',
    campo: 'direccionPiso',
    label: 'Dirección - Piso',
  },
  empleado_codigo_postal: {
    grupo: 'datos_personales',
    campo: 'codigoPostal',
    label: 'Código Postal',
  },
  empleado_ciudad: { grupo: 'datos_personales', campo: 'ciudad', label: 'Ciudad' },
  empleado_provincia: {
    grupo: 'datos_personales',
    campo: 'direccionProvincia',
    label: 'Provincia',
  },
  empleado_estado_civil: {
    grupo: 'datos_personales',
    campo: 'estadoCivil',
    label: 'Estado civil',
  },
  empleado_numero_hijos: {
    grupo: 'datos_personales',
    campo: 'numeroHijos',
    label: 'Número de hijos',
  },
  empleado_iban: { grupo: 'datos_bancarios', campo: 'iban', label: 'IBAN' },
  empleado_titular_cuenta: {
    grupo: 'datos_bancarios',
    campo: 'titularCuenta',
    label: 'Titular de la cuenta',
  },
};

export function PlantillasTab({
  seleccionadas,
  onSeleccionChange,
  camposRequeridos,
}: PlantillasTabProps) {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingSeleccion, setSavingSeleccion] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);

  // Estados para subir nueva plantilla
  const [mostrarFormularioSubida, setMostrarFormularioSubida] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [nombrePlantilla, setNombrePlantilla] = useState('');

  useEffect(() => {
    cargarPlantillas();
  }, []);

  const seleccionadasIds = useMemo(
    () => new Set(seleccionadas.map((p) => p.id)),
    [seleccionadas]
  );

  const cargarPlantillas = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/plantillas');
      const data = await res.json();

      if (data.success) {
        setPlantillas(data.plantillas || []);
      } else {
        setError(data.error || 'Error al cargar plantillas');
      }
    } catch (err) {
      console.error('[cargarPlantillas] Error:', err);
      setError('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarSeleccion = async () => {
    setSavingSeleccion(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/hr/onboarding-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'plantillas_documentos',
          data: seleccionadas,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar plantillas seleccionadas');
      }

      if (data.config?.plantillasDocumentos) {
        onSeleccionChange(data.config.plantillasDocumentos);
      }

      setSuccess('Plantillas guardadas correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('[PlantillasTab] Error guardando selección:', err);
      setError(
        err instanceof Error ? err.message : 'Error al guardar plantillas seleccionadas'
      );
    } finally {
      setSavingSeleccion(false);
    }
  };

  const handleToggleSeleccion = (plantilla: Plantilla) => {
    if (seleccionadasIds.has(plantilla.id)) {
      onSeleccionChange(seleccionadas.filter((p) => p.id !== plantilla.id));
      return;
    }

    const nuevaPlantilla: ConfigPlantilla = {
      id: plantilla.id,
      nombre: plantilla.nombre,
      s3Key: plantilla.s3Key,
      tipoDocumento: plantilla.categoria || plantilla.tipo || 'generico',
      descripcion: plantilla.descripcion || undefined,
    };

    onSeleccionChange([...seleccionadas, nuevaPlantilla]);
  };

  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Validar tipo de archivo - solo DOCX por ahora
    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (extension !== 'docx') {
      setError('Solo se permiten archivos .docx con variables. El soporte para PDFs rellenables llegará en una fase posterior.');
      return;
    }

    setArchivoSeleccionado(archivo);
    setError('');

    // Auto-rellenar nombre si está vacío
    if (!nombrePlantilla) {
      const nombreSinExtension = archivo.name.replace(/\.docx$/, '');
      setNombrePlantilla(nombreSinExtension);
    }
  };

  const handleSubirPlantilla = async () => {
    if (!archivoSeleccionado) {
      setError('Selecciona un archivo');
      return;
    }

    if (!nombrePlantilla.trim()) {
      setError('Ingresa un nombre para la plantilla');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', archivoSeleccionado);
      formData.append('nombre', nombrePlantilla.trim());

      const res = await fetch('/api/plantillas', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Plantilla subida correctamente. Variables detectadas automáticamente.');
        setTimeout(() => setSuccess(''), 3000);

        // Resetear formulario
        setMostrarFormularioSubida(false);
        setArchivoSeleccionado(null);
        setNombrePlantilla('');

        // Recargar plantillas
        cargarPlantillas();
      } else {
        setError(data.error || 'Error al subir plantilla');
        if (data.tip) {
          setError(`${data.error}\n${data.tip}`);
        }
      }
    } catch (err) {
      console.error('[handleSubirPlantilla] Error:', err);
      setError('Error al subir plantilla');
    } finally {
      setUploading(false);
    }
  };

  const handleEliminarPlantilla = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar la plantilla "${nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/plantillas/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Plantilla eliminada correctamente');
        setTimeout(() => setSuccess(''), 3000);
        cargarPlantillas();
      } else {
        setError(data.error || 'Error al eliminar plantilla');
      }
    } catch (err) {
      console.error('[handleEliminarPlantilla] Error:', err);
      setError('Error al eliminar plantilla');
    }
  };

  const plantillasOficiales = plantillas.filter((p) => p.esOficial);
  const plantillasPersonalizadas = plantillas.filter((p) => !p.esOficial);

  const advertenciasGlobales = useMemo(() => {
    const faltantes = new Map<string, Set<string>>();

    plantillas.forEach((plantilla) => {
      if (!seleccionadasIds.has(plantilla.id)) return;
      const campos = obtenerCamposFaltantes(plantilla, camposRequeridos);
      if (campos.length) {
        faltantes.set(plantilla.nombre, new Set(campos));
      }
    });

    return faltantes;
  }, [plantillas, seleccionadasIds, camposRequeridos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con descripción y botón de subida */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">
            Gestiona las plantillas de documentos para onboarding/offboarding
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Las plantillas seleccionadas estarán disponibles para generar documentos automáticamente
          </p>
        </div>
        <Button
          onClick={() => setMostrarFormularioSubida(!mostrarFormularioSubida)}
          size="sm"
          variant={mostrarFormularioSubida ? 'outline' : 'default'}
        >
          {mostrarFormularioSubida ? (
            <>Cancelar</>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Subir Plantilla
            </>
          )}
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 p-4 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Plantillas incluidas en el onboarding</p>
            <p className="text-lg font-semibold">
              {seleccionadas.length} seleccionada{seleccionadas.length === 1 ? '' : 's'}
            </p>
          </div>
          <LoadingButton
            onClick={handleGuardarSeleccion}
            loading={savingSeleccion}
            disabled={savingSeleccion}
          >
            Guardar selección
          </LoadingButton>
        </div>
        {advertenciasGlobales.size > 0 && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Activa estos campos en Datos requeridos:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              {[...advertenciasGlobales.entries()].map(([nombre, campos]) => (
                <li key={nombre}>
                  <span className="font-semibold">{nombre}:</span> {[...campos].join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Formulario de subida */}
      {mostrarFormularioSubida && (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <h4 className="font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Subir Nueva Plantilla
          </h4>

          <div className="space-y-3">
            <div>
              <Label>Archivo (DOCX con variables)</Label>
              <Input
                type="file"
                accept=".docx"
                onChange={handleArchivoSeleccionado}
                disabled={uploading}
              />
              {archivoSeleccionado && (
                <p className="text-xs text-gray-600 mt-1">
                  Archivo seleccionado: {archivoSeleccionado.name}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Solo se aceptan plantillas DOCX con variables. El soporte para PDFs rellenables llegará en una fase posterior.
              </p>
            </div>

            <div>
              <Label>Nombre de la plantilla</Label>
              <Input
                value={nombrePlantilla}
                onChange={(e) => setNombrePlantilla(e.target.value)}
                placeholder="ej: Contrato Temporal, Modelo 145, etc."
                disabled={uploading}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-900">
                El sistema detectará automáticamente las variables del formato{' '}
                <code className="bg-blue-100 px-1 rounded">{'{{nombre_variable}}'}</code> presentes en el documento.
              </p>
            </div>

            <LoadingButton
              onClick={handleSubirPlantilla}
              loading={uploading}
              disabled={uploading || !archivoSeleccionado || !nombrePlantilla.trim()}
              className="w-full"
            >
              {uploading ? 'Subiendo...' : 'Subir Plantilla'}
            </LoadingButton>
          </div>
        </div>
      )}

      {/* Plantillas Oficiales */}
      {plantillasOficiales.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            Plantillas Oficiales
          </h3>
          <div className="space-y-3">
            {plantillasOficiales.map((plantilla) => (
              <PlantillaCard
                key={plantilla.id}
                plantilla={plantilla}
                seleccionada={seleccionadasIds.has(plantilla.id)}
                onSeleccionar={handleToggleSeleccion}
                onEliminar={handleEliminarPlantilla}
                warnings={obtenerCamposFaltantes(plantilla, camposRequeridos)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Plantillas Personalizadas */}
      {plantillasPersonalizadas.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Plantillas Personalizadas
          </h3>
          <div className="space-y-3">
            {plantillasPersonalizadas.map((plantilla) => (
              <PlantillaCard
                key={plantilla.id}
                plantilla={plantilla}
                seleccionada={seleccionadasIds.has(plantilla.id)}
                onSeleccionar={handleToggleSeleccion}
                onEliminar={handleEliminarPlantilla}
                warnings={obtenerCamposFaltantes(plantilla, camposRequeridos)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {plantillas.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p>No hay plantillas disponibles</p>
          <p className="text-sm">Haz clic en «Subir Plantilla» para crear una</p>
        </div>
      )}

      {/* Mensajes de error/éxito */}
      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
    </div>
  );
}

// ========================================
// PlantillaCard - Tarjeta individual de plantilla
// ========================================

interface PlantillaCardProps {
  plantilla: Plantilla;
  seleccionada: boolean;
  onSeleccionar: (plantilla: Plantilla) => void;
  onEliminar: (id: string, nombre: string) => void;
  warnings: string[];
}

function PlantillaCard({
  plantilla,
  seleccionada,
  onSeleccionar,
  onEliminar,
  warnings,
}: PlantillaCardProps) {
  const formatoLabel = plantilla.formato === 'docx' ? 'DOCX' : 'PDF rellenable';

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        seleccionada ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Checkbox y contenido principal */}
        <div className="flex items-start gap-3 flex-1">
          <Checkbox
            id={`plantilla-${plantilla.id}`}
            checked={seleccionada}
            onCheckedChange={() => onSeleccionar(plantilla)}
            className="mt-1"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Label
                htmlFor={`plantilla-${plantilla.id}`}
                className="font-medium cursor-pointer text-base"
              >
                {plantilla.nombre}
              </Label>

              {/* Badges */}
              <div className="flex items-center gap-1">
                {plantilla.esOficial ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Oficial
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    Personalizada
                  </span>
                )}
                {!plantilla.activa && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Inactiva
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {formatoLabel}
                </span>
              </div>
            </div>

            {plantilla.descripcion && (
              <p className="text-sm text-gray-600 mb-2">{plantilla.descripcion}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500">
              {plantilla.categoria && (
                <span className="flex items-center gap-1">
                  <FileType className="h-3 w-3" />
                  {plantilla.categoria}
                </span>
              )}
              <span>{plantilla.variablesUsadas.length} variables</span>
              {plantilla.totalDocumentosGenerados !== undefined && (
                <span>{plantilla.totalDocumentosGenerados} docs generados</span>
              )}
            </div>

            {plantilla.requiereFirma && (
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-700">
                <AlertCircle className="h-3 w-3" />
                Requiere firma digital
              </div>
            )}
          </div>
        </div>

        {/* Acciones */}
        {!plantilla.esOficial && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEliminar(plantilla.id, plantilla.nombre)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {warnings.length > 0 && (
        <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Activa estos campos en Datos requeridos:</p>
            <ul className="list-disc pl-4 space-y-0.5 mt-1">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function obtenerCamposFaltantes(
  plantilla: Plantilla,
  camposRequeridos: CamposRequeridos
): string[] {
  const faltantes: string[] = [];

  for (const variable of plantilla.variablesUsadas) {
    const mapping = VARIABLE_TO_CAMPO[variable];
    if (!mapping) continue;

    const grupo = camposRequeridos[mapping.grupo] as Record<string, boolean> | undefined;
    if (!grupo) continue;

    if (!grupo[mapping.campo]) {
      faltantes.push(mapping.label);
    }
  }

  return faltantes;
}
