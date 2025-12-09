'use client';

// ========================================
// Gestionar Onboarding Modal - Lista de Acciones
// ========================================
// Configurar workflow de onboarding como lista simple de acciones

import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { WorkflowAccion, TipoAccion } from '@/lib/onboarding-config-types';
import { getTipoAccionLabel } from '@/lib/onboarding-config-types';

// Helper para generar IDs únicos
const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';

import { EditarAccionDialog } from './editar-accion-dialog';

interface GestionarOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GestionarOnboardingModal({ open, onOpenChange }: GestionarOnboardingModalProps) {
  const [acciones, setAcciones] = useState<WorkflowAccion[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoAccion, setEditandoAccion] = useState<WorkflowAccion | null>(null);

  useEffect(() => {
    if (open) {
      cargarWorkflow();
    }
  }, [open]);

  const cargarWorkflow = async () => {
    try {
      setCargando(true);
      const response = await fetch('/api/onboarding/config');
      if (response.ok) {
        const data = await response.json();
        setAcciones(data.workflowAcciones || []);
      }
    } catch (error) {
      console.error('[GestionarOnboarding] Error al cargar:', error);
      toast.error('No se pudo cargar la configuración');
    } finally {
      setCargando(false);
    }
  };

  const añadirAccion = (tipo: TipoAccion) => {
    const nuevaAccion: WorkflowAccion = {
      id: generateId(),
      orden: acciones.length,
      tipo,
      titulo: '',
      activo: true,
      config: tipo === 'rellenar_campos' ? { campos: [] }
        : tipo === 'compartir_docs' ? { documentoIds: [] }
        : tipo === 'solicitar_docs' ? { documentosRequeridos: [] }
        : { documentosFirma: [] },
    };
    setEditandoAccion(nuevaAccion);
  };

  const guardarAccionEditada = (accion: WorkflowAccion) => {
    const index = acciones.findIndex(a => a.id === accion.id);
    if (index >= 0) {
      // Actualizar acción existente
      const nuevasAcciones = [...acciones];
      nuevasAcciones[index] = accion;
      setAcciones(nuevasAcciones);
    } else {
      // Añadir nueva acción
      setAcciones([...acciones, accion]);
    }
    setEditandoAccion(null);
  };

  const toggleActivo = (accionId: string) => {
    setAcciones(acciones.map(a =>
      a.id === accionId ? { ...a, activo: !a.activo } : a
    ));
  };

  const eliminarAccion = (accionId: string) => {
    if (confirm('¿Estás seguro de eliminar esta acción?')) {
      setAcciones(acciones.filter(a => a.id !== accionId));
    }
  };

  const guardarWorkflow = async () => {
    try {
      setGuardando(true);

      // Log temporal para debug
      console.log('[GestionarOnboarding] Guardando workflow:', JSON.stringify(acciones, null, 2));

      const response = await fetch('/api/onboarding/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowAcciones: acciones }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        console.error('[GestionarOnboarding] Error del servidor:', errorData);
        throw new Error(errorData.error || 'Error al guardar');
      }

      toast.success('Configuración de onboarding actualizada correctamente');

      onOpenChange(false);
    } catch (error) {
      console.error('[GestionarOnboarding] Error al guardar:', error);
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurar Workflow de Onboarding</DialogTitle>
            <DialogDescription>
              Define las acciones que los nuevos empleados deben completar durante su onboarding
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Botón para añadir acción */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-700">Acciones del Workflow</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Acción
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => añadirAccion('rellenar_campos')}>
                    Rellenar campos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => añadirAccion('compartir_docs')}>
                    Compartir documentos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => añadirAccion('solicitar_docs')}>
                    Solicitar documentos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => añadirAccion('solicitar_firma')}>
                    Solicitar firma
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Lista de acciones */}
            {cargando ? (
              <div className="text-center py-12 text-gray-500">Cargando...</div>
            ) : acciones.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <p>No hay acciones configuradas</p>
                  <p className="text-sm mt-2">Haz clic en "Añadir Acción" para empezar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {acciones.map((accion, index) => (
                  <Card key={accion.id} className={!accion.activo ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <CardTitle className="text-base">
                                {index + 1}. {accion.titulo || 'Sin título'}
                              </CardTitle>
                              <Badge variant="outline">
                                {getTipoAccionLabel(accion.tipo)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditandoAccion(accion)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarAccion(accion.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarWorkflow} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Workflow'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para editar acción */}
      {editandoAccion && (
        <EditarAccionDialog
          accion={editandoAccion}
          onSave={guardarAccionEditada}
          onCancel={() => setEditandoAccion(null)}
        />
      )}
    </>
  );
}