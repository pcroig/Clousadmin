'use client';

// ========================================
// Onboarding Form - Multi-Step Employee Data Collection
// ========================================

import { Empleado } from '@prisma/client';
import { ChevronLeft, ChevronRight, Upload, User } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PWAExplicacion } from '@/components/onboarding/pwa-explicacion';
import { DocumentList, type DocumentListItem } from '@/components/shared/document-list';
import { DocumentUploader } from '@/components/shared/document-uploader';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAvatarStyle } from '@/lib/design-system';
import { validarIBAN } from '@/lib/validaciones/iban';

import type { DatosTemporales, ProgresoOnboarding } from '@/lib/onboarding';
import type { DocumentoRequerido as ConfigDocumentoRequerido, OnboardingConfigData } from '@/lib/onboarding-config';

interface OnboardingFormProps {
  token: string;
  empleado: Empleado;
  progreso: ProgresoOnboarding;
  datosTemporales: DatosTemporales | null;
  nombreEmpresa: string;
  tipoOnboarding: string;
  onboardingConfig?: OnboardingConfigData | null;
}

type PasoClave = 'credenciales' | 'datosPersonales' | 'datosBancarios' | 'documentos' | 'pwa';

interface DocumentoOnboarding extends DocumentListItem {
  url?: string;
}

type DocumentoRequeridoUI = ConfigDocumentoRequerido & {
  descripcion?: string;
  carpetaDestino?: string | null;
};

// Mapeo de nombres de campos a etiquetas en español
const campoLabels: Record<string, string> = {
  nif: 'NIF/NIE',
  nss: 'Número de Seguridad Social',
  telefono: 'Teléfono',
  direccionCalle: 'Calle',
  direccionNumero: 'Número',
  direccionPiso: 'Piso/Puerta',
  codigoPostal: 'Código Postal',
  ciudad: 'Ciudad',
  direccionProvincia: 'Provincia',
  estadoCivil: 'Estado Civil',
  numeroHijos: 'Número de Hijos',
  iban: 'IBAN',
  titularCuenta: 'Titular de la cuenta',
};

// Función helper para obtener el label de un campo
function getCampoLabel(campo: string): string {
  return campoLabels[campo] || campo.replace(/([A-Z])/g, ' $1').trim();
}

function mapDocumentosConfig(
  docs?: ConfigDocumentoRequerido[] | null
): DocumentoRequeridoUI[] {
  if (!docs) return [];

  return docs.map((doc) => {
    const descriptor = doc as ConfigDocumentoRequerido & {
      descripcion?: string | null;
      carpetaDestino?: string | null;
    };
    return {
      ...doc,
      // Normalizamos a string | undefined para alinear con el contrato de ConfigDocumentoRequerido
      descripcion: descriptor.descripcion ?? undefined,
      carpetaDestino: descriptor.carpetaDestino ?? 'Otros',
    };
  });
}

function shouldShowDocumentStep(
  docsRequeridos: DocumentoRequeridoUI[],
  docsSubidos?: DocumentoOnboarding[]
) {
  return docsRequeridos.length > 0 || (docsSubidos && docsSubidos.length > 0);
}

function documentoCumpleRequerimiento(
  documento: DocumentoOnboarding,
  requerimiento: DocumentoRequeridoUI
) {
  const reqId = requerimiento.id.toLowerCase();
  if (documento.tipoDocumento && documento.tipoDocumento.toLowerCase() === reqId) {
    return true;
  }

  if (documento.nombre && documento.nombre.toLowerCase() === requerimiento.nombre.toLowerCase()) {
    return true;
  }

  if (documento.s3Key) {
    const keySegment = documento.s3Key.split('/').pop() || '';
    const slug = keySegment.split('-')[0]?.toLowerCase();
    if (slug === reqId) {
      return true;
    }
  }

  return false;
}

