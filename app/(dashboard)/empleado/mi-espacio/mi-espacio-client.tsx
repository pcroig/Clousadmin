// ========================================
// Mi Espacio Client Component - Tabs Layout
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { User, Edit2, Flag } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GeneralTab } from '@/components/shared/mi-espacio/general-tab';
import { AusenciasTab } from '@/components/shared/mi-espacio/ausencias-tab';
import { FichajesTab } from './tabs/fichajes-tab';
import { ContratosTab } from '../../hr/mi-espacio/tabs/contratos-tab';
import { DocumentosTab } from '../../hr/mi-espacio/tabs/documentos-tab';
import { getAvatarStyle } from '@/lib/design-system';
import { DenunciaDialog } from '@/components/empleado/denuncia-dialog';

interface MiEspacioClientProps {
  empleado: any;
  usuario: any;
}

export function MiEspacioClient({ empleado, usuario }: MiEspacioClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabFromUrl = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [editingProfile, setEditingProfile] = useState(false);
  const [denunciaDialogOpen, setDenunciaDialogOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab') || 'general');
    }
  }, [searchParams]);

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
                className="absolute -bottom-1 -right-1 text-gray-600 hover:text-[#c6613f] transition-colors p-1"
                title="Editar foto de perfil"
              >
                <Edit2 className="w-4 h-4" />
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
            onClick={() => {
              setActiveTab(tab.id);
              router.push(`/empleado/mi-espacio?tab=${tab.id}`);
            }}
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
        {activeTab === 'general' && <GeneralTab empleado={empleado} usuario={usuario} rol="empleado" />}
        {activeTab === 'ausencias' && <AusenciasTab empleadoId={empleado.id} />}
        {activeTab === 'fichajes' && <FichajesTab empleadoId={empleado.id} />}
        {activeTab === 'contratos' && <ContratosTab empleado={empleado} rol="empleado" />}
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
