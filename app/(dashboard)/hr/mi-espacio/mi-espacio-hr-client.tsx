// ========================================
// Mi Espacio HR Client Component - Tabs Layout
// ========================================

'use client';

import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GeneralTab } from './tabs/general-tab';
import { AusenciasTab } from './tabs/ausencias-tab';
import { FichajesTab } from './tabs/fichajes-tab';
import { ContratosTab } from './tabs/contratos-tab';
import { DocumentosTab } from './tabs/documentos-tab';

interface MiEspacioHRClientProps {
  empleado: any;
  usuario: any;
}

export function MiEspacioHRClient({ empleado, usuario }: MiEspacioHRClientProps) {
  const [activeTab, setActiveTab] = useState('datos');
  const [editingProfile, setEditingProfile] = useState(false);

  const getInitials = () => {
    return `${empleado.nombre.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase();
  };

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
                <AvatarFallback className="bg-gray-900 text-white text-lg">
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
        {activeTab === 'general' && <GeneralTab empleado={empleado} usuario={usuario} />}
        {activeTab === 'ausencias' && <AusenciasTab empleadoId={empleado.id} />}
        {activeTab === 'fichajes' && <FichajesTab empleadoId={empleado.id} />}
        {activeTab === 'contratos' && <ContratosTab empleado={empleado} />}
        {activeTab === 'documentos' && <DocumentosTab empleado={empleado} />}
      </div>
    </div>
  );
}
