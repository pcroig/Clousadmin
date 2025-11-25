'use client';

import { ChevronRight, Upload, User } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAvatarStyle } from '@/lib/design-system';
import { parseJson } from '@/lib/utils/json';

export interface OnboardingEmpleado {
  nombre?: string;
  apellidos?: string;
  usuario?: { image?: string | null } | null;
  empresaId?: string;
  id?: string;
  [key: string]: unknown;
}

interface CredencialesFormProps {
  token: string;
  empleado: OnboardingEmpleado;
  onComplete: () => void;
  initialProgress?: boolean;
}

export function CredencialesForm({ token, empleado, onComplete, initialProgress = false }: CredencialesFormProps) {
  interface CredencialesResponse {
    success?: boolean;
    error?: string;
  }

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(empleado.usuario?.image || null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const avatarStyle = getAvatarStyle(`${empleado.nombre ?? ''} ${empleado.apellidos ?? ''}`);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecciona una imagen');
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setError('La imagen no puede superar 2MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await fetch(`/api/onboarding-simplificado/${token}/credenciales`, {
        method: 'POST',
        body: formData,
      });

      const data = await parseJson<CredencialesResponse>(res);

      if (res.ok && data.success) {
        setSuccess('Credenciales guardadas correctamente');
        toast.success('Credenciales guardadas correctamente');
        setTimeout(() => {
          onComplete();
        }, 800);
      } else {
        setError(data.error || 'Error al guardar credenciales');
        toast.error(data.error || 'Error al guardar credenciales');
      }
    } catch (err) {
      console.error('[CredencialesForm] Error:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
      toast.error('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const isValid = password.length >= 8 && password === confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="space-y-4">
        <Label>Avatar (opcional)</Label>
        <div className="flex items-center gap-4">
          <EmployeeAvatar
            nombre={empleado.nombre}
            apellidos={empleado.apellidos}
            fotoUrl={avatarPreview}
            size="xl"
            className="h-20 w-20"
            fallbackClassName="flex items-center justify-center"
            fallbackContent={<User className="h-10 w-10 opacity-70" />}
            fallbackStyle={avatarStyle}
          />
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => avatarInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {avatarFile ? 'Cambiar avatar' : 'Subir avatar'}
            </Button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            {avatarFile && (
              <p className="text-xs text-gray-500">{avatarFile.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contraseña */}
      <div className="space-y-2">
        <Label htmlFor="password">
          Contraseña <span className="text-red-500">*</span>
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">
          Confirmar contraseña <span className="text-red-500">*</span>
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          placeholder="Repite tu contraseña"
        />
        {password && confirmPassword && password !== confirmPassword && (
          <p className="text-xs text-red-600">Las contraseñas no coinciden</p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <LoadingButton
        type="submit"
        className="w-full"
        loading={loading}
        disabled={!isValid}
      >
        {initialProgress ? 'Actualizar y Continuar' : 'Siguiente'} <ChevronRight className="ml-2 h-4 w-4" />
      </LoadingButton>
    </form>
  );
}


