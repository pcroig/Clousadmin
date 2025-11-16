# 📦 Importación Masiva de Puestos de Trabajo desde ZIP

**Estado**: 🔜 Pendiente de Implementación  
**Versión**: 0.1.0 (Especificación)  
**Fecha de documentación**: 27 de Enero 2025

---

## 🎯 Resumen Ejecutivo

Funcionalidad para importar múltiples puestos de trabajo desde un archivo ZIP que contiene descripciones de puestos. El sistema detectará automáticamente si un puesto ya existe o debe ser creado, y asignará los documentos correspondientes a cada puesto.

---

## 📋 Requisitos Funcionales

### 1. Modal de Crear Puesto - Opción de Importar

**Ubicación**: `components/organizacion/puesto-form-modal.tsx`

**Modificaciones necesarias**:
- Añadir un botón/tab "Importar desde ZIP" junto al formulario manual
- Permitir seleccionar un archivo ZIP
- Mostrar progreso de importación
- Mostrar resumen de resultados (puestos creados, documentos asignados, errores)

### 2. Estructura del ZIP

El archivo ZIP debe contener:
- **Archivos PDF/DOCX**: Cada archivo representa la descripción de un puesto de trabajo
- **Nombres de archivo**: Se usarán como sugerencia para el nombre del puesto (pueden ser normalizados)
- **Formato permitido**: `.pdf`, `.docx`, `.doc`

**Ejemplo de estructura**:
```
puestos-importacion.zip
├── Desarrollador_Senior_Full_Stack.pdf
├── Gerente_de_Ventas.pdf
├── Analista_Funcional.docx
└── Diseñador_UX.pdf
```

### 3. Proceso de Clasificación

El sistema debe determinar si cada puesto:
- **Ya existe**: Buscar coincidencia por nombre (normalizado)
- **No existe**: Crear nuevo puesto

**Modelo de clasificación**:
- Usar **normalización de nombres** (lowercase, sin acentos, sin espacios extras)
- Comparar con puestos existentes en la empresa
- **Umbral de similitud**: Configurable (por defecto: 85% usando algoritmo de similitud de strings)
- Si existe coincidencia → Asignar documento al puesto existente
- Si no existe → Crear puesto y asignar documento

### 4. Extracción de Información con IA

**Usar OpenAI GPT-4 Vision** para extraer información de cada documento:
- **Nombre del puesto**: Extraído del documento
- **Descripción**: Extraída del documento (si está disponible)
- **Responsabilidades**: Extraídas (opcional)
- **Requisitos**: Extraídos (opcional)

**Flujo**:
1. Extraer texto/imagen del PDF/DOCX
2. Enviar a OpenAI GPT-4 Vision con prompt específico
3. Parsear respuesta JSON estructurada
4. Validar datos extraídos con Zod schema

---

## 🏗️ Arquitectura Técnica

### 1. Estructura de Archivos

```
app/api/puestos/importar-zip/
├── route.ts                    # Endpoint POST para procesar ZIP
lib/ia/
├── extraer-descripcion-puesto.ts  # Función para extraer info con IA
lib/puestos/
├── clasificar-puesto.ts          # Lógica de clasificación
├── normalizar-nombre-puesto.ts    # Normalización de nombres
└── procesar-zip-puestos.ts       # Procesamiento del ZIP
components/organizacion/
├── puesto-form-modal.tsx          # Modal actualizado con opción importar
└── importar-puestos-zip-modal.tsx # Nuevo modal para importación
```

### 2. Modelo de Datos

**No se requieren cambios en el schema de Prisma**:
- `Puesto` ya existe con `nombre`, `descripcion`, `empresaId`
- `Documento` ya tiene relación con `Puesto` via `puestoId`

**Estructura de respuesta de IA**:
```typescript
interface PuestoExtraido {
  nombre: string;              // Nombre del puesto
  descripcion?: string;        // Descripción completa
  responsabilidades?: string[]; // Array de responsabilidades
  requisitos?: string[];       // Array de requisitos
  nivelExperiencia?: string;   // "junior" | "mid" | "senior" | "lead"
  confianza: number;          // Score de confianza (0-1)
}
```

### 3. API Endpoint

**POST `/api/puestos/importar-zip`**

**Request**:
- `FormData` con:
  - `file`: Archivo ZIP (máximo 50MB)
  - `empresaId`: ID de la empresa (desde session)

