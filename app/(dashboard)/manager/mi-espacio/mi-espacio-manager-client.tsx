// ========================================
// Mi Espacio Manager Client Component - Tabs Layout
// ========================================

'use client';

import { useState } from 'react';
import { Edit2, Flag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GeneralTab } from '@/components/shared/mi-espacio/general-tab';
import { FichajesTab } from '@/components/shared/mi-espacio/fichajes-tab';
import { ContratosTab } from '@/components/shared/mi-espacio/contratos-tab';
import { DocumentosTab } from '../../hr/mi-espacio/tabs/documentos-tab';
import { AusenciasTab } from '@/components/shared/mi-espacio/ausencias-tab';
import { getAvatarStyle } from '@/lib/design-system';
import { DenunciaDialog } from '@/components/empleado/denuncia-dialog';

interface MiEspacioManagerClientProps {
  empleado: any;
  usuario: any;
}

export function MiEspacioManagerClient({ empleado, usuario }: MiEspacioManagerClientProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [editingProfile, setEditingProfile] = useState(false);
  const [denunciaDialogOpen, setDenunciaDialogOpen] = useState(false);

  const getInitials = () => {
    return `${empleado.nombre.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase();
  };

  const avatarStyle = getAvatarStyle(`${empleado.nombre} ${empleado.apellidos}`);

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'ausencias', label: 'Ausencias' },
    { id: 'fichajes', label: 'Fichajes' },
    { id: 'contratos', label: 'Contratos' },
    { id: 'documentos', label: 'Documentos' },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header con avatar y nombre */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                {empleado.fotoUrl && <AvatarImage src={empleado.fotoUrl} />}
                <AvatarFallback
                  className="text-lg font-semibold uppercase"
                  style={avatarStyle}
                >
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => setEditingProfile(!editingProfile)}
                className="absolute -bottom-1 -right-1 bg-gray-900 text-white rounded-full p-1.5 hover:bg-gray-800 transition-colors"
                title="Editar foto de perfil"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {empleado.nombre} {empleado.apellidos}
              </h1>
              <p className="text-sm text-gray-500">{usuario.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Guardar - visible en General */}
            {activeTab === 'general' && (
              <Button
                onClick={() => {
                  const event = new CustomEvent('saveGeneral');
                  window.dispatchEvent(event);
                }}
              >
                Guardar cambios
              </Button>
            )}

            {/* Botón Canal de Denuncias */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDenunciaDialogOpen(true)}
              className="rounded-lg"
              title="Canal de denuncias"
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'general' && <GeneralTab empleado={empleado} usuario={usuario} rol="manager" />}
        {activeTab === 'ausencias' && <AusenciasTab empleadoId={empleado.id} />}
        {activeTab === 'fichajes' && <FichajesTab empleadoId={empleado.id} empleado={empleado} />}
        {activeTab === 'contratos' && <ContratosTab empleado={empleado} rol="manager" />}
        {activeTab === 'documentos' && <DocumentosTab empleado={empleado} />}
      </div>

      {/* Dialog de Denuncias */}
      <DenunciaDialog
        isOpen={denunciaDialogOpen}
        onClose={() => setDenunciaDialogOpen(false)}
      />
    </div>
  );
}
