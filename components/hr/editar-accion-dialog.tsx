'use client';

// ========================================
// Editar Acción Dialog
// ========================================
// Modal para configurar una acción específica del workflow

import { useState } from 'react';

import type { WorkflowAccion } from '@/lib/onboarding-config-types';
import { getTipoAccionLabel } from '@/lib/onboarding-config-types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { ConfigRellenarCampos } from './config-rellenar-campos';
import { ConfigCompartirDocs } from './config-compartir-docs';
import { ConfigSolicitarDocs } from './config-solicitar-docs';
import { ConfigSolicitarFirma } from './config-solicitar-firma';

interface EditarAccionDialogProps {
  accion: WorkflowAccion;
  onSave: (accion: WorkflowAccion) => void;
  onCancel: () => void;
}

export function EditarAccionDialog({ accion, onSave, onCancel }: EditarAccionDialogProps) {
  const [accionEditada, setAccionEditada] = useState<WorkflowAccion>(accion);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSave = () => {
    // Validar título
    if (!accionEditada.titulo || accionEditada.titulo.trim() === '') {
      setErrors(['El título es requerido']);
      return;
    }

    // Validar configuración según tipo
    const validacion = validarConfig(accionEditada);
    if (!validacion.valid) {
      setErrors(validacion.errors);
      return;
    }

    onSave(accionEditada);
  };

  const validarConfig = (accion: WorkflowAccion): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    switch (accion.tipo) {
      case 'rellenar_campos': {
        const config = accion.config as { campos?: string[] };
        if (!config.campos || config.campos.length === 0) {
          errors.push('Debes seleccionar al menos un campo');
        }
        break;
      }
      case 'compartir_docs': {
        const config = accion.config as { documentoIds?: string[] };
        if (!config.documentoIds || config.documentoIds.length === 0) {
          errors.push('Debes seleccionar al menos un documento');
        }
        break;
      }
      case 'solicitar_docs': {
        const config = accion.config as { documentosRequeridos?: unknown[] };
        if (!config.documentosRequeridos || config.documentosRequeridos.length === 0) {
          errors.push('Debes configurar al menos un documento a solicitar');
        }
        break;
      }
      case 'solicitar_firma': {
        const config = accion.config as { documentosFirma?: unknown[] };
        if (!config.documentosFirma || config.documentosFirma.length === 0) {
          errors.push('Debes configurar al menos un documento a firmar');
        }
        break;
      }
    }

    return { valid: errors.length === 0, errors };
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {accion.titulo ? 'Editar Acción' : 'Nueva Acción'}
          </DialogTitle>
          <DialogDescription>
            Configurar acción de tipo: <strong>{getTipoAccionLabel(accion.tipo)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Título de la acción */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título de la Acción *</Label>
            <Input
              id="titulo"
              value={accionEditada.titulo}
              onChange={(e) => setAccionEditada({ ...accionEditada, titulo: e.target.value })}
              placeholder="Ej: Completa tus datos personales"
            />
          </div>

          {/* Configuración específica según tipo */}
          {accionEditada.tipo === 'rellenar_campos' && (
            <ConfigRellenarCampos
              config={accionEditada.config}
              onChange={(config) => setAccionEditada({ ...accionEditada, config })}
            />
          )}

          {accionEditada.tipo === 'compartir_docs' && (
            <ConfigCompartirDocs
              config={accionEditada.config}
              onChange={(config) => setAccionEditada({ ...accionEditada, config })}
            />
          )}

          {accionEditada.tipo === 'solicitar_docs' && (
            <ConfigSolicitarDocs
              config={accionEditada.config}
              onChange={(config) => setAccionEditada({ ...accionEditada, config })}
            />
          )}

          {accionEditada.tipo === 'solicitar_firma' && (
            <ConfigSolicitarFirma
              config={accionEditada.config}
              onChange={(config) => setAccionEditada({ ...accionEditada, config })}
            />
          )}

          {/* Errores */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800 mb-2">Errores de validación:</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