**Response**:
```typescript
interface ImportacionResultado {
  exitosa: boolean;
  resumen: {
    totalArchivos: number;
    puestosCreados: number;
    puestosAsignados: number;
    documentosAsignados: number;
    errores: number;
  };
  detalles: Array<{
    nombreArchivo: string;
    estado: 'creado' | 'asignado' | 'error';
    puestoId?: string;
    puestoNombre?: string;
    error?: string;
  }>;
}
```

**Proceso**:
1. Validar ZIP (tamaño, formato)
2. Extraer archivos del ZIP en memoria temporal
3. Para cada archivo:
   - Extraer texto/imagen
   - Procesar con IA para obtener información del puesto
   - Normalizar nombre del puesto
   - Buscar puesto existente (normalizado)
   - Si existe → Asignar documento
   - Si no existe → Crear puesto + Asignar documento
4. Guardar documentos en Object Storage
5. Crear registros en base de datos
6. Retornar resumen

---

## 🔧 Implementación Detallada

### 1. Clasificación de Puestos

**Archivo**: `lib/puestos/clasificar-puesto.ts`

```typescript
import { prisma } from '@/lib/prisma';
import { normalizarNombrePuesto } from './normalizar-nombre-puesto';

interface ClasificacionResultado {
  existe: boolean;
  puestoId?: string;
  puestoNombre?: string;
  confianza: number; // 0-1
}

export async function clasificarPuesto(
  nombrePropuesto: string,
  empresaId: string
): Promise<ClasificacionResultado> {
  const nombreNormalizado = normalizarNombrePuesto(nombrePropuesto);
  
  // Buscar puestos existentes en la empresa
  const puestosExistentes = await prisma.puesto.findMany({
    where: {
      empresaId,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
    },
  });

  // Calcular similitud con cada puesto existente
  let mejorMatch: ClasificacionResultado = {
    existe: false,
    confianza: 0,
  };

  for (const puesto of puestosExistentes) {
    const nombreExistenteNormalizado = normalizarNombrePuesto(puesto.nombre);
    const similitud = calcularSimilitud(
      nombreNormalizado,
      nombreExistenteNormalizado
    );

    if (similitud > mejorMatch.confianza) {
      mejorMatch = {
        existe: similitud >= 0.85, // Umbral configurable
        puestoId: puesto.id,
        puestoNombre: puesto.nombre,
        confianza: similitud,
      };
    }
  }

  return mejorMatch;
}

// Algoritmo de similitud (Levenshtein normalizado)
function calcularSimilitud(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distancia = levenshteinDistance(str1, str2);
  return 1 - distancia / maxLen;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
```

### 2. Normalización de Nombres

**Archivo**: `lib/puestos/normalizar-nombre-puesto.ts`

```typescript
export function normalizarNombrePuesto(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD') // Normalizar acentos
    .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
    .replace(/[^a-z0-9\s]/g, '') // Eliminar caracteres especiales
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
}
```

### 3. Extracción con IA

**Archivo**: `lib/ia/extraer-descripcion-puesto.ts`

```typescript
import { openai } from '@/lib/openai';
import { z } from 'zod';

const puestoExtraidoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  responsabilidades: z.array(z.string()).optional(),
  requisitos: z.array(z.string()).optional(),
  nivelExperiencia: z.enum(['junior', 'mid', 'senior', 'lead']).optional(),
});

export type PuestoExtraido = z.infer<typeof puestoExtraidoSchema> & {
  confianza: number;
};

export async function extraerDescripcionPuesto(
  pdfBuffer: Buffer
): Promise<PuestoExtraido> {
  // Convertir PDF a base64 para GPT-4 Vision
  const base64Pdf = pdfBuffer.toString('base64');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'system',
        content: `Eres un asistente especializado en extraer información de descripciones de puestos de trabajo.
        Analiza el documento y extrae:
        - Nombre del puesto (obligatorio)
        - Descripción del puesto (si está disponible)
        - Responsabilidades principales (si están listadas)
        - Requisitos (si están listados)
        - Nivel de experiencia (junior, mid, senior, lead)
        
        Responde en formato JSON válido.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:application/pdf;base64,${base64Pdf}`,
            },
          },
          {
            type: 'text',
            text: 'Extrae la información del puesto de trabajo de este documento.',
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  });

  const contenido = response.choices[0].message.content;
  if (!contenido) {
    throw new Error('No se pudo extraer información del documento');
  }

  const datos = JSON.parse(contenido);
  const validado = puestoExtraidoSchema.parse(datos);

  // Calcular confianza basada en completitud de datos
  const confianza = calcularConfianza(validado);

  return {
    ...validado,
    confianza,
  };
}

function calcularConfianza(puesto: z.infer<typeof puestoExtraidoSchema>): number {
  let score = 0;
  let total = 0;

  // Nombre siempre presente (obligatorio)
  total += 1;
  score += puesto.nombre ? 1 : 0;

  // Descripción (opcional pero valiosa)
  if (puesto.descripcion) {
    total += 1;
    score += puesto.descripcion.length > 50 ? 1 : 0.5;
  }

  // Responsabilidades (opcional)
  if (puesto.responsabilidades && puesto.responsabilidades.length > 0) {
    total += 1;
    score += 1;
  }

  // Requisitos (opcional)
  if (puesto.requisitos && puesto.requisitos.length > 0) {
    total += 1;
    score += 1;
  }

  return total > 0 ? score / total : 0;
}
```

