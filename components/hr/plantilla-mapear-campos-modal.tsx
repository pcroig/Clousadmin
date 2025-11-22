'use client';

// ========================================
// Plantilla Mapear Campos Modal - Mapeo de campos PDF a variables del sistema
// ========================================

import {
  CheckCircle2,
  FileText,
  Search,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';


interface Campo {
  nombre: string;
  origen: 'nativo' | 'ia';
  tipo?: string;
  confianza?: number;
}

interface MapearCamposModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantillaId: string;
  plantillaNombre: string;
  onSuccess?: () => void;
}

export function MapearCamposModal({
  open,
  onOpenChange,
  plantillaId,
  plantillaNombre,
  onSuccess,
}: MapearCamposModalProps) {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [variablesDisponibles, setVariablesDisponibles] = useState<string[]>([]);
  const [mapeos, setMapeos] = useState<Record<string, string>>({});
  const [busqueda, setBusqueda] = useState('');

  const cargarVariablesDisponibles = useCallback(async () => {
    try {
      const res = await fetch('/api/plantillas/variables');
      const data = await res.json();
      if (data.success) {
        setVariablesDisponibles(data.variables || []);
      }
    } catch (error) {
      console.error('[MapearCampos] Error al cargar variables:', error);
    }
  }, []);

  const cargarCamposActuales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plantillas/${plantillaId}`);
      const data = await res.json();

      if (data.success && data.plantilla) {
        const plantilla = data.plantilla;

        // Si hay configuración IA con campos fusionados, usarlos
        if (plantilla.configuracionIA?.camposFusionados) {
          setCampos(plantilla.configuracionIA.camposFusionados);
        } else {
          // Si no, usar variablesUsadas como campos nativos
          setCampos(
            (plantilla.variablesUsadas || []).map((v: string) => ({
              nombre: v,
              origen: 'nativo' as const,
            }))
          );
        }

        // Si hay mapeos previos, cargarlos
        if (plantilla.configuracionIA?.mapeoCampos) {
          setMapeos(plantilla.configuracionIA.mapeoCampos);
        }
      }
    } catch (error) {
      console.error('[MapearCampos] Error al cargar campos:', error);
      toast.error('Error al cargar campos');
    } finally {
      setLoading(false);
    }
  }, [plantillaId]);

  useEffect(() => {
    if (open) {
      cargarVariablesDisponibles();
      cargarCamposActuales();
    }
  }, [open, plantillaId, cargarVariablesDisponibles, cargarCamposActuales]);

  const handleEscanearCampos = async () => {
    setScanning(true);
    try {
      const res = await fetch(`/api/plantillas/${plantillaId}/escanear-campos`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          `Escaneo completado: ${data.camposTotal} campos detectados (${data.camposNativos} nativos, ${data.camposIA} por IA)`
        );
        const nuevosCampos: Campo[] = data.campos || [];
        setCampos(nuevosCampos);

        // Auto-mapear con IA usando los campos recién detectados
        handleAutoMapear(nuevosCampos);
      } else {
        toast.error(data.error || 'Error al escanear campos');
      }
    } catch (error) {
      console.error('[MapearCampos] Error al escanear:', error);
      toast.error('Error al escanear campos');
    } finally {
      setScanning(false);
    }
  };

  const handleAutoMapear = async (camposFuente?: Campo[]) => {
    const camposParaMapear = camposFuente ?? campos;

    if (!camposParaMapear.length) {
      toast.info('No hay campos detectados para auto-mapear');
      return;
    }

    toast.info('Auto-mapeando campos con IA...');

    try {
      // Mapeo automático simple basado en nombres similares
      const nuevoMapeo: Record<string, string> = {};

      for (const campo of camposParaMapear) {
        const nombreNormalizado = campo.nombre.toLowerCase().trim();

        // Buscar variable similar
        const variableSimilar = variablesDisponibles.find((v) => {
          const vNormalizada = v.toLowerCase().trim();
          
          // Match exacto
          if (vNormalizada === nombreNormalizado) return true;

          // Match parcial (contiene)
          if (
            vNormalizada.includes(nombreNormalizado) ||
            nombreNormalizado.includes(vNormalizada)
          ) {
            return true;
          }

          // Match común de sinónimos
          const sinonimosCampo = obtenerSinonimos(nombreNormalizado);
          const sinonimosVariable = obtenerSinonimos(vNormalizada);

          return sinonimosCampo.some((s) => sinonimosVariable.includes(s));
        });

        if (variableSimilar) {
          nuevoMapeo[campo.nombre] = variableSimilar;
        }
      }

      const cantidadMapeada = Object.keys(nuevoMapeo).length;
      if (cantidadMapeada === 0) {
        toast.info('No se encontraron coincidencias para auto-mapear');
        return;
      }

      setMapeos((prev) => ({ ...prev, ...nuevoMapeo }));
      toast.success(`Auto-mapeados ${cantidadMapeada} campos`);
    } catch (error) {
      console.error('[MapearCampos] Error al auto-mapear:', error);
      toast.error('Error al auto-mapear');
    }
  };

  const obtenerSinonimos = (nombre: string): string[] => {
    const sinonimos: Record<string, string[]> = {
      nombre: ['name', 'first_name', 'nombre', 'nombres'],
      apellidos: ['surname', 'last_name', 'apellidos', 'apellido'],
      nif: ['dni', 'id_number', 'nif', 'nie', 'documento'],
      email: ['correo', 'email', 'e-mail', 'mail'],
      telefono: ['phone', 'telefono', 'tel', 'movil', 'celular'],
      direccion: ['address', 'direccion', 'calle'],
      fecha_nacimiento: ['birthday', 'birth_date', 'fecha_nacimiento', 'nacimiento'],
      salario: ['salary', 'salario', 'sueldo', 'remuneracion'],
      fecha: ['date', 'fecha'],
      ciudad: ['city', 'ciudad', 'municipio'],
      codigo_postal: ['zip', 'postal_code', 'codigo_postal', 'cp'],
    };

    const resultado: string[] = [nombre];

    for (const [_clave, valores] of Object.entries(sinonimos)) {
      if (valores.includes(nombre)) {
        resultado.push(...valores);
      }
    }

    return resultado;
  };

  const handleActualizarMapeo = (campoPDF: string, variableSistema: string) => {
    setMapeos((prev) => ({
      ...prev,
      [campoPDF]: variableSistema,
    }));
  };

  const handleGuardarMapeos = async () => {
    setSaving(true);
    try {
      // Actualizar configuracionIA con los mapeos
      const res = await fetch(`/api/plantillas/${plantillaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuracionIA: {
            mapeoCampos: mapeos,
            ultimoMapeo: new Date().toISOString(),
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Mapeos guardados correctamente');
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.error || 'Error al guardar mapeos');
      }
    } catch (error) {
      console.error('[MapearCampos] Error al guardar:', error);
      toast.error('Error al guardar mapeos');
    } finally {
      setSaving(false);
    }
  };

  const camposFiltrados = campos.filter((campo) =>
    campo.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-600" />
            Mapear Campos - {plantillaNombre}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Acciones */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <LoadingButton
                variant="outline"
                size="sm"
                onClick={handleEscanearCampos}
                loading={scanning}
              >
                <Search className="h-4 w-4 mr-2" />
                Escanear PDF
              </LoadingButton>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoMapear}
                disabled={campos.length === 0}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-mapear con IA
              </Button>
            </div>
            <Input
              placeholder="Buscar campos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Instrucciones:</strong> Mapea cada campo del PDF a una variable del sistema.
              Las variables son datos como empleado_nombre, contrato_salario, etc.
            </p>
          </div>

          {/* Lista de campos */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="size-8 text-gray-400" />
            </div>
          ) : camposFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No hay campos para mapear</p>
              <p className="text-sm">
                {campos.length === 0
                  ? 'Haz clic en "Escanear PDF" para detectar campos'
                  : 'No se encontraron campos con ese nombre'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {camposFiltrados.map((campo) => (
                <div
                  key={campo.nombre}
                  className="border rounded-lg p-4 space-y-2 bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="font-medium text-gray-900">
                          {campo.nombre}
                        </Label>
                        <Badge variant={campo.origen === 'nativo' ? 'default' : 'secondary'}>
                          {campo.origen === 'nativo' ? 'Campo nativo' : 'Detectado por IA'}
                        </Badge>
                        {campo.confianza && (
                          <Badge
                            variant={campo.confianza >= 0.8 ? 'success' : 'warning'}
                            className="text-xs"
                          >
                            {Math.round(campo.confianza * 100)}% confianza
                          </Badge>
                        )}
                      </div>
                      {campo.tipo && (
                        <p className="text-xs text-gray-500">Tipo: {campo.tipo}</p>
                      )}
                    </div>
                    {mapeos[campo.nombre] && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-gray-600">
                      Mapear a variable del sistema:
                    </Label>
                    <Select
                      value={mapeos[campo.nombre] || ''}
                      onValueChange={(value) => handleActualizarMapeo(campo.nombre, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una variable..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin mapear</SelectItem>
                        {variablesDisponibles.map((variable) => (
                          <SelectItem key={variable} value={variable}>
                            {variable}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumen */}
          {campos.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {Object.keys(mapeos).length} de {campos.length} campos mapeados
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <LoadingButton onClick={handleGuardarMapeos} loading={saving}>
                    Guardar Mapeos
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

