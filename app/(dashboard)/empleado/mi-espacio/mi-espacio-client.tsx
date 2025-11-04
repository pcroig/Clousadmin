// ========================================
// Mi Espacio Client Component - Tabs Layout
// ========================================

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { User, Edit2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GeneralTab } from '../../hr/mi-espacio/tabs/general-tab';
import { AusenciasTab } from './tabs/ausencias-tab';
import { FichajesTab } from './tabs/fichajes-tab';
import { ContratosTab } from '../../hr/mi-espacio/tabs/contratos-tab';
import { DocumentosTab } from '../../hr/mi-espacio/tabs/documentos-tab';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/shared/loading-button';

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
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab') || 'general';
    setActiveTab(tab);
  }, [searchParams]);

  const getInitials = () => {
    return `${empleado.nombre.charAt(0)}${empleado.apellidos.charAt(0)}`.toUpperCase();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Solo JPG, PNG y WEBP');
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 2MB');
      return;
    }

    setSelectedFile(file);
    
    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    setShowAvatarDialog(true);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/empleados/${empleado.id}/avatar`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Avatar actualizado correctamente');
        setShowAvatarDialog(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        window.location.reload();
      } else {
        toast.error('Error al subir avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir avatar');
    } finally {
      setUploadingAvatar(false);
    }
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
              <input
                type="file"
                id="avatar-upload"
                className="hidden"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => document.getElementById('avatar-upload')?.click()}
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
        {activeTab === 'contratos' && <ContratosTab empleado={empleado} />}
        {activeTab === 'documentos' && <DocumentosTab empleado={empleado} />}
      </div>

      {/* Dialog para cambiar avatar */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Foto de Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="flex justify-center">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={previewUrl} />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </div>
            )}
            <p className="text-sm text-gray-500 text-center">
              Tamaño máximo: 2MB. Formatos permitidos: JPG, PNG, WEBP
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAvatarDialog(false);
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              disabled={uploadingAvatar}
            >
              Cancelar
            </Button>
            <LoadingButton onClick={handleUploadAvatar} loading={uploadingAvatar}>
              Guardar Foto
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