### 4. Procesamiento del ZIP

**Archivo**: `lib/puestos/procesar-zip-puestos.ts`

```typescript
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';
import { extraerDescripcionPuesto } from '@/lib/ia/extraer-descripcion-puesto';
import { clasificarPuesto } from './clasificar-puesto';

interface ArchivoProcesado {
  nombreArchivo: string;
  estado: 'creado' | 'asignado' | 'error';
  puestoId?: string;
  puestoNombre?: string;
  error?: string;
}

export async function procesarZipPuestos(
  zipBuffer: Buffer,
  empresaId: string
): Promise<{
  totalArchivos: number;
  puestosCreados: number;
  puestosAsignados: number;
  documentosAsignados: number;
  errores: number;
  detalles: ArchivoProcesado[];
}> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const archivos = Object.keys(zip.files).filter(
    (nombre) => !zip.files[nombre].dir
  );

  const detalles: ArchivoProcesado[] = [];
  let puestosCreados = 0;
  let puestosAsignados = 0;
  let documentosAsignados = 0;
  let errores = 0;

  // Procesar cada archivo del ZIP
  for (const nombreArchivo of archivos) {
    try {
      const archivo = zip.files[nombreArchivo];
      const buffer = await archivo.async('nodebuffer');

      // Validar tipo de archivo
      const extension = nombreArchivo.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'doc'].includes(extension || '')) {
        detalles.push({
          nombreArchivo,
          estado: 'error',
          error: 'Formato de archivo no soportado',
        });
        errores++;
        continue;
      }

      // Extraer información con IA
      const puestoExtraido = await extraerDescripcionPuesto(buffer);

      // Clasificar puesto (¿existe o crear nuevo?)
      const clasificacion = await clasificarPuesto(
        puestoExtraido.nombre,
        empresaId
      );

      let puestoId: string;

      if (clasificacion.existe && clasificacion.puestoId) {
        // Puesto existe → asignar documento
        puestoId = clasificacion.puestoId;
        puestosAsignados++;
      } else {
        // Puesto no existe → crear nuevo
        const nuevoPuesto = await prisma.puesto.create({
          data: {
            empresaId,
            nombre: puestoExtraido.nombre,
            descripcion: puestoExtraido.descripcion || null,
            activo: true,
          },
        });
        puestoId = nuevoPuesto.id;
        puestosCreados++;
      }

      // Subir documento a S3
      const s3Key = `puestos/${puestoId}/${Date.now()}-${nombreArchivo}`;
      await uploadToS3(buffer, s3Key, `application/${extension}`);

      // Crear registro de documento en BD
      await prisma.documento.create({
        data: {
          empresaId,
          puestoId,
          nombre: nombreArchivo,
          tipoDocumento: 'descripcion_puesto',
          mimeType: `application/${extension}`,
          tamano: buffer.length,
          s3Key,
          s3Bucket: process.env.AWS_S3_BUCKET || 'clousadmin-docs',
          procesadoIA: true,
          datosExtraidos: {
            ...puestoExtraido,
            confianza: puestoExtraido.confianza,
          },
        },
      });

      documentosAsignados++;
      detalles.push({
        nombreArchivo,
        estado: puestoId ? 'creado' : 'asignado',
        puestoId,
        puestoNombre: puestoExtraido.nombre,
      });
    } catch (error) {
      console.error(`Error procesando ${nombreArchivo}:`, error);
      detalles.push({
        nombreArchivo,
        estado: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      errores++;
    }
  }

  return {
    totalArchivos: archivos.length,
    puestosCreados,
    puestosAsignados,
    documentosAsignados,
    errores,
    detalles,
  };
}
```

