// ========================================
// Manage Team Members Modal
// ========================================

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/shared/loading-button';
import { toast } from 'sonner';
import { Search, UserPlus, X } from 'lucide-react';
import { getInitials } from '@/components/shared/utils';
import { getAvatarPlaceholderClasses } from '@/lib/design-system';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  nombre: string;
  apellidos: string;
  fotoUrl?: string | null;
  puesto?: string | null;
}

interface TeamMember {
  id: string;
  nombre: string;
  avatar?: string;
}

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teamId: string;
  currentMembers: TeamMember[];
}

export function ManageMembersModal({
  isOpen,
  onClose,
  onSuccess,
  teamId,
  currentMembers,
}: ManageMembersModalProps) {
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingEmployeeId, setLoadingEmployeeId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAvailableEmployees();
      setSearchTerm('');
    }
  }, [isOpen, teamId]);

  const loadAvailableEmployees = async () => {
    try {
      const response = await fetch(`/api/equipos/${teamId}/available-members`);
      if (!response.ok) {
        throw new Error('Error al cargar empleados');
      }
      const data = await response.json();
      setAvailableEmployees(data);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Error al cargar empleados disponibles');
    }
  };

  const handleAddMember = async (empleadoId: string) => {
    setLoadingEmployeeId(empleadoId);
    try {
      const response = await fetch(`/api/equipos/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al añadir miembro');
      }

      toast.success('Miembro añadido al equipo');
      onSuccess();
      await loadAvailableEmployees(); // Reload available employees
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(error instanceof Error ? error.message : 'Error al añadir miembro');
    } finally {
      setLoadingEmployeeId(null);
    }
  };

  const handleRemoveMember = async (empleadoId: string) => {
    setRemovingMemberId(empleadoId);
    try {
      const response = await fetch(
        `/api/equipos/${teamId}/members?empleadoId=${empleadoId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar miembro');
      }

      toast.success('Miembro eliminado del equipo');
      onSuccess();
      await loadAvailableEmployees(); // Reload available employees
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar miembro');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const filteredEmployees = availableEmployees.filter((emp) =>
    `${emp.nombre} ${emp.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMembers = currentMembers.filter((member) =>
    member.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar Miembros del Equipo</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar empleados..."
            className="pl-9"
          />
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
          {/* Current Members */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-sm text-gray-900">
                Miembros Actuales ({filteredMembers.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  {searchTerm ? 'No se encontraron miembros' : 'No hay miembros en el equipo'}
                </p>
              ) : (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <Avatar className="h-8 w-8">
                      {member.avatar && <AvatarImage src={member.avatar} />}
                      <AvatarFallback
                        className={cn(
                          getAvatarPlaceholderClasses(member.nombre),
                          'text-xs font-medium'
                        )}
                      >
                        {getInitials(member.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.nombre}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMemberId === member.id}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Available Employees */}
          <div className="flex flex-col border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-semibold text-sm text-gray-900">
                Empleados Disponibles ({filteredEmployees.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredEmployees.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  {searchTerm
                    ? 'No se encontraron empleados'
                    : 'No hay empleados disponibles'}
                </p>
              ) : (
                filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <Avatar className="h-8 w-8">
                      {emp.fotoUrl && <AvatarImage src={emp.fotoUrl} />}
                      <AvatarFallback
                        className={cn(
                          getAvatarPlaceholderClasses(`${emp.nombre} ${emp.apellidos}`),
                          'text-xs font-medium'
                        )}
                      >
                        {getInitials(`${emp.nombre} ${emp.apellidos}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {emp.nombre} {emp.apellidos}
                      </p>
                      {emp.puesto && (
                        <p className="text-xs text-gray-500 truncate">{emp.puesto}</p>
                      )}
                    </div>
                    <LoadingButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAddMember(emp.id)}
                      loading={loadingEmployeeId === emp.id}
                      className="h-8 w-8 p-0"
                    >
                      <UserPlus className="h-4 w-4 text-green-600" />
                    </LoadingButton>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