export function OnboardingForm({
  token,
  empleado,
  progreso: progresoInicial,
  datosTemporales: datosInicial,
  nombreEmpresa,
  tipoOnboarding,
  onboardingConfig = null,
}: OnboardingFormProps) {
  // Determinar si es onboarding simplificado (empleado importado)
  const esSimplificado = tipoOnboarding === 'simplificado';

  const documentosConfigIniciales = useMemo(
    () => mapDocumentosConfig(onboardingConfig?.documentosRequeridos ?? []),
    [onboardingConfig?.documentosRequeridos]
  );

  const obtenerPasoInicial = (): PasoClave => {
    if (!progresoInicial.credenciales_completadas) {
      return 'credenciales';
    }

    if (esSimplificado) {
      return 'pwa';
    }

    if ('datos_personales' in progresoInicial && !progresoInicial.datos_personales) {
      return 'datosPersonales';
    }

    if ('datos_bancarios' in progresoInicial && !progresoInicial.datos_bancarios) {
      return 'datosBancarios';
    }

    if ('datos_documentos' in progresoInicial && !progresoInicial.datos_documentos) {
      return 'documentos';
    }

    if (!progresoInicial.pwa_explicacion) {
      return 'pwa';
    }

    return 'pwa';
  };

  // Estado del formulario
  const [pasoActual, setPasoActual] = useState<PasoClave>(() => obtenerPasoInicial());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState('');

  // Paso 0: Credenciales
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(empleado.fotoUrl || null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarStyle = getAvatarStyle(`${empleado.nombre} ${empleado.apellidos || ''}`);

  // Paso 3: Documentos
  const [documentos, setDocumentos] = useState<DocumentoOnboarding[]>([]);
  const [documentosRequeridos, setDocumentosRequeridos] = useState<DocumentoRequeridoUI[]>(
    documentosConfigIniciales
  );
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [requiereDocumentos, setRequiereDocumentos] = useState(
    () => !esSimplificado && shouldShowDocumentStep(documentosConfigIniciales)
  );

  // Paso 1: Datos Personales
  const [datosPersonales, setDatosPersonales] = useState({
    nif: datosInicial?.datos_personales?.nif || '',
    nss: datosInicial?.datos_personales?.nss || '',
    telefono: datosInicial?.datos_personales?.telefono || '',
    direccionCalle: datosInicial?.datos_personales?.direccionCalle || '',
    direccionNumero: datosInicial?.datos_personales?.direccionNumero || '',
    direccionPiso: datosInicial?.datos_personales?.direccionPiso || '',
    codigoPostal: datosInicial?.datos_personales?.codigoPostal || '',
    ciudad: datosInicial?.datos_personales?.ciudad || '',
    direccionProvincia: datosInicial?.datos_personales?.direccionProvincia || '',
    estadoCivil: datosInicial?.datos_personales?.estadoCivil || '',
    numeroHijos: datosInicial?.datos_personales?.numeroHijos || 0,
  });

  // Paso 2: Datos Bancarios
  const [datosBancarios, setDatosBancarios] = useState({
    iban: datosInicial?.datos_bancarios?.iban || '',
    titularCuenta: datosInicial?.datos_bancarios?.titularCuenta || '',
  });

  // Validación en tiempo real para IBAN
  const ibanValido = (() => {
    if (!datosBancarios.iban) return null;
    // Limpiar espacios para contar caracteres reales
    const ibanLimpio = datosBancarios.iban.trim().toUpperCase().replace(/\s/g, '');
    if (ibanLimpio.length >= 24) {
      return validarIBAN(datosBancarios.iban);
    }
    return null;
  })();

  useEffect(() => {
    setDocumentosRequeridos(documentosConfigIniciales);
  }, [documentosConfigIniciales]);

  useEffect(() => {
    setRequiereDocumentos(
      !esSimplificado && shouldShowDocumentStep(documentosRequeridos, documentos)
    );
  }, [documentosRequeridos, documentos, esSimplificado]);

  useEffect(() => {
    if (pasoActual === 'documentos' && !requiereDocumentos) {
      setPasoActual('pwa');
    }
  }, [pasoActual, requiereDocumentos]);

  const pasosSecuencia = useMemo<PasoClave[]>(() => {
    if (esSimplificado) {
      return ['credenciales', 'pwa'];
    }
    const base: PasoClave[] = ['credenciales', 'datosPersonales', 'datosBancarios'];
    if (requiereDocumentos) {
      base.push('documentos');
    }
    base.push('pwa');
    return base;
  }, [esSimplificado, requiereDocumentos]);

  const pasoActualIndex = useMemo(() => {
    const index = pasosSecuencia.indexOf(pasoActual);
    return index === -1 ? 0 : index;
  }, [pasoActual, pasosSecuencia]);

  const avanzarPaso = useCallback(() => {
    setPasoActual((current) => {
      const currentIndex = pasosSecuencia.indexOf(current);
      const nextIndex = Math.min(currentIndex + 1, pasosSecuencia.length - 1);
      return pasosSecuencia[nextIndex] ?? current;
    });
  }, [pasosSecuencia]);

  const retrocederPaso = useCallback(() => {
    setPasoActual((current) => {
      const currentIndex = pasosSecuencia.indexOf(current);
      const prevIndex = Math.max(currentIndex - 1, 0);
      return pasosSecuencia[prevIndex] ?? current;
    });
  }, [pasosSecuencia]);

  const _irAPaso = useCallback(
    (destino: PasoClave) => {
      if (!pasosSecuencia.includes(destino)) {
        return;
      }
      setPasoActual(destino);
    },
    [pasosSecuencia]
  );

  // Manejar selección de avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecciona una imagen');
        return;
      }
      // Validar tamaño (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen no puede superar 2MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchOnboardingConfig = useCallback(async () => {
    try {
      const configRes = await fetch(`/api/onboarding/${token}/config`);
      const configData = await configRes.json() as Record<string, unknown>;
      if (configData.success && configData.config && typeof configData.config === 'object') {
        const config = configData.config as Record<string, unknown>;
        setDocumentosRequeridos(
          mapDocumentosConfig((config.documentosRequeridos as ConfigDocumentoRequerido[] | null) || null)
        );
      }
    } catch (err) {
      console.error('[fetchOnboardingConfig] Error:', err);
    }
  }, [token]);

  const cargarDocumentos = useCallback(async () => {
    setLoadingDocumentos(true);
    try {
      const docsRes = await fetch(`/api/onboarding/${token}/documentos`);
      const docsData = await docsRes.json() as Record<string, unknown>;
      if (docsData.success) {
        setDocumentos(docsData.documentos || []);
      } else {
        console.error('[cargarDocumentos] Error:', docsData.error);
      }
    } catch (err) {
      console.error('[cargarDocumentos] Error:', err);
    } finally {
      setLoadingDocumentos(false);
    }
  }, [token]);

  useEffect(() => {
    if (!onboardingConfig) {
      fetchOnboardingConfig();
    }
  }, [onboardingConfig, fetchOnboardingConfig]);

  // Cargar documentos y configuración cuando se llega al paso 3
  useEffect(() => {
    if (pasoActual === 'documentos') {
      cargarDocumentos();
    }
  }, [pasoActual, cargarDocumentos]);

  const handleSubmitPaso0 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetails({});
    
    // Validaciones
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

      const res = await fetch(`/api/onboarding/${token}/credenciales`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json() as Record<string, unknown>;

      if (res.ok && data.success) {
        setSuccess('Credenciales guardadas correctamente');
        setLoading(false);
        setTimeout(() => {
          avanzarPaso();
          setSuccess('');
        }, 800);
      } else {
        // Manejar errores de validación detallados
        if (data.details && typeof data.details === 'object' && Object.keys(data.details).length > 0) {
          setErrorDetails(data.details as Record<string, string[]>);
          // Construir mensaje de error más descriptivo
          const errores: string[] = [];
          Object.entries(data.details).forEach(([campo, mensajes]) => {
            if (Array.isArray(mensajes) && mensajes.length > 0) {
              mensajes
                .filter((mensaje): mensaje is string => typeof mensaje === 'string')
                .forEach((msg) => {
                if (campo === 'password') {
                  errores.push(`Contraseña: ${msg}`);
                } else if (campo === 'confirmPassword') {
                  errores.push(`Confirmación: ${msg}`);
                } else {
                  errores.push(msg);
                }
              });
            }
          });
          setError(errores.length > 0 ? errores.join('. ') : 'Por favor, corrige los errores indicados');
        } else {
          setError(data.error || 'Error al guardar credenciales');
          setErrorDetails({});
        }
      }
    } catch (err) {
      console.error('[handleSubmitPaso0] Error:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const handleSubmitPaso1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetails({});
    setLoading(true);

    try {
      const res = await fetch(`/api/onboarding/${token}/datos-personales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPersonales),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[handleSubmitPaso1] Respuesta no JSON:', text);
        setError('Error inesperado del servidor. Inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      const data = await res.json() as Record<string, unknown>;

      if (res.ok && data.success) {
        setSuccess('Datos personales guardados correctamente');
        setLoading(false);
        setTimeout(() => {
          avanzarPaso();
          setSuccess('');
        }, 800);
      } else {
        if (data.details && typeof data.details === 'object' && Object.keys(data.details).length > 0) {
          setErrorDetails(data.details as Record<string, string[]>);
          setError('Por favor, corrige los errores en los campos indicados');
        } else {
          setError(data.error || 'Error al guardar datos personales');
          setErrorDetails({});
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('[handleSubmitPaso1] Error:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const handleSubmitPaso2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorDetails({});
    setLoading(true);

    try {
      const res = await fetch(`/api/onboarding/${token}/datos-bancarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosBancarios),
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[handleSubmitPaso2] Respuesta no JSON:', text);
        setError('Error inesperado del servidor. Inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      const data = await res.json() as Record<string, unknown>;

      if (res.ok && data.success) {
        setSuccess('Datos bancarios guardados correctamente');
        setLoading(false);
        setTimeout(() => {
          avanzarPaso();
          setSuccess('');
        }, 800);
      } else {
        if (data.details && typeof data.details === 'object' && Object.keys(data.details).length > 0) {
          setErrorDetails(data.details as Record<string, string[]>);
          setError('Por favor, corrige los errores en los campos indicados');
        } else {
        setError(data.error || 'Error al guardar datos bancarios');
          setErrorDetails({});
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('[handleSubmitPaso2] Error:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
      }
  };

  const handleUploadDocumento = async (
    file: File,
    tipoDocumento: string,
    nombreDocumento: string,
    carpetaDestino?: string | null
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipoDocumento', tipoDocumento);
      formData.append('nombreDocumento', nombreDocumento);
      if (carpetaDestino) {
        formData.append('carpetaDestino', carpetaDestino);
      }

      const res = await fetch(`/api/onboarding/${token}/documentos`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json() as Record<string, unknown>;

      if (data.success) {
        setSuccess('Documento subido correctamente');
        await cargarDocumentos();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Error al subir documento');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('[handleUploadDocumento] Error:', err);
      throw new Error('Error al subir el documento');
    }
  };

  const handleFinalizarOnboarding = async () => {
    setLoading(true);
    setError('');

    try {
      // Primero marcar PWA como completado
      const pwaRes = await fetch(`/api/onboarding/${token}/pwa-completado`, {
        method: 'POST',
      });

      if (!pwaRes.ok) {
        const pwaData = await pwaRes.json() as Record<string, unknown>;
        throw new Error(pwaData.error || 'Error al marcar PWA como completado');
      }

      // Luego finalizar onboarding
      const res = await fetch(`/api/onboarding/${token}/finalizar`, {
        method: 'POST',
      });

      const data = await res.json() as Record<string, unknown>;

      if (res.ok && data.success) {
        setSuccess('¡Onboarding completado! Redirigiendo...');
        setLoading(false);
        setTimeout(() => {
          window.location.href = '/login?onboarding=success';
        }, 2000);
      } else {
        setError(data.error || 'Error al finalizar onboarding');
        setLoading(false);
      }
    } catch (err) {
      console.error('[handleFinalizarOnboarding] Error:', err);
      setError(err instanceof Error ? err.message : 'Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const validarPaso0 = () => {
    return password.length >= 8 && password === confirmPassword;
  };

  const validarPaso1 = () => {
    return (
      datosPersonales.nif &&
      datosPersonales.nss &&
      datosPersonales.telefono &&
      datosPersonales.direccionCalle &&
      datosPersonales.direccionNumero &&
      datosPersonales.codigoPostal &&
      datosPersonales.ciudad &&
      datosPersonales.direccionProvincia
    );
  };

  const validarPaso2 = () => {
    return datosBancarios.iban && datosBancarios.titularCuenta && ibanValido !== false;
  };

  // Stepper dinámico según los pasos habilitados
  const totalPasos = pasosSecuencia.length;
  const pasoActualNum = pasoActualIndex;

  // Títulos y descripciones por paso
  const pasoConfig: Record<
    PasoClave,
    {
      titulo: string;
      descripcion: string;
    }
  > = {
    credenciales: {
      titulo: `Bienvenido/a ${empleado.nombre} a ${nombreEmpresa}`,
      descripcion: 'Configura tu avatar y contraseña para acceder a tu cuenta',
    },
    datosPersonales: {
      titulo: 'Datos personales',
      descripcion: 'Completa tu información personal y de contacto',
    },
    datosBancarios: {
      titulo: 'Datos bancarios',
      descripcion: 'Introduce tu información bancaria para recibir la nómina',
    },
    documentos: {
      titulo: 'Documentos',
      descripcion: 'Sube los documentos solicitados por tu empresa',
    },
    pwa: {
      titulo: 'App móvil',
      descripcion: 'Instala Clousadmin en tu dispositivo para fichar y revisar tus datos',
    },
  };

  const configActual = pasoConfig[pasoActual];

  return (
    <div className="space-y-6">
      {/* Título y descripción */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{configActual.titulo}</h1>
        <p className="text-gray-500">{configActual.descripcion}</p>
      </div>

      {/* Stepper con líneas - debajo del título */}
      <div className="flex items-center gap-1">
        {[...Array(totalPasos)].map((_, index) => {
          // Un paso está completado si ya pasamos por él (index < pasoActual)
          const estaCompletado = index < pasoActualNum;
          // Gris oscuro si está completado o es el paso actual, gris claro si no
          const esActivoOCompletado = estaCompletado || index === pasoActualNum;
          
          return (
            <div key={index} className="flex-1">
              <div
                className={`h-1 transition-colors ${
                  esActivoOCompletado
                    ? 'bg-gray-600'
                    : 'bg-gray-200'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Paso 0: Credenciales */}
      {pasoActual === 'credenciales' && (
        <form onSubmit={handleSubmitPaso0} className="space-y-4">

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
              {Object.keys(errorDetails).length > 0 && (
                <ul className="list-disc list-inside space-y-1 mt-2">
                  {Object.entries(errorDetails).map(([campo, errores]) => {
                    if (Array.isArray(errores) && errores.length > 0) {
                      return errores.map((mensaje, index) => (
                        <li key={`${campo}-${index}`} className="text-sm text-red-700">
                          {campo === 'password' ? 'Contraseña: ' : campo === 'confirmPassword' ? 'Confirmación: ' : ''}
                          {mensaje}
                        </li>
                      ));
                    }
                    return null;
                  })}
                </ul>
              )}
      </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-3">
              <p className="text-sm text-green-600">{success}</p>
        </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !validarPaso0()}
          >
            {loading ? 'Guardando...' : (
              <>
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* Paso 1: Datos Personales */}
      {pasoActual === 'datosPersonales' && (
        <form onSubmit={handleSubmitPaso1} className="space-y-6">
          <div className="space-y-6">

          {/* Identificación */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Identificación</h3>
                <p className="text-sm text-gray-500">
                  Documento de identidad y número de la Seguridad Social
                </p>
              </div>
              <span className="text-xs text-gray-500">Obligatorio</span>
            </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nif">
                NIF/NIE <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nif"
                placeholder="12345678A"
                value={datosPersonales.nif}
                onChange={(e) =>
                  setDatosPersonales({
                    ...datosPersonales,
                    nif: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                  })
                }
                required
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nss">
                Número Seguridad Social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nss"
                placeholder="123456789012"
                value={datosPersonales.nss}
                onChange={(e) =>
                  setDatosPersonales({ ...datosPersonales, nss: e.target.value })
                }
                required
                maxLength={12}
              />
            </div>
          </div>
          </div>

          {/* Contacto */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Contacto</h3>
                <p className="text-sm text-gray-500">
                  Necesitamos tu teléfono para poder comunicarnos contigo
                </p>
              </div>
              <span className="text-xs text-gray-500">Obligatorio</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">
                Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="telefono"
                type="tel"
                placeholder="+34612345678"
                value={datosPersonales.telefono}
                onChange={(e) =>
                  setDatosPersonales({
                    ...datosPersonales,
                    telefono: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          {/* Dirección */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Dirección</h3>
                <p className="text-sm text-gray-500">
                  Domicilio fiscal para tu contrato y nómina
                </p>
              </div>
              <span className="text-xs text-gray-500">Obligatorio</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="direccionCalle">
                  Calle <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="direccionCalle"
                  placeholder="Calle Principal"
                  value={datosPersonales.direccionCalle}
                  onChange={(e) =>
                    setDatosPersonales({
                      ...datosPersonales,
                      direccionCalle: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccionNumero">
                  Número <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="direccionNumero"
                  placeholder="123"
                  value={datosPersonales.direccionNumero}
                  onChange={(e) =>
                    setDatosPersonales({
                      ...datosPersonales,
                      direccionNumero: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="direccionPiso">Piso/Puerta</Label>
                <Input
                  id="direccionPiso"
                  placeholder="1º A"
                  value={datosPersonales.direccionPiso}
                  onChange={(e) =>
                    setDatosPersonales({
                      ...datosPersonales,
                      direccionPiso: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigoPostal">
                  Código Postal <span className="text-red-500">*</span>
                </Label>
          <Input
                  id="codigoPostal"
                  placeholder="28001"
                  value={datosPersonales.codigoPostal}
                  onChange={(e) =>
                    setDatosPersonales({
                      ...datosPersonales,
                      codigoPostal: e.target.value,
                    })
                  }
            required
                  maxLength={5}
          />
        </div>

        <div className="space-y-2">
                <Label htmlFor="ciudad">
                  Ciudad <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ciudad"
                  placeholder="Madrid"
                  value={datosPersonales.ciudad}
                  onChange={(e) =>
                    setDatosPersonales({
                      ...datosPersonales,
                      ciudad: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccionProvincia">
                Provincia <span className="text-red-500">*</span>
              </Label>
              <Input
                id="direccionProvincia"
                placeholder="Madrid"
                value={datosPersonales.direccionProvincia}
                onChange={(e) =>
                  setDatosPersonales({
                    ...datosPersonales,
                    direccionProvincia: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          {/* Información familiar (opcional) */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Situación familiar</h3>
                <p className="text-sm text-gray-500">Opcional, nos ayuda a completar tu perfil</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="estadoCivil">Estado civil</Label>
              <Select
                value={datosPersonales.estadoCivil}
                onValueChange={(value) =>
                  setDatosPersonales({ ...datosPersonales, estadoCivil: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="soltero">Soltero/a</SelectItem>
                  <SelectItem value="casado">Casado/a</SelectItem>
                  <SelectItem value="divorciado">Divorciado/a</SelectItem>
                  <SelectItem value="viudo">Viudo/a</SelectItem>
                  <SelectItem value="pareja_hecho">Pareja de hecho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroHijos">Número de hijos</Label>
              <Input
                id="numeroHijos"
                type="number"
                min="0"
                max="20"
                value={datosPersonales.numeroHijos}
                onChange={(e) =>
                  setDatosPersonales({
                    ...datosPersonales,
                    numeroHijos: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          </div>

          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800 mb-2">{error}</p>
              {Object.keys(errorDetails).length > 0 && (
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(errorDetails).map(([campo, errores]) => {
                    if (Array.isArray(errores) && errores.length > 0) {
                      return errores.map((mensaje, index) => (
                        <li key={`${campo}-${index}`} className="text-sm text-red-700">
                          <span className="font-medium">{getCampoLabel(campo)}:</span> {mensaje}
                        </li>
                      ));
                    }
                    return null;
                  })}
                </ul>
              )}
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={retrocederPaso}
              disabled={loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
          <Button
            type="submit"
              className="flex-1"
            disabled={loading || !validarPaso1()}
          >
              {loading ? 'Guardando...' : (
              <>
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          </div>
        </form>
      )}

      {/* Paso 2: Datos Bancarios */}
      {pasoActual === 'datosBancarios' && (
        <form onSubmit={handleSubmitPaso2} className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="space-y-2">
              <Label htmlFor="iban">
                IBAN <span className="text-red-500">*</span>
              </Label>
              <Input
                id="iban"
                placeholder="ES91 2100 0418 4502 0005 1332"
                value={datosBancarios.iban}
                onChange={(e) =>
                  setDatosBancarios({
                    ...datosBancarios,
                    iban: e.target.value.toUpperCase(),
                  })
                }
                required
                maxLength={34}
                className={
                  ibanValido === false
                    ? 'border-red-500'
                    : ibanValido === true
                    ? 'border-green-500'
                    : ''
                }
              />
              {ibanValido === false && (
                <p className="text-xs text-red-600">
                  IBAN inválido. Verifica el formato (ES + 22 dígitos) y el checksum
                </p>
              )}
              {ibanValido === true && (
                <p className="text-xs text-green-600">IBAN válido ✓</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="titularCuenta">
                Titular de la cuenta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="titularCuenta"
                placeholder="Nombre completo del titular"
                value={datosBancarios.titularCuenta}
                onChange={(e) =>
                  setDatosBancarios({
                    ...datosBancarios,
                    titularCuenta: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm font-medium text-red-800 mb-2">{error}</p>
              {Object.keys(errorDetails).length > 0 && (
                <ul className="list-disc list-inside space-y-1">
                  {Object.entries(errorDetails).map(([campo, errores]) => {
                    if (Array.isArray(errores) && errores.length > 0) {
                      return errores.map((mensaje, index) => (
                        <li key={`${campo}-${index}`} className="text-sm text-red-700">
                          <span className="font-medium">{getCampoLabel(campo)}:</span> {mensaje}
                        </li>
                      ));
                    }
                    return null;
                  })}
                </ul>
              )}
          </div>
        )}

          {success && (
            <div className="rounded-md bg-green-50 p-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={retrocederPaso}
              disabled={loading}
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading || !validarPaso2()}
            >
              {loading ? 'Guardando...' : (
                <>
                  Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
        </Button>
          </div>
      </form>
      )}

      {/* Paso 3: Documentos */}
      {pasoActual === 'documentos' && (
        <div className="space-y-6">

          {loadingDocumentos ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Cargando documentos...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Lista de documentos requeridos */}
              {documentosRequeridos.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Documentos requeridos:</h3>
                  {documentosRequeridos.map((docReq: DocumentoRequeridoUI) => {
                    const docSubido = documentos.find((d) =>
                      documentoCumpleRequerimiento(d, docReq)
                    );
                    
                    return (
                      <div key={docReq.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{docReq.nombre}</h4>
                              {docReq.requerido && (
                                <span className="text-xs font-semibold uppercase text-red-600">
                                  Obligatorio
                                </span>
                              )}
                            </div>
                            {docReq.descripcion && (
                              <p className="text-sm text-gray-600">
                                {docReq.descripcion}
                              </p>
                            )}
                          </div>
                          {docSubido && (
                            <span className="text-sm text-green-600 font-medium">
                              ✓ Subido
                            </span>
                          )}
                        </div>
                        
                        {!docSubido ? (
                          <>
                            <DocumentUploader
                              onUpload={(file) =>
                                handleUploadDocumento(
                                  file,
                                  docReq.id,
                                  docReq.nombre,
                                  docReq.carpetaDestino
                                )
                              }
                              label=""
                              description="PDF, JPG o PNG (máx. 5MB)"
                            />
                            {docReq.carpetaDestino && (
                              <p className="text-xs text-gray-500 mt-2">
                                Se guardará en la carpeta &quot;{docReq.carpetaDestino}&quot;.
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <p className="text-sm text-green-800">
                              Documento subido correctamente
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Documentos ya subidos */}
              {documentos.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Documentos subidos:</h3>
                  <DocumentList
                    documentos={documentos}
                    onDownload={(doc) => {
                      if (doc.downloadUrl) {
                        window.open(doc.downloadUrl, '_blank');
                      }
                    }}
                    showActions={{ download: true, view: true, delete: false }}
                  />
                </div>
              )}

              {documentosRequeridos.length === 0 && documentos.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No tienes documentos pendientes en este onboarding.
                </div>
              )}

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

              {/* Botones de navegación */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={retrocederPaso}
                  disabled={loading}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                <Button
                  onClick={avanzarPaso}
                  className="flex-1"
                  disabled={loading}
                >
                  Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Paso 4: PWA Explicación */}
      {pasoActual === 'pwa' && (
        <div className="space-y-6">
          <PWAExplicacion
            onComplete={handleFinalizarOnboarding}
            showCompleteButton={true}
            loading={loading}
          />

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
        </div>
      )}
    </div>
  );
}