### 5. API Route

**Archivo**: `app/api/puestos/importar-zip/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { procesarZipPuestos } from '@/lib/puestos/procesar-zip-puestos';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó un archivo ZIP' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    if (file.type !== 'application/zip' && !file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'El archivo debe ser un ZIP' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo ZIP es demasiado grande (máximo 50MB)' },
        { status: 400 }
      );
    }

    // Convertir a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Procesar ZIP
    const resultado = await procesarZipPuestos(
      buffer,
      session.user.empresaId
    );

    return NextResponse.json({
      exitosa: resultado.errores === 0,
      resumen: resultado,
      detalles: resultado.detalles,
    });
  } catch (error) {
    console.error('Error importando ZIP:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar el archivo ZIP',
        mensaje: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
```

### 6. Componente de UI

**Archivo**: `components/organizacion/importar-puestos-zip-modal.tsx`

```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { toast } from 'sonner';
import { Upload, FileZip, CheckCircle, XCircle } from 'lucide-react';

interface ImportarPuestosZipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportarPuestosZipModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportarPuestosZipModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/zip' || selectedFile.name.endsWith('.zip')) {
        setFile(selectedFile);
        setResultado(null);
      } else {
        toast.error('El archivo debe ser un ZIP');
        setFile(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Selecciona un archivo ZIP');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/puestos/importar-zip', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al importar');
      }

      const data = await response.json();
      setResultado(data);

      if (data.exitosa) {
        toast.success('Importación completada exitosamente');
        onSuccess();
      } else {
        toast.warning('Importación completada con algunos errores');
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast.error(error instanceof Error ? error.message : 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResultado(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Puestos desde ZIP</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!resultado ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Seleccionar archivo ZIP
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                    id="zip-file-input"
                  />
                  <label
                    htmlFor="zip-file-input"
                    className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-gray-50"
                  >
                    <FileZip className="w-5 h-5" />
                    {file ? file.name : 'Seleccionar ZIP'}
                  </label>
                </div>
                {file && (
                  <p className="text-sm text-gray-500">
                    Tamaño: {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>Instrucciones:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                  <li>El ZIP debe contener archivos PDF o DOCX con descripciones de puestos</li>
                  <li>Cada archivo será procesado y asignado a un puesto existente o creado uno nuevo</li>
                  <li>El sistema detectará automáticamente si el puesto ya existe</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-4">
                <h3 className="font-semibold mb-2">Resumen de Importación</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total archivos:</span>
                    <span className="ml-2 font-medium">{resultado.resumen.totalArchivos}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Puestos creados:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {resultado.resumen.puestosCreados}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Puestos asignados:</span>
                    <span className="ml-2 font-medium text-blue-600">
                      {resultado.resumen.puestosAsignados}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Documentos asignados:</span>
                    <span className="ml-2 font-medium">{resultado.resumen.documentosAsignados}</span>
                  </div>
                  {resultado.resumen.errores > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Errores:</span>
                      <span className="ml-2 font-medium text-red-600">
                        {resultado.resumen.errores}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {resultado.detalles && resultado.detalles.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <h4 className="font-semibold text-sm">Detalles:</h4>
                  <div className="space-y-1">
                    {resultado.detalles.map((detalle: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded"
                      >
                        {detalle.estado === 'error' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <span className="flex-1 truncate">{detalle.nombreArchivo}</span>
                        {detalle.estado === 'creado' && (
                          <span className="text-xs text-green-600">Creado</span>
                        )}
                        {detalle.estado === 'asignado' && (
                          <span className="text-xs text-blue-600">Asignado</span>
                        )}
                        {detalle.estado === 'error' && (
                          <span className="text-xs text-red-600">{detalle.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {resultado ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!resultado && (
              <LoadingButton
                onClick={handleSubmit}
                loading={loading}
                disabled={!file}
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </LoadingButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 7. Integración en Modal Existente

**Modificar**: `components/organizacion/puesto-form-modal.tsx`

Añadir un tab switcher o botón para alternar entre "Crear Manual" e "Importar desde ZIP":

```typescript
// Añadir estado para el modo
const [modo, setModo] = useState<'manual' | 'importar'>('manual');

