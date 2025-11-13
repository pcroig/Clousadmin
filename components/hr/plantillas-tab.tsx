'use client';

// ========================================
// Plantillas Tab - Gestión de plantillas de documentos
// ========================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileType,
} from 'lucide-react';

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
}

export function PlantillasTab() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillasSeleccionadas, setPlantillasSeleccionadas] = useState<Set<string>>(new Set());

  // Estados para subir nueva plantilla
  const [mostrarFormularioSubida, setMostrarFormularioSubida] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [descripcionPlantilla, setDescripcionPlantilla] = useState('');
  const [categoriaPlantilla, setCategoriaPlantilla] = useState('');

  useEffect(() => {
    cargarPlantillas();
  }, []);

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

  const handleSeleccionarPlantilla = (id: string) => {
    const nuevaSeleccion = new Set(plantillasSeleccionadas);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setPlantillasSeleccionadas(nuevaSeleccion);
  };

  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Validar tipo de archivo
    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (extension !== 'docx' && extension !== 'pdf') {
      setError('Solo se permiten archivos .docx o .pdf');
      return;
    }

    setArchivoSeleccionado(archivo);
    setError('');

    // Auto-rellenar nombre si está vacío
    if (!nombrePlantilla) {
      const nombreSinExtension = archivo.name.replace(/\.(docx|pdf)$/, '');
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
      formData.append('archivo', archivoSeleccionado);
      formData.append('nombre', nombrePlantilla.trim());
      if (descripcionPlantilla.trim()) {
        formData.append('descripcion', descripcionPlantilla.trim());
      }
      if (categoriaPlantilla.trim()) {
        formData.append('categoria', categoriaPlantilla.trim());
      }

      const res = await fetch('/api/plantillas', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Plantilla subida correctamente');
        setTimeout(() => setSuccess(''), 3000);

        // Resetear formulario
        setMostrarFormularioSubida(false);
        setArchivoSeleccionado(null);
        setNombrePlantilla('');
        setDescripcionPlantilla('');
        setCategoriaPlantilla('');

        // Recargar plantillas
        cargarPlantillas();
      } else {
        setError(data.error || 'Error al subir plantilla');
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

      {/* Formulario de subida */}
      {mostrarFormularioSubida && (
        <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <h4 className="font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Subir Nueva Plantilla
          </h4>

          <div className="space-y-3">
            <div>
              <Label>Archivo (DOCX o PDF)</Label>
              <Input
                type="file"
                accept=".docx,.pdf"
                onChange={handleArchivoSeleccionado}
                disabled={uploading}
              />
              {archivoSeleccionado && (
                <p className="text-xs text-gray-600 mt-1">
                  Archivo seleccionado: {archivoSeleccionado.name}
                </p>
              )}
            </div>

            <div>
              <Label>Nombre de la plantilla</Label>
              <Input
                value={nombrePlantilla}
                onChange={(e) => setNombrePlantilla(e.target.value)}
                placeholder="ej: Contrato Temporal"
                disabled={uploading}
              />
            </div>

            <div>
              <Label>Descripción (opcional)</Label>
              <Input
                value={descripcionPlantilla}
                onChange={(e) => setDescripcionPlantilla(e.target.value)}
                placeholder="ej: Contrato para empleados temporales"
                disabled={uploading}
              />
            </div>

            <div>
              <Label>Categoría (opcional)</Label>
              <Input
                value={categoriaPlantilla}
                onChange={(e) => setCategoriaPlantilla(e.target.value)}
                placeholder="ej: contratos, onboarding, legal"
                disabled={uploading}
              />
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
                seleccionada={plantillasSeleccionadas.has(plantilla.id)}
                onSeleccionar={handleSeleccionarPlantilla}
                onEliminar={handleEliminarPlantilla}
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
                seleccionada={plantillasSeleccionadas.has(plantilla.id)}
                onSeleccionar={handleSeleccionarPlantilla}
                onEliminar={handleEliminarPlantilla}
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
          <p className="text-sm">Haz clic en "Subir Plantilla" para crear una</p>
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
  onSeleccionar: (id: string) => void;
  onEliminar: (id: string, nombre: string) => void;
}

function PlantillaCard({ plantilla, seleccionada, onSeleccionar, onEliminar }: PlantillaCardProps) {
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
            onCheckedChange={() => onSeleccionar(plantilla.id)}
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
                {plantilla.esOficial && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Oficial
                  </span>
                )}
                {!plantilla.activa && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    Inactiva
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  {plantilla.formato.toUpperCase()}
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
    </div>
  );
}
