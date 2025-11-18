'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2 } from 'lucide-react';
import { toast } from 'sonner';

interface AvatarEditButtonProps {
  empleadoId: string;
}

export function AvatarEditButton({ empleadoId }: AvatarEditButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Solo JPG, PNG o WEBP.');
      return;
    }

    // Validar tamaño (2MB máximo)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 2MB.');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/empleados/${empleadoId}/avatar`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir el avatar');
      }

      toast.success('Avatar actualizado correctamente');
      router.refresh();
    } catch (error) {
      console.error('[AvatarEditButton] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Error al subir el avatar');
    } finally {
      setIsUploading(false);
      // Resetear el input para permitir seleccionar el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isUploading}
        className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        title="Editar avatar"
        aria-label="Editar avatar"
      >
        {isUploading ? (
          <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Edit2 className="h-3 w-3" />
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Seleccionar imagen de avatar"
      />
    </>
  );
}