// Añadir en el JSX
<div className="flex gap-2 mb-4 border-b">
  <button
    onClick={() => setModo('manual')}
    className={`px-4 py-2 ${
      modo === 'manual'
        ? 'border-b-2 border-blue-500 text-blue-600'
        : 'text-gray-600'
    }`}
  >
    Crear Manual
  </button>
  <button
    onClick={() => setModo('importar')}
    className={`px-4 py-2 ${
      modo === 'importar'
        ? 'border-b-2 border-blue-500 text-blue-600'
        : 'text-gray-600'
    }`}
  >
    Importar desde ZIP
  </button>
</div>

{modo === 'manual' ? (
  // Formulario actual
) : (
  <ImportarPuestosZipModal
    isOpen={true}
    onClose={() => setModo('manual')}
    onSuccess={() => {
      onSuccess();
      onClose();
    }}
  />
)}
```

---

## 📦 Dependencias Necesarias

```bash
npm install jszip
npm install --save-dev @types/jszip
```

---

## 🔒 Consideraciones de Seguridad

1. **Validación de archivos**:
   - Validar tipo MIME del ZIP
   - Validar tamaño máximo (50MB)
   - Validar tipos de archivos dentro del ZIP (solo PDF/DOCX)

2. **Límites de procesamiento**:
   - Límite de archivos por ZIP (recomendado: 50 archivos)
   - Timeout para procesamiento (máximo 5 minutos)
   - Rate limiting en la API

3. **Validación de datos extraídos**:
   - Validar con Zod schema antes de crear puestos
   - Sanitizar nombres de puestos
   - Validar que no se creen puestos duplicados

4. **Manejo de errores**:
   - Logging detallado de errores
   - No exponer información sensible en errores
   - Rollback de transacciones en caso de error crítico

---

## 🧪 Testing

### Casos de Prueba

1. **ZIP válido con puestos nuevos**:
   - Crear ZIP con 3 PDFs de puestos nuevos
   - Verificar que se crean 3 puestos
   - Verificar que se asignan 3 documentos

2. **ZIP con puestos existentes**:
   - Crear ZIP con 2 PDFs de puestos que ya existen
   - Verificar que NO se crean puestos duplicados
   - Verificar que se asignan documentos a puestos existentes

3. **ZIP mixto**:
   - Crear ZIP con puestos nuevos y existentes
   - Verificar comportamiento correcto en ambos casos

4. **ZIP con errores**:
   - ZIP con archivos corruptos
   - ZIP con tipos de archivo no soportados
   - ZIP con archivos que no pueden ser procesados por IA

5. **Límites**:
   - ZIP muy grande (>50MB)
   - ZIP con muchos archivos (>50)
   - ZIP vacío

---

## 📊 Métricas y Monitoreo

- **Tiempo de procesamiento**: Tiempo promedio por archivo
- **Tasa de éxito**: Porcentaje de archivos procesados exitosamente
- **Tasa de creación vs asignación**: Ratio de puestos creados vs asignados
- **Errores de IA**: Contador de errores en extracción con IA
- **Uso de recursos**: Memoria y CPU durante procesamiento

---

## 🚀 Roadmap de Implementación

### Fase 1: MVP (Sprint 1)
- ✅ Documentación técnica
- ⬜ Endpoint API básico
- ⬜ Procesamiento de ZIP
- ⬜ Extracción con IA básica
- ⬜ Clasificación simple (exact match)

### Fase 2: Mejoras (Sprint 2)
- ⬜ Clasificación avanzada (similitud de strings)
- ⬜ UI mejorada con progreso
- ⬜ Manejo de errores robusto
- ⬜ Validaciones adicionales

### Fase 3: Optimización (Sprint 3)
- ⬜ Procesamiento en background (queues)
- ⬜ Notificaciones de progreso
- ⬜ Historial de importaciones
- ⬜ Métricas y analytics

---

## 📝 Notas Adicionales

- **Nombre del documento**: El nombre del archivo puede usarse como sugerencia para el nombre del puesto, pero la IA tiene prioridad
- **Duplicados**: Si hay múltiples documentos para el mismo puesto, todos se asignarán al mismo puesto
- **Procesamiento asíncrono**: Para ZIP grandes, considerar procesamiento en background con colas (Bull/BullMQ)
- **Cache de clasificación**: Para mejorar performance, cachear resultados de clasificación durante el procesamiento del ZIP

---

**Última actualización**: 27 de Enero 2025  
**Autor**: Documentación técnica - Clousadmin
















