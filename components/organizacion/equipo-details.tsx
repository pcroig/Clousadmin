// ========================================
// Equipo Details Component
// ========================================

'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Users, User, Pencil, Trash2, MapPin } from 'lucide-react';
import { getInitials } from '@/components/shared/utils';
import { getAvatarStyle } from '@/lib/design-system';
import { EquipoFormModal } from './equipo-form-modal';
import { ManageMembersModal } from './manage-members-modal';
import { ChangeManagerModal } from './change-manager-modal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EquipoDetailsProps {
  equipo: {
    id: string;
    nombre: string;
    descripcion: string;
    responsable: string;
    responsableId: string | null;
    numeroEmpleados: number;
    empleados: {
      id: string;
      nombre: string;
      avatar?: string | null;
      fotoUrl?: string | null;
    }[];
    sede?: {
      id: string;
      nombre: string;
      ciudad?: string;
    } | null;
    sedeId?: string | null;
  };
  onUpdate: () => void;
  onDelete: () => void;
}

export function EquipoDetails({ equipo, onUpdate, onDelete }: EquipoDetailsProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/equipos/${equipo.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar equipo');
      }

      toast.success('Equipo eliminado');
      onDelete();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar equipo');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-6 border-b border-gray-200">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">{equipo.nombre}</h3>
                  <p className="text-sm text-gray-500">{equipo.numeroEmpleados} miembros</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowEditModal(true)}
                  className="flex-shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          {equipo.descripcion && (
            <p className="text-sm text-gray-600">{equipo.descripcion}</p>
          )}
          {equipo.sede && (
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>
                {equipo.sede.nombre}
                {equipo.sede.ciudad && ` - ${equipo.sede.ciudad}`}
              </span>
            </div>
          )}
        </div>

        {/* Responsable */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Responsable
            </h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowManagerModal(true)}
              className="h-7"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Cambiar
            </Button>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <User className="w-4 h-4 text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium">{equipo.responsable}</p>
            </div>
          </div>
        </div>

        {/* Miembros del Equipo */}
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Miembros ({equipo.numeroEmpleados})
            </h4>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowMembersModal(true)}
              className="h-7"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>

          <div className="space-y-2">
            {equipo.empleados.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No hay miembros en este equipo
              </p>
            ) : (
              equipo.empleados.map((empleado) => {
                const avatarStyle = getAvatarStyle(empleado.nombre);
                const fotoUrl = empleado.fotoUrl ?? empleado.avatar ?? undefined;

                return (
                  <div
                    key={empleado.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Avatar className="h-9 w-9">
                      {fotoUrl && <AvatarImage src={fotoUrl} />}
                      <AvatarFallback
                        className="text-xs font-semibold uppercase"
                        style={avatarStyle}
                      >
                        {getInitials(empleado.nombre)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{empleado.nombre}</p>
                    </div>
                    {empleado.id === equipo.responsableId && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                        Responsable
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Delete Team */}
        <div className="pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Equipo
          </Button>
        </div>
      </div>

      {/* Modals */}
      <EquipoFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={onUpdate}
        team={{
          id: equipo.id,
          nombre: equipo.nombre,
          descripcion: equipo.descripcion || null,
          sedeId: equipo.sedeId || null,
        }}
      />

      <ManageMembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        onSuccess={onUpdate}
        teamId={equipo.id}
        currentMembers={equipo.empleados}
      />

      <ChangeManagerModal
        isOpen={showManagerModal}
        onClose={() => setShowManagerModal(false)}
        onSuccess={onUpdate}
        teamId={equipo.id}
        currentManagerId={equipo.responsableId}
        members={equipo.empleados}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el equipo "{equipo.nombre}" y se
              removerá la relación con todos sus miembros. Los empleados no serán eliminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting ? 'Eliminando...' : 'Eliminar Equipo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
