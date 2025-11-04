'use client';

// ========================================
// Onboarding Form - Multi-Step Employee Data Collection
// ========================================

import { useState, useEffect } from 'react';
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
import { Empleado } from '@prisma/client';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { DatosTemporales, ProgresoOnboarding } from '@/lib/onboarding';
import { DocumentUploader } from '@/components/shared/document-uploader';
import { DocumentList } from '@/components/shared/document-list';

interface OnboardingFormProps {
  token: string;
  empleado: Empleado;
  progreso: ProgresoOnboarding;
  datosTemporales: DatosTemporales | null;
}

type Paso = 1 | 2 | 3;

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
};

// Función helper para obtener el label de un campo
function getCampoLabel(campo: string): string {
  return campoLabels[campo] || campo.replace(/([A-Z])/g, ' $1').trim();
}

export function OnboardingForm({
  token,
  empleado,
  progreso: progresoInicial,
  datosTemporales: datosInicial,
}: OnboardingFormProps) {
  // Estado del formulario
  const [pasoActual, setPasoActual] = useState<Paso>(
    progresoInicial.datos_documentos ? 3 : progresoInicial.datos_bancarios ? 2 : progresoInicial.datos_personales ? 2 : 1
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState('');

  // Paso 3: Documentos
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [documentosRequeridos, setDocumentosRequeridos] = useState<any[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);

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

  // Validación en tiempo real para IBAN (calculado directamente, no en useEffect)
  const ibanValido = (() => {
    if (datosBancarios.iban.length >= 24) {
      // Validación básica de formato español
      const regexIBAN = /^ES\d{22}$/i;
      return regexIBAN.test(datosBancarios.iban.replace(/\s/g, ''));
    }
    return null;
  })();

  // Cargar documentos y configuración cuando se llega al paso 3
  useEffect(() => {
    if (pasoActual === 3) {
      cargarDocumentosYConfiguracion();
    }
  }, [pasoActual]);

  const cargarDocumentosYConfiguracion = async () => {
    setLoadingDocumentos(true);
    try {
      // Cargar configuración de documentos requeridos (usando token de onboarding)
      const configRes = await fetch(`/api/onboarding/${token}/config`);
      const configData = await configRes.json();
      if (configData.success && configData.config) {
        setDocumentosRequeridos(configData.config.documentosRequeridos || []);
      }

      // Cargar documentos ya subidos
      const docsRes = await fetch(`/api/onboarding/${token}/documentos`);
      const docsData = await docsRes.json();
      if (docsData.success) {
        setDocumentos(docsData.documentos || []);
      }
    } catch (err) {
      console.error('[cargarDocumentosYConfiguracion] Error:', err);
    } finally {
      setLoadingDocumentos(false);
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

      // Verificar si la respuesta es JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[handleSubmitPaso1] Respuesta no JSON:', text);
        setError('Error inesperado del servidor. Inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('Datos personales guardados correctamente');
        setTimeout(() => {
          setPasoActual(2);
          setSuccess('');
        }, 800);
      } else {
        // Manejar errores de validación detallados
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
    setLoading(true);

    try {
      // Guardar datos bancarios
      const res = await fetch(`/api/onboarding/${token}/datos-bancarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosBancarios),
      });

      // Verificar si la respuesta es JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[handleSubmitPaso2] Respuesta no JSON:', text);
        setError('Error inesperado del servidor. Inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Error al guardar datos bancarios');
        if (data.details) {
          console.error('Validation errors:', data.details);
        }
        setLoading(false);
        return;
      }

      // Avanzar al paso 3 (documentos)
      setSuccess('Datos bancarios guardados correctamente');
      setTimeout(() => {
        setPasoActual(3);
        setSuccess('');
      }, 800);
      setLoading(false);
    } catch (err) {
      console.error('[handleSubmitPaso2] Error:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const handleUploadDocumento = async (file: File, tipoDocumento: string, nombreDocumento: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipoDocumento', tipoDocumento);
      formData.append('nombreDocumento', nombreDocumento);

      const res = await fetch(`/api/onboarding/${token}/documentos`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('Documento subido correctamente');
        await cargarDocumentosYConfiguracion();
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
      const res = await fetch(`/api/onboarding/${token}/finalizar`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess('¡Onboarding completado! Redirigiendo...');
        setTimeout(() => {
          window.location.href = '/login?onboarding=success';
        }, 2000);
      } else {
        setError(data.error || 'Error al finalizar onboarding');
        setLoading(false);
      }
    } catch (err) {
      console.error('[handleFinalizarOnboarding] Error:', err);
      setError('Error de conexión. Inténtalo de nuevo.');
      setLoading(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">
          Bienvenido/a, {empleado.nombre}!
        </h1>
        <p className="text-gray-500">
          Completa tus datos para finalizar tu alta
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-2">
        {/* Paso 1 */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            pasoActual === 1
              ? 'bg-primary text-white'
              : progresoInicial.datos_personales
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {progresoInicial.datos_personales ? (
            <Check className="h-5 w-5" />
          ) : (
            '1'
          )}
        </div>
        <div className="h-1 w-12 bg-gray-200">
          <div
            className={`h-full transition-all ${
              pasoActual >= 2 || progresoInicial.datos_bancarios
                ? 'w-full bg-primary'
                : 'w-0'
            }`}
          />
        </div>
        {/* Paso 2 */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            pasoActual === 2
              ? 'bg-primary text-white'
              : progresoInicial.datos_bancarios
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {progresoInicial.datos_bancarios ? (
            <Check className="h-5 w-5" />
          ) : (
            '2'
          )}
        </div>
        <div className="h-1 w-12 bg-gray-200">
          <div
            className={`h-full transition-all ${
              pasoActual === 3 || progresoInicial.datos_documentos
                ? 'w-full bg-primary'
                : 'w-0'
            }`}
          />
        </div>
        {/* Paso 3 */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            pasoActual === 3
              ? 'bg-primary text-white'
              : progresoInicial.datos_documentos
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {progresoInicial.datos_documentos ? (
            <Check className="h-5 w-5" />
          ) : (
            '3'
          )}
        </div>
      </div>

      {/* Forms */}
      {pasoActual === 1 && (
        <form onSubmit={handleSubmitPaso1} className="space-y-4">
          <h2 className="text-xl font-semibold">Paso 1: Datos Personales</h2>

          {/* Identificación */}
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
                  setDatosPersonales({ ...datosPersonales, nif: e.target.value })
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

          {/* Contacto */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <div className="space-y-4">
            <h3 className="font-medium">Dirección</h3>
            
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

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !validarPaso1()}
          >
            {loading ? (
              'Guardando...'
            ) : (
              <>
                Siguiente <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}

      {pasoActual === 2 && (
        <form onSubmit={handleSubmitPaso2} className="space-y-4">
          <h2 className="text-xl font-semibold">Paso 2: Datos Bancarios</h2>

          <div className="space-y-2">
            <Label htmlFor="iban">
              IBAN <span className="text-red-500">*</span>
            </Label>
            <Input
              id="iban"
              placeholder="ES9121000418450200051332"
              value={datosBancarios.iban}
              onChange={(e) =>
                setDatosBancarios({
                  ...datosBancarios,
                  iban: e.target.value.toUpperCase(),
                })
              }
              required
              maxLength={24}
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
                IBAN inválido (formato español: ES + 22 dígitos)
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

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasoActual(1)}
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

      {pasoActual === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Paso 3: Documentos</h2>
          
          <p className="text-sm text-gray-600">
            Sube los documentos requeridos para completar tu onboarding
          </p>

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
                  {documentosRequeridos.map((docReq: any) => {
                    const docSubido = documentos.find(
                      (d) => d.tipoDocumento === docReq.id
                    );
                    
                    return (
                      <div key={docReq.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{docReq.nombre}</h4>
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
                          <DocumentUploader
                            onUpload={(file) => handleUploadDocumento(file, docReq.id, docReq.nombre)}
                            label=""
                            description="PDF, JPG o PNG (máx. 5MB)"
                          />
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
                  onClick={() => setPasoActual(2)}
                  disabled={loading}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                <Button
                  onClick={handleFinalizarOnboarding}
                  className="flex-1"
                  disabled={loading}
                >
                  {loading ? 'Finalizando...' : 'Finalizar Onboarding'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-center text-xs text-gray-500">
        * Campos obligatorios
      </p>
    </div>
  );
}
