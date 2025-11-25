// ========================================
// Change Team Manager Modal
// ========================================

'use client';

import { Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { parseJson } from '@/lib/utils/json';

interface TeamMember {
  id: string;
  nombre: string;
  fotoUrl?: string | null;
}

interface ChangeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teamId: string;
  currentManagerId: string | null;
  members: TeamMember[];
}

export function ChangeManagerModal({
  isOpen,
  onClose,
  onSuccess,
  teamId,
  currentManagerId,
  members,
}: ChangeManagerModalProps) {
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(
    currentManagerId
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/equipos/${teamId}/manager`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: selectedManagerId }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response);
        throw new Error(error.error || 'Error al cambiar responsable');
      }

      toast.success('Responsable actualizado');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error changing manager:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cambiar responsable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar Responsable del Equipo</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {members.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">
                El equipo no tiene miembros. Añade miembros primero para asignar un
                responsable.
              </p>
            </div>
          ) : (
            <>
              {/* No Manager Option */}
              <button
                onClick={() => setSelectedManagerId(null)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  selectedManagerId === null
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">—</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900">Sin responsable</p>
                </div>
                {selectedManagerId === null && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </button>

              {/* Team Members */}
              {members.map((member) => {
                return (
                  <button
                    key={member.id}
                    onClick={() => setSelectedManagerId(member.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedManagerId === member.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <EmployeeAvatar
                      nombre={member.nombre}
                      fotoUrl={member.fotoUrl}
                      size="sm"
                    />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-900">{member.nombre}</p>
                    </div>
                    {selectedManagerId === member.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <LoadingButton
            onClick={handleSubmit}
            loading={loading}
            disabled={members.length === 0}
          >
            Guardar Cambios
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
