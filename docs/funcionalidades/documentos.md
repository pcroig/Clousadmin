# 📁 Sistema de Gestión Documental

**Estado**: ✅ Implementado y Funcional  
**Versión**: 1.5.0  
**Fecha de finalización**: 2 de Noviembre 2025
**Última actualización**: 28 de Noviembre 2025

---

## 🎯 Resumen Ejecutivo

Sistema completo de gestión documental con:
- ✅ Carpetas automáticas por empleado (Contratos, Nóminas, Personales, Médicos)
- ✅ Upload y descarga de documentos con validaciones
- ✅ **Visualización in-app** de PDF, Word (convertido a PDF) e imágenes
- ✅ Sistema de permisos (HR, Empleados, Managers)
- ✅ Vista jerárquica de carpetas y documentos
- ✅ Carpetas compartidas (HR Admin)
- ✅ **Carpetas maestras globales** para HR (vista unificada)
- ✅ Preparado para IA en Fase 2
- ✅ UI mobile-first con tabs, action bars y métricas contextuales (Nov 2025)

### 🆕 Novedades 2025-11

- **Cabecera mobile unificada**: `MobilePageHeader` + `MobileActionBar` sustituyen layouts ad-hoc y aseguran consistencia con ausencias/fichajes.
- **Tabs Documentos/Plantillas** renovados: botones contextuales (Crear carpeta / Subir plantilla) se actualizan dinámicamente por tab.
- **Plantillas gestionadas**: `PlantillasList` y `SubirPlantillaModal` permiten uploads rápidos y refrescan la vista automáticamente.
- **Compatibilidad responsive**: `CarpetasGrid` reutilizable en móvil y desktop, con contadores y estados vacíos coherentes.

### 🆕 Novedades 2025-11-27

- **📄 Visualización de Documentos In-App**: Sistema completo de visualización de documentos sin salir de la aplicación
  - PDFs e imágenes se muestran directamente en modal
  - Documentos Word (DOCX) se convierten automáticamente a PDF para visualización
  - Caché inteligente de previews para optimizar rendimiento
  - Integrado en todas las vistas de documentos, plantillas y firmas
  
- **📤 Sistema de Upload Simplificado**: Nueva experiencia de subida de documentos
  - Modal unificado para subir documentos con selección de carpeta
  - Creación rápida de carpetas desde el modal
  - Upload inmediato sin colas complejas, con indicador de "Procesando"
  - Componente reutilizable `DocumentUploadArea` para cualquier contexto

- **🌍 Carpetas Maestras Globales**: Mejora en la organización para HR
  - Vista HR muestra solo carpetas globales unificadas (ej: "Nóminas")
  - Filtrado automático por empleado en carpetas globales
  - Vista agregada de todos los documentos del mismo tipo en una sola carpeta

- **👁️ Previsualización de Plantillas Mejorada**: Visualización directa en la interfaz
  - Preview en PDF directamente en el panel de plantillas
  - Generación bajo demanda con datos reales del empleado
  - Selector de empleado para probar diferentes datos

### 🆕 Novedades 2025-11-28

- **🔧 Corrección de Headers de Preview**: Optimización de la visualización de documentos
  - Helper centralizado `getPreviewHeaders()` para gestión de headers HTTP en endpoints de preview
  - CSP (Content-Security-Policy) optimizada para cada tipo MIME:
    - PDFs: Permite scripts, workers y fonts para visor nativo del navegador
    - Imágenes: Política restrictiva sin scripts
  - `X-Frame-Options: SAMEORIGIN` explícito en respuestas de preview
  - Sandbox del iframe mejorado: agregados `allow-downloads`, `allow-modals`, `allow-presentation`
  - Cache-Control optimizado con `stale-while-revalidate` para mejor rendimiento
  - Headers de seguridad adicionales: `Cross-Origin-Embedder-Policy`, `Cross-Origin-Resource-Policy`
  
- **📐 Arquitectura Escalable para Headers**: 
  - Archivo `lib/documentos/preview-headers.ts` centraliza toda la lógica de headers
  - Función `getCspForMimeType()` para CSP específica por tipo de contenido
  - Función `validatePreviewHeaders()` para debugging en desarrollo
  - DRY: Un solo punto de configuración para todos los endpoints de preview
  
- **✅ Compatibilidad Total con Visores Nativos**:
  - Chrome PDF Viewer: ✅ Funcional
  - Firefox PDF.js: ✅ Funcional
  - Safari PDF Viewer: ✅ Funcional
  - Edge PDF Viewer: ✅ Funcional

### 🖋️ Firma digital y gestión de documentos firmados

- ✅ **Marca visual profesional**: Cuando el documento se firma, solo se dibuja la imagen de la firma capturada y, si queda espacio, el nombre del firmante en texto gris muy tenue. Se eliminan bordes, sombreado y etiquetas adicionales para que el PDF firmado luzca limpio.
- ✅ **Nuevo documento firmado**: El PDF final se guarda como un nuevo `documentos` (mismas carpeta/empleado originales) y se enlaza al registro `documentosGenerado` cuando procede, de forma que siempre haya disponible una copia firmada junto al original.
- ✅ **Multi-firmantes ordenados**: Si una solicitud incluye varios firmantes, cada entrada se procesa y se apilan verticalmente en la última página del PDF con espaciado automático. El API y la UI ahora filtran los registros con `firmado=false` para mostrar solo los pendientes por firmar.
- ✅ **Firmantes autorizados**: El diálogo de firma (`SolicitarFirmaDialog`) consulta `/api/carpetas/[id]/empleados-con-acceso` para asegurarse de que solo los empleados con permiso sobre la carpeta aparecen como posibles firmantes.
- ✅ **Endpoint `/api/firma/pendientes` mejorado**: Retorna todos los firmantes (pendientes y completados recientes) con un flag `firmado`, de modo que el frontend puede filtrar correctamente y evitar mostrar firmas ya realizadas.

---

## 📊 Arquitectura

### Modelos de Datos

```prisma
Carpeta {
  id: UUID
  empresaId: UUID
  empleadoId: UUID? // NULL = carpeta compartida
  nombre: String
  parentId: UUID? // Self-referencing para subcarpetas
  esSistema: Boolean // true = Contratos, Nóminas, Personales, Médicos
  compartida: Boolean // true = accesible por múltiples usuarios
  asignadoA: String? // 'todos' | 'grupo:id' | 'empleado:id'
}

Documento {
  id: UUID
  empresaId: UUID
  empleadoId: UUID? // NULL = documento compartido
  carpetaId: UUID?
  nombre: String
  tipoDocumento: String // 'contrato' | 'nomina' | 'justificante' | 'otro'
  mimeType: String
  tamano: Int
  s3Key: String // Ruta del archivo (local en MVP, S3 en futuro)
  s3Bucket: String
  procesadoIA: Boolean // Preparado para Fase 2
  datosExtraidos: Json? // Preparado para Fase 2
}
```

### Tipos de Carpetas

El sistema gestiona **3 tipos distintos** de carpetas:

#### 1. **Carpetas del Sistema Individuales** (por empleado)
Se crean automáticamente para cada empleado, conectadas a funcionalidades de la plataforma:

- **📄 Contratos** (`esSistema: true`, `empleadoId: <id>`)
  - Contratos laborales, modificaciones, anexos, finiquitos
  - Se suben durante onboarding (opcional)
  - Vinculados al modelo `Contrato`

- **💰 Nóminas** (`esSistema: true`, `empleadoId: <id>`)
  - PDFs de nóminas mensuales
  - Importados masivamente o manualmente desde módulo de nóminas
  - Se reasignan automáticamente a cada empleado

- **📋 Justificantes** (`esSistema: true`, `empleadoId: <id>`)
  - Justificantes de ausencias y documentos médicos
  - Se crean automáticamente desde el módulo de ausencias
  - Vinculados a registros de ausencia (campo `documentoId`)
  - **Tipo de documento**: `justificante` (compartido con Médicos)

- **🏥 Médicos** (`esSistema: true`, `empleadoId: <id>`, opcional)
  - Partes de baja, justificantes médicos
  - Se vinculan a ausencias médicas
  - Empleados pueden subir archivos
  - **Tipo de documento**: `justificante` (compartido con Justificantes)
  - **Nota**: A nivel de datos, "Médicos" y "Justificantes" comparten el mismo tipo `justificante`

- **👤 Personales** (`esSistema: true`, `empleadoId: <id>`, opcional)
  - DNI/NIE/Pasaporte, certificado bancario, certificado SS, títulos académicos
  - Empleados pueden subir archivos libremente
  - **Tipo de documento**: `otro` (cualquier carpeta no estándar se mapea a `otro`)

#### 2. **Carpetas Globales HR** (agregación con filtros)
Una carpeta por empresa, agregan documentos de TODOS los empleados:

- **🌍 Contratos (Global)** (`esSistema: true`, `empleadoId: null`, `compartida: true`)
  - Vista agregada de todos los contratos de la empresa
  - Filtros por empleado y búsqueda
  - Solo visible para HR Admin

- **🌍 Nóminas (Global)** (`esSistema: true`, `empleadoId: null`, `compartida: true`)
  - Vista agregada de todas las nóminas de la empresa
  - Filtros por empleado y búsqueda
  - Solo visible para HR Admin

- **🌍 Justificantes (Global)** (`esSistema: true`, `empleadoId: null`, `compartida: true`)
  - Vista agregada de todos los justificantes de la empresa
  - Filtros por empleado y búsqueda
  - Solo visible para HR Admin

#### 3. **Carpetas Compartidas Manuales** (creadas por HR)
Carpetas creadas manualmente por HR para compartir documentos con la organización:

- **📁 Ejemplos**: "Políticas 2025", "Convenio Colectivo", "Protocolos", "Formación"
- **Características**:
  - `esSistema: false`, `empleadoId: null`, `compartida: true`
  - `asignadoA`: 'todos' | 'equipo:id' | 'empleado:id1,empleado:id2'
  - Visibles en sección "Compartidos" del empleado
  - Sin filtros especiales (a diferencia de las globales)

---

## 🔐 Sistema de Permisos

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Ver propias carpetas | ✅ | ✅ | ✅ |
| Ver carpetas de equipo | ❌ | ✅ | ✅ |
| Ver todas las carpetas | ❌ | ❌ | ✅ |
| Subir a Personales/Médicos | ✅ | ❌ | ✅ |
| Subir a Contratos/Nóminas | ❌ | ❌ | ✅ |
| Crear carpetas compartidas | ❌ | ❌ | ✅ |
| Eliminar documentos | ❌ | ❌ | ✅ |
| Eliminar carpetas | ❌ | ❌ | ✅ |

---

## 🛠️ APIs Implementadas

### Documentos

#### `POST /api/upload`
Upload de archivos con opción de crear documento en BD (usado para justificantes)

**Body (FormData):**
```
file: File
tipo: string (justificante|medico|contrato|etc)
empleadoId: string (opcional)
crearDocumento: boolean (opcional, si debe crear registro en BD)
```

**Response:**
```json
{
  "success": true,
  "url": "s3://...",
  "fileName": "archivo.pdf",
  "documento": {
    "id": "uuid",
    "nombre": "archivo.pdf",
    "carpetaId": "uuid"
  }
}
```

#### `POST /api/documentos`
Upload de documentos (multipart/form-data)

**Body:**
```json
{
  "file": File,
  "carpetaId": "uuid",
  "empleadoId": "uuid",
  "tipoDocumento": "contrato|nomina|justificante|otro"
}
```

**Response:**
```json
{
  "success": true,
  "documento": {
    "id": "uuid",
    "nombre": "contrato.pdf",
    "url": "/api/documentos/uuid"
  }
}
```

#### `GET /api/documentos`
Listar documentos del usuario actual

**Query params:**
- `carpetaId`: Filtrar por carpeta
- `empleadoId`: Filtrar por empleado (solo HR)
- `tipoDocumento`: Filtrar por tipo

#### `GET /api/documentos/[id]`
Descargar documento (con validación de permisos)

**Response:**
- Stream del archivo con headers apropiados
- 403 si no tiene permisos

#### `GET /api/documentos/[id]/preview`
Vista previa del documento para visualización in-app

**Query params:**
- `regenerate=1`: Forzar regeneración del preview (solo para DOCX)

**Response:**
- Stream PDF del documento (convierte DOCX a PDF automáticamente)
- Headers de seguridad y caché configurados
- 403 si no tiene permisos
- 415 si el tipo de archivo no es compatible con preview

**Soporte de tipos:**
- ✅ PDFs: Se sirven directamente
- ✅ Imágenes (JPG, PNG, GIF, WebP): Se sirven directamente
- ✅ DOCX: Se convierten a PDF automáticamente (con caché en S3)

#### `DELETE /api/documentos/[id]`
Eliminar documento (solo HR)

### Carpetas

#### `GET /api/carpetas/[id]`
Ver contenido de carpeta

**Response:**
```json
{
  "carpeta": {
    "id": "uuid",
    "nombre": "Contratos",
    "esSistema": true,
    "esGlobal": false,
    "empleado": {...}
  },
  "documentos": [...],
  "subcarpetas": [...]
}
```

**Carpetas Globales:**
- Si `empleadoId` es `null` y `esSistema: true`, es una carpeta global
- Agrega documentos de todos los empleados del mismo tipo
- Vista HR incluye filtros por empleado y búsqueda
- Tipos globales: Nóminas, Contratos, Justificantes
- **Nota**: En la vista HR principal (`/hr/documentos`), solo se muestran carpetas globales y compartidas. Las carpetas individuales por empleado no aparecen en el listado principal.

#### `GET /api/plantillas/[id]/preview`
Previsualización PDF de plantilla con datos de empleado

**Query params:**
- `empleadoId`: ID del empleado para previsualizar con sus datos

**Response:**
- Stream PDF con la plantilla procesada y variables resueltas
- Headers de seguridad configurados
- 403 si no es HR Admin
- 404 si la plantilla o empleado no existen
- 415 si la plantilla no es DOCX

**Características:**
- Resuelve variables automáticamente con datos del empleado
- Convierte DOCX a PDF en tiempo real
- Caché temporal (5 minutos) para optimizar rendimiento

#### `POST /api/carpetas`
Crear carpeta (solo HR para carpetas compartidas)

**Body:**
```json
{
  "nombre": "Políticas 2025",
  "parentId": "uuid?",
  "compartida": true,
  "asignadoA": "todos" // 'todos' | 'grupo:id' | 'empleado:id'
}
```

#### `GET /api/carpetas`
Listar carpetas (filtra según permisos)

#### `DELETE /api/carpetas/[id]`
Eliminar carpeta vacía (solo HR)

---

## 🚀 Guía de Uso

### Para HR Admin

#### Ver Documentos
```
Navegar a: /hr/documentos
- Verás las carpetas globales y compartidas de la empresa
- Carpetas con ícono 🌍 son globales (agregan documentos de todos los empleados)
- Carpetas individuales por empleado NO se muestran aquí (solo las globales)
- Click en una carpeta para ver su contenido
- Dentro de la carpeta podrás:
  • Ver todos los documentos en formato tabla
  • En carpetas globales: filtrar por empleado y buscar
  • Visualizar documentos directamente en la app (botón "Ver")
  • Descargar documentos
  • Eliminar documentos
  • Subir nuevos documentos
```

#### Carpetas Globales (Nóminas, Contratos, Justificantes)
```
1. Navegar a carpeta global (ej: "Nóminas")
2. Ver banner azul indicando que es carpeta global
3. Usar filtros:
   • Selector "Filtrar por empleado": Ver documentos de un empleado específico
   • Campo "Buscar": Buscar por nombre de documento o empleado
4. Tabla muestra columna adicional "Empleado" con asignación
5. Contador muestra: "X documentos (de Y total)"
```

#### Crear Carpeta Compartida
```
1. Click en "Crear Carpeta"
2. Ingresar nombre (ej: "Políticas 2025")
3. Seleccionar "Todos los empleados"
4. Click en "Crear Carpeta"
```

#### Subir Documentos

**Desde el header principal:**
```
1. Click en "Subir Documentos" en el header
2. Se abre modal con:
   - Selector de carpeta destino (incluye opción de crear carpeta rápida)
   - Área de drag & drop o click para seleccionar archivos
3. Seleccionar carpeta y archivos
4. Los archivos se procesan inmediatamente con indicador "Procesando..."
5. Al completar, se cierra el modal y se actualiza la vista
```

**Desde dentro de una carpeta:**
```
1. Navegar a la carpeta destino
2. Click en "Subir Documentos"
3. Seleccionar archivos (múltiples permitidos)
4. Los archivos se procesan inmediatamente con indicador "Procesando..."
5. Al completar, los documentos aparecen en la tabla
```

**Características:**
- Upload inmediato sin colas visibles
- Indicador de progreso simple y claro
- Validaciones automáticas (tipo, tamaño, magic numbers)
- Feedback inmediato con toasts de éxito/error

### Para Empleados

#### Ver Mis Documentos
```
Navegar a: /empleado/mi-espacio/documentos
- Tab "Personales": Tus 5 carpetas del sistema
  • Contratos (solo lectura) - subidos durante onboarding
  • Nóminas (solo lectura) - reasignadas desde módulo de nóminas
  • Justificantes (solo lectura) - creadas automáticamente desde ausencias
  • Personales (puedes subir archivos)
  • Médicos (puedes subir archivos)
- Tab "Compartidos": Carpetas compartidas por la empresa
- Click en cualquier carpeta para ver su contenido
- Dentro de la carpeta podrás:
  • Ver todos los documentos en formato tabla
  • Descargar documentos
  • Subir documentos (solo en Personales y Médicos)
```

#### Subir Justificante desde Ausencias
```
1. Navegar a: /empleado/mi-espacio/ausencias
2. Click en "Solicitar Ausencia"
3. Completar formulario de ausencia
4. Opcional: Subir justificante (PDF, JPG, PNG)
5. Al crear la ausencia:
   • Archivo se sube a S3
   • Se crea documento en carpeta "Justificantes"
   • Se vincula a la ausencia (campo documentoId)
   • Visible en "Mis Documentos > Justificantes"
```

#### Subir Documentos Personales
```
1. Click en carpeta "Personales" o "Médicos"
2. Click en "Subir Documentos"
3. Seleccionar archivo(s) - múltiples archivos permitidos
4. Sistema procesa inmediatamente con indicador "Procesando..."
5. Al completar, los documentos aparecen en la lista
6. Validaciones automáticas (tipo, tamaño)
```

#### Visualizar Documentos
```
1. Click en botón "Ver" (icono de ojo) junto a cualquier documento
2. Se abre modal con visualización del documento:
   - PDFs: Visualización nativa en el navegador
   - Word (DOCX): Convertido automáticamente a PDF para visualización
   - Imágenes: Visualización directa
3. Desde el modal puedes:
   - Ver el documento completo en pantalla completa
   - Descargar el archivo original
   - Abrir en nueva pestaña
   - Cerrar y volver a la lista
```

---

## ✅ Validaciones Implementadas

### Archivos

**Formatos permitidos:**
- PDF (principal): `application/pdf`
- Imágenes: JPG (`image/jpeg`), PNG (`image/png`)
- Office: DOCX, XLSX (si se habilita en futuro)

**Tamaños máximos:**
- Default: 10MB (configurable vía `NEXT_PUBLIC_MAX_UPLOAD_MB`)
- Contratos: 10MB
- Nóminas: 2MB
- Documentos generales: 10MB

**Validaciones adicionales:**
- ✅ Magic numbers (verificación de firma de archivo)
- ✅ Validación de tipo MIME vs extensión
- ✅ Límite de archivos en cola (default: 10)
- ✅ Rate limiting por usuario + empresa + IP
- Justificantes (incluye médicos): 5MB
- Otros (incluye Personales y carpetas personalizadas): 10MB

**Nombre archivo:**
- Sin caracteres especiales: `/ \ < > : " | ? *`
- Máximo 255 caracteres
- Si duplicado → Añade `(1)`, `(2)`, etc.

### Carpetas
- ✅ Nombres únicos por empleado
- ✅ No se pueden eliminar carpetas del sistema
- ✅ No se pueden eliminar carpetas con contenido
- ✅ Carpetas compartidas solo HR Admin

---

## 💾 Storage

### Hetzner Object Storage (Producción)

El sistema utiliza Hetzner Object Storage (S3-compatible) para almacenar todos los documentos en producción. En desarrollo local, se puede usar filesystem como fallback.

**Configuración:**
- Variables de entorno: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`
- Feature flag: `ENABLE_CLOUD_STORAGE=true` para activar Object Storage
- Fallback local: Si `ENABLE_CLOUD_STORAGE=false`, se usa `/uploads/` en el servidor

**Estructura en S3:**
```
s3://[STORAGE_BUCKET]/
  ├─ documentos/
  │   ├─ [empresaId]/
  │   │   ├─ [empleadoId]/
  │   │   │   ├─ contratos/
  │   │   │   ├─ nominas/
  │   │   │   ├─ personales/
  │   │   │   └─ medicos/
  │   │   └─ compartidos/
  │   │       └─ [carpetaId]/
  └─ previews/
      └─ [documentoId].pdf    # Previews cacheados de documentos DOCX convertidos a PDF
```

**Caché de Previews (v1.5.0):**
- Los documentos Word (DOCX) se convierten a PDF automáticamente para visualización in-app
- Los PDFs convertidos se cachean en `previews/[documentoId].pdf` para evitar reconversiones costosas
- Caché con `stale-while-revalidate`: el navegador puede usar versiones antiguas mientras revalida en background
- La caché se invalida automáticamente cuando se actualiza el documento original
- PDFs nativos e imágenes no se cachean (se sirven directamente)

**Características:**
- URLs firmadas para descargas seguras
- Eliminación automática al borrar documentos
- Migración automática desde storage local (ver `scripts/migrate-documents-to-s3.ts`)
- **Caché de previews**: Los documentos Word convertidos a PDF se cachean en `previews/[documentoId].pdf` para evitar reconversiones
- Invalidación automática de caché cuando se actualiza el documento original

---

## 🗂️ Estructura de Archivos

### Backend
```
prisma/
└── schema.prisma                              # Modelo actualizado

lib/
├── documentos.ts                              # Utilidades y funciones helper
└── hooks/
    └── use-crear-empleado.ts                  # Hook para integración

app/api/
├── documentos/
│   ├── route.ts                               # POST (upload), GET (list)
│   └── [id]/
│       ├── route.ts                           # GET (download), DELETE
│       └── preview/
│           └── route.ts                       # GET (preview in-app)
├── plantillas/
│   └── [id]/
│       └── preview/
│           └── route.ts                       # GET (template preview PDF)
└── carpetas/
    ├── route.ts                               # POST (create), GET (list)
    └── [id]/
        └── route.ts                           # GET (view), DELETE

lib/
├── documentos/
│   ├── preview.ts                             # Servicio de generación de previews
│   └── client-upload.ts                       # Helper para uploads desde cliente
├── documentos.ts                              # Utilidades y funciones helper
└── hooks/
    └── use-crear-empleado.ts                  # Hook para integración

scripts/
└── crear-carpetas-empleados-existentes.ts     # Script de migración
```

### Frontend
```
app/(dashboard)/
├── hr/
│   └── documentos/
│       ├── page.tsx                           # Lista de carpetas (solo globales)
│       ├── documentos-client.tsx              # Cliente con modal crear/subir
│       ├── [id]/
│       │   ├── page.tsx                       # Vista detalle carpeta
│       │   └── carpeta-detail-client.tsx      # Cliente con upload/download/delete/view
│       └── plantillas/
│           └── [id]/
│               └── plantilla-detail-client.tsx # Vista de plantilla con preview
└── empleado/
    └── mi-espacio/
        └── documentos/
            ├── page.tsx                       # Lista de carpetas (tabs)
            ├── documentos-client.tsx          # Cliente con tabs personal/compartido
            └── [id]/
                ├── page.tsx                   # Vista detalle carpeta
                └── carpeta-detail-client.tsx  # Cliente con upload/download/view

components/
├── hr/
│   └── subir-documentos-modal.tsx             # Modal para subir documentos con selector de carpeta
├── shared/
│   ├── document-viewer.tsx                    # Modal reutilizable para visualizar documentos
│   └── document-upload-area.tsx               # Componente de upload simplificado
└── ...
```

---

## 🔄 Integraciones del Sistema

### 1. Integración con Creación de Empleados

#### Automática (Recomendada)
```typescript
import { crearEmpleadoConCarpetas } from '@/lib/hooks/use-crear-empleado';

const empleado = await crearEmpleadoConCarpetas({
  nombre: 'Ana',
  apellidos: 'García',
  email: 'ana@empresa.com',
  empresaId: 'uuid',
  // ... otros campos
});
// Las 5 carpetas del sistema se crean automáticamente en la transacción
```

### 2. Integración con Módulo de Ausencias

#### Subida de Justificantes
```typescript
// En solicitar-ausencia-modal.tsx
const formData = new FormData();
formData.append('file', justificante);
formData.append('tipo', 'justificante');
formData.append('crearDocumento', 'true');
formData.append('empleadoId', empleadoId);

const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});

const { url, documento } = await uploadResponse.json();

// Al crear ausencia, vincular documento
await fetch('/api/ausencias', {
  method: 'POST',
  body: JSON.stringify({
    tipo: 'enfermedad',
    fechaInicio: '2025-01-15',
    fechaFin: '2025-01-17',
    justificanteUrl: url,
    documentoId: documento.id, // ← Vincula documento a ausencia
  }),
});
```

**Flujo completo:**
1. Usuario sube justificante en modal de ausencia
2. API `/api/upload` sube archivo a S3
3. API crea documento en carpeta "Justificantes" del empleado
4. API retorna `documentoId`
5. Al crear ausencia, se vincula con `documentoId`
6. Documento visible en "Mis Documentos > Justificantes"

### 3. Integración con Nóminas (Futuro - Fase 2)

```typescript
// Importación masiva de nóminas
// 1. Subir PDF de nómina
// 2. IA extrae datos (empleado, período, conceptos)
// 3. Matching automático de empleado
// 4. Asigna documento a carpeta "Nóminas" del empleado
// 5. Visible en carpeta global "Nóminas" (HR) y personal (Empleado)
```

### 4. Integración con Onboarding/Offboarding

#### Selector de Carpeta al Subir Documentos

Cuando HR sube documentos durante onboarding o offboarding, tiene 3 opciones:

1. **Carpetas existentes del empleado**: Contratos, Personales, Médicos, etc.
2. **Crear nueva carpeta**: Por ejemplo, "DNI" o "Certificados"
3. **Automático** (por defecto): Si no se elige carpeta, se crea automáticamente en "Onboarding"

**Componente**: `CarpetaSelector`

**Endpoint**:
```typescript
POST /api/empleados/[id]/onboarding/documentos
FormData:
  - file: File
  - nombreDocumento: string
  - tipoDocumento?: string (opcional - se infiere automáticamente desde la carpeta)
  - carpetaId?: string (opcional - si se elige carpeta específica, por defecto "Otros")
  - esCompartida?: boolean (opcional - si debe ir a carpeta compartida)
```

> ℹ️ **Nota**: El `tipoDocumento` se infiere automáticamente desde el nombre de la carpeta si no se especifica:
> - Carpeta "Contratos" → `contrato`
> - Carpeta "Nóminas" → `nomina`
> - Carpeta "Justificantes" o "Médicos" → `justificante`
> - Cualquier otra carpeta → `otro`

**Flujo completo**:
```typescript
// 1. HR selecciona carpeta o crea una nueva (por defecto "Otros")
const carpetaId = await CarpetaSelector.getValue();

// 2. Sube documento con carpetaId (tipo se infiere automáticamente)
const formData = new FormData();
formData.append('file', file);
formData.append('nombreDocumento', 'Contrato Indefinido');
// tipoDocumento es opcional - se infiere desde la carpeta
if (carpetaId) {
  formData.append('carpetaId', carpetaId);
}

await fetch(`/api/empleados/${empleadoId}/onboarding/documentos`, {
  method: 'POST',
  body: formData,
});

// 3. Si no se especifica carpetaId, se crea automáticamente:
//    - Carpeta HR: "Onboarding - {nombreDocumento}"
//    - Carpeta Empleado: "Onboarding > {nombreDocumento}"
```

**Implementación**: 
- Frontend: `components/organizacion/add-persona-onboarding-form.tsx`
- Backend: `lib/documentos/onboarding.ts` → `subirDocumentoOnboarding()`
- API: `app/api/empleados/[id]/onboarding/documentos/route.ts`

---

## 🧪 Testing

### Crear Carpetas para Empleados Existentes
```bash
# Ejecutar script de migración
npx tsx scripts/crear-carpetas-empleados-existentes.ts
```

**Resultado esperado:**
```
✅ Proceso completado!
📊 Resumen:
   • Empleados con carpetas completas: X
   • Empleados sin carpetas: X
   • Carpetas creadas: X
```

### Verificar API de Documentos
```bash
# Listar carpetas (requiere autenticación)
curl http://localhost:3000/api/carpetas

# Listar documentos
curl http://localhost:3000/api/documentos
```

---

## 🚧 Próximas Fases

### Fase 2: IA y Matching Automático (Preparado)
- ✅ Campos `procesadoIA` y `datosExtraidos` ya existen en DB
- 🔜 Matching automático de empleado en uploads masivos
- 🔜 Extracción de datos de contratos (fechas, salario, etc.)
- 🔜 Extracción de datos de nóminas (conceptos, importes)
- 🔜 Validación automática vs datos del sistema

### Fase 3: Integraciones
- 🔜 Integración con módulo Payroll (nóminas automáticas)
- 🔜 Integración con módulo Ausencias (justificantes médicos)
- 🔜 Analytics de documentos (métricas, reportes)
- 🔜 Log de auditoría completo (quién, cuándo, qué)

### Fase 4: Funcionalidades Avanzadas
- ✅ Visualización in-app de documentos (completado)
- 🔜 Versionado de documentos
- ✅ Firma electrónica (integración básica existente, mejorar UX)
- 🔜 Workflow de aprobación
- 🔜 OCR para documentos escaneados
- 🔜 CDN para descargas rápidas
- 🔜 Anotaciones y comentarios en documentos

---

## 📝 Notas Técnicas

### Estructura de Carpetas del Sistema
Cada empleado tiene automáticamente 5 carpetas:
1. **Contratos** - Contratos laborales, modificaciones, anexos (subidos en onboarding)
2. **Nóminas** - PDFs de nóminas mensuales (importados desde módulo nóminas)
3. **Justificantes** - Justificantes de ausencias (creados automáticamente)
4. **Personales** - DNI, certificados bancarios, títulos
5. **Médicos** - Justificantes médicos, bajas IT

### Carpetas Globales vs Individuales

**Carpetas Individuales:**
- Tienen `empleadoId` asignado
- Contienen documentos específicos de un empleado
- Visibles en "Mi Espacio" para el empleado
- Visibles en vista HR filtrando por empleado

**Carpetas Globales:**
- `empleadoId` es `null`
- `compartida: true` y `esSistema: true`
- Agregan documentos de todos los empleados del mismo tipo
- Solo visibles para HR Admin
- Incluyen filtros por empleado y búsqueda
- Tipos: Nóminas, Contratos, Justificantes

**Creación de carpetas globales:**
```typescript
import { obtenerOCrearCarpetaGlobal } from '@/lib/documentos';

const carpetaGlobal = await obtenerOCrearCarpetaGlobal(
  empresaId,
  'Nóminas'
);
// Resultado: carpeta sin empleadoId, compartida, sistema
```

### Permisos de Upload
- **Empleados** pueden subir SOLO a: Personales y Médicos
- **HR Admin** puede subir a todas las carpetas
- **Managers** solo pueden ver (no subir)

### Carpetas Compartidas
- Solo HR Admin puede crearlas
- Configurables como:
  - `todos` → Todos los empleados
  - `empleado:id` → Empleado específico
  - `grupo:id` → Grupo/equipo (preparado para futuro)

### Preparación para IA
- Los campos `procesadoIA` y `datosExtraidos` ya existen en el modelo pero no se usan en MVP
- El campo `s3Key` contiene la ruta completa del objeto en Hetzner Object Storage
- Validación en cada API usando `getSession()` y verificando rol
- Endpoint `/api/documentos/extraer` preparado para extracción de datos con OpenAI
- Lógica de IA en: `lib/ia/extraccion-contratos.ts`, `lib/ia/extraccion-nominas.ts`

### Vinculación de Documentos con Otras Entidades

**Ausencias:**
```prisma
model ausencia {
  documentoId String?    @db.Uuid
  documento   documento? @relation(fields: [documentoId], references: [id])
}
```
- Campo `documentoId` vincula ausencia con justificante
- Se asigna automáticamente al subir justificante desde modal de ausencia

**Contratos (Futuro):**
```prisma
model contrato {
  documentoId String?    @db.Uuid
  documento   documento? @relation(fields: [documentoId], references: [id])
}
```

---

## ⚠️ Importante

1. **Carpetas del Sistema NO SE PUEDEN ELIMINAR**
   - Protegidas en API
   - Campo `esSistema = true`

2. **Storage Local (MVP)**
   - Archivos en `/uploads/`
   - Preparado para migrar a S3 en Fase 2
   - Campo `s3Bucket` está listo

3. **Validaciones en API**
   - MIME type
   - Tamaño máximo
   - Permisos de usuario
   - Nombres de archivo

4. **TypeScript**
   - Todo tipado correctamente
   - Sin errores de compilación en código nuevo
   - Compatible con Next.js 16 (async params)

5. **Visualización de Documentos (v1.5.0)**
   - PDFs e imágenes se visualizan directamente en el navegador
   - DOCX se convierte automáticamente a PDF usando LibreOffice
   - Previews se cachean en S3 para optimizar rendimiento
   - Headers de seguridad estrictos en todos los endpoints de preview
   - Requiere LibreOffice instalado en el servidor para conversión DOCX
   - **CSP específica por tipo MIME**: PDFs permiten scripts/workers, imágenes son restrictivas
   - **Sandbox del iframe optimizado**: Permite descarga, impresión y pantalla completa

---

## 🐛 Troubleshooting

### No veo carpetas en empleados
```bash
# Ejecutar script de migración
npx tsx scripts/crear-carpetas-empleados-existentes.ts
```

### Error al subir archivos
- Verificar que `/uploads/` tenga permisos de escritura
- Verificar tamaño del archivo vs límite
- Verificar MIME type permitido

### No puedo crear carpetas compartidas
- Solo HR Admin puede crear carpetas compartidas

### La visualización de documentos no funciona
**Síntoma**: El iframe del visor de documentos está en blanco o muestra error "Failed to load PDF"

**Causas posibles y soluciones**:

1. **Headers CSP bloqueando el visor** (v1.5.0 soluciona esto)
   - Verificar que `getPreviewHeaders()` se está usando en todos los endpoints de preview
   - Comprobar que la CSP incluye `script-src 'unsafe-inline'`, `worker-src blob:`, `object-src 'self'`
   - Verificar que `X-Frame-Options: SAMEORIGIN` está presente

2. **Problemas con conversión DOCX → PDF**
   - Verificar que LibreOffice está instalado: `which soffice`
   - Comprobar logs del servidor para errores de conversión
   - Revisar que el caché de previews está funcionando (ruta `previews/[id].pdf` en S3)

3. **Sandbox del iframe demasiado restrictivo**
   - Verificar que el iframe tiene: `allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-modals allow-presentation`

4. **Caché corrupta**
   - Forzar regeneración: agregar `?regenerate=1` a la URL de preview
   - Verificar que la caché en S3 no está corrupta

### Los documentos Word no se convierten a PDF
**Síntoma**: Error 503 "LibreOffice no está disponible"

**Solución**:
```bash
# macOS
brew install libreoffice

# Linux (Ubuntu/Debian)
sudo apt-get install libreoffice

# Verificar instalación
soffice --version
```

### Las carpetas individuales de empleados aparecen en la vista HR
**Síntoma**: La vista HR muestra cientos de carpetas individuales por empleado

**Solución**: Ya corregido en v1.4.0. Verificar que el query en `app/(dashboard)/hr/documentos/page.tsx` incluye:
```typescript
OR: [
  { esSistema: false }, // Include non-system folders (manual shared)
  { empleadoId: null, esSistema: true }, // Include global system folders (master)
]
```
- Verificar rol del usuario en sesión

### Error al visualizar documento Word (DOCX)
- Verificar que LibreOffice esté instalado en el servidor (`soffice` disponible en PATH)
- El sistema mostrará un mensaje claro si la conversión no está disponible
- En desarrollo local, puede que necesites instalar LibreOffice manualmente
- Los previews se cachean automáticamente después de la primera conversión

### El preview no se genera o muestra error
- Verificar permisos de acceso a la carpeta del documento
- Verificar que el documento exista y tenga `s3Key` válido
- Revisar logs del servidor para errores de conversión
- Intentar con `?regenerate=1` en la URL del preview para forzar regeneración

### Las carpetas individuales no aparecen en la vista HR
- **Es normal**: La vista HR principal solo muestra carpetas globales y compartidas
- Las carpetas individuales por empleado se acceden desde las carpetas globales
- Para ver carpetas de un empleado específico, usar la carpeta global correspondiente y filtrar por empleado

---

## 📞 Soporte

Para dudas o mejoras:
1. Revisar código en `lib/documentos.ts` (utilidades y constantes)
2. Revisar APIs en `app/api/documentos` y `app/api/carpetas`
3. Revisar `lib/documentos/preview.ts` para visualización
4. Verificar logs de consola para errores
5. Para problemas de conversión DOCX, verificar logs del servidor

---

## ✅ Checklist de Implementación

### Core del Sistema
- [x] Schema Prisma actualizado
- [x] Migraciones ejecutadas
- [x] 5 carpetas del sistema (Contratos, Nóminas, Justificantes, Personales, Médicos)
- [x] APIs de documentos (upload, download, delete, preview)
- [x] APIs de carpetas (create, list, view, delete)
- [x] API de preview de plantillas
- [x] Sistema de permisos implementado
- [x] Validaciones de archivos
- [x] Script de migración ejecutado
- [x] TypeScript sin errores
- [x] Compatible con Next.js 16

### Vistas y UI
- [x] Vista HR de carpetas (solo globales y compartidas)
- [x] Vista HR de detalle de carpeta
- [x] Vista HR con carpetas globales agregadas
- [x] Filtros por empleado en carpetas globales
- [x] Búsqueda en carpetas globales
- [x] Columna "Empleado" en carpetas globales
- [x] Vista Empleado de carpetas
- [x] Vista Empleado de detalle de carpeta
- [x] Modal de visualización de documentos
- [x] Modal de subida de documentos con selector de carpeta
- [x] Componente de upload simplificado

### Integraciones
- [x] Integración con creación de empleados (carpetas automáticas)
- [x] Integración con módulo de ausencias (justificantes)
- [x] Vinculación documento-ausencia (campo documentoId)
- [x] API `/api/upload` con creación de documento en BD
- [x] API `/api/empleados/me` para obtener empleado actual
- [x] Selector de carpetas reutilizable (CarpetaSelector)
- [x] Integración con onboarding (documentos en carpetas correspondientes)
- [x] Integración con offboarding (documentos de baja)

### Utilidades y Helpers
- [x] `obtenerOCrearCarpetaSistema()` - Crear/obtener carpeta de empleado
- [x] `obtenerOCrearCarpetaGlobal()` - Crear/obtener carpeta global
- [x] `getDocumentPreview()` - Generar preview de documento (con conversión DOCX)
- [x] `uploadFilesToCarpeta()` - Helper para uploads desde cliente
- [x] Constantes unificadas (CARPETAS_SISTEMA, TIPOS_DOCUMENTO)
- [x] Validaciones de archivos y carpetas
- [x] Hooks de integración
- [x] Hook `useDocumentViewer` para gestión de visualización

### Visualización y Preview
- [x] Endpoint de preview de documentos (`/api/documentos/[id]/preview`)
- [x] Conversión DOCX a PDF para preview
- [x] Caché de previews en S3
- [x] Componente `DocumentViewer` reutilizable
- [x] Integración en listas de documentos
- [x] Integración en flujo de firmas
- [x] Preview de plantillas en PDF
- [x] Headers de seguridad configurados

### Documentación
- [x] Documentación completa actualizada
- [x] Flujos de integración documentados
- [x] Ejemplos de uso de APIs
- [x] Guía de carpetas globales vs individuales
- [x] Preparación para Fase 2 (IA)
- [x] Documentación de visualización in-app
- [x] Changelog actualizado con v1.4.0

---

**Última actualización**: 2025-11-27  
**Versión**: 1.4.0  
**Status**: ✅ COMPLETADO Y FUNCIONAL

---

## 🆕 Changelog

### v1.5.0 (2025-11-28)

#### 🔧 Correcciones Críticas de Visualización

- **🐛 Fix: Visualización de PDFs in-app bloqueada**
  - **Problema**: Los visores nativos de PDF del navegador (Chrome, Firefox, Safari) no podían renderizar PDFs embebidos en iframes debido a CSP restrictiva
  - **Causa raíz**: `Content-Security-Policy: "default-src 'none'; style-src 'unsafe-inline'"` bloqueaba scripts, workers y fonts necesarios para el visor PDF
  - **Solución**: Nueva CSP específica por tipo MIME con permisos adecuados para PDFs
  
- **🔧 Helper Centralizado `getPreviewHeaders()`**:
  - Archivo: `lib/documentos/preview-headers.ts`
  - Gestiona todos los headers HTTP para endpoints de preview
  - CSP optimizada por tipo de contenido:
    - **PDFs**: `script-src 'unsafe-inline'`, `worker-src blob:`, `object-src 'self'`, `font-src 'self' data:`
    - **Imágenes**: Política restrictiva sin permisos de script
  - Headers de seguridad adicionales:
    - `X-Frame-Options: SAMEORIGIN` (explícito en respuestas)
    - `Cross-Origin-Embedder-Policy: require-corp`
    - `Cross-Origin-Resource-Policy: same-origin`
  - Cache-Control optimizado con `stale-while-revalidate`
  
- **🔐 Mejoras de Sandbox en iframe**:
  - Agregados permisos faltantes: `allow-downloads`, `allow-modals`, `allow-presentation`
  - Permite funcionalidad completa del visor nativo (descarga, impresión, pantalla completa)
  
- **✅ Endpoints actualizados**:
  - `GET /api/documentos/[id]/preview`: Usa `getPreviewHeaders()`
  - `GET /api/plantillas/[id]/preview`: Usa `getPreviewHeaders()`
  - Headers consistentes en todos los endpoints de preview

#### 📐 Mejoras de Arquitectura

- **DRY**: Un solo punto de configuración para headers de preview
- **Escalabilidad**: Fácil agregar nuevos tipos MIME con CSP específica
- **Debugging**: Función `validatePreviewHeaders()` para validación en desarrollo
- **Type Safety**: TypeScript completo con interfaces bien definidas

#### 🧪 Testing y Compatibilidad

- ✅ Chrome PDF Viewer: Funcional
- ✅ Firefox PDF.js: Funcional
- ✅ Safari PDF Viewer: Funcional
- ✅ Edge PDF Viewer: Funcional
- ✅ Conversión DOCX → PDF: Sin cambios, funciona correctamente
- ✅ Imágenes (JPG, PNG, GIF, WebP): Sin cambios, funcionales

---

### v1.4.0 (2025-11-27)

#### ✨ Visualización de Documentos In-App
- 📄 **Sistema completo de visualización**: Modal reutilizable `DocumentViewer` para visualizar documentos sin salir de la aplicación
  - PDFs e imágenes se muestran directamente
  - Documentos Word (DOCX) se convierten automáticamente a PDF
  - Caché inteligente en S3 para optimizar rendimiento (previews de DOCX se cachean)
  - Headers de seguridad estrictos (CSP, X-Content-Type-Options)
  
- 🔗 **Integración completa**:
  - Visualización integrada en listas de documentos (HR y Empleado)
  - Visualización en flujo de firmas (solicitar y firmar)
  - Visualización en previsualización de plantillas

#### 📤 Sistema de Upload Simplificado
- 🎯 **Nuevo componente `DocumentUploadArea`**: Upload inmediato sin colas complejas
  - Variantes: `minimal` (barra compacta) y `dropzone` (área de arrastrar)
  - Indicador de "Procesando..." simple y claro
  - Feedback inmediato con toasts
  
- 🔧 **Modal unificado `SubirDocumentosModal`**:
  - Selector de carpeta destino con búsqueda
  - Creación rápida de carpetas desde el modal
  - Drag & drop nativo
  - Upload secuencial para evitar saturación

- 🧹 **Simplificación de UX**:
  - Eliminado sistema de colas visible para el usuario
  - Procesamiento inmediato con feedback claro
  - Menos pasos, más intuitivo

#### 🌍 Carpetas Maestras Globales
- 📁 **Vista HR optimizada**:
  - Solo muestra carpetas globales y compartidas en el listado principal
  - Carpetas individuales por empleado no aparecen (evita miles de carpetas)
  - Al entrar a carpeta global, se muestran todos los documentos agregados
  - Filtros por empleado y búsqueda funcionan correctamente

#### 👁️ Previsualización de Plantillas Mejorada
- 📄 **Preview en PDF directo**:
  - Generación bajo demanda con datos reales del empleado
  - Visualización en iframe dentro del panel de plantillas
  - Selector de empleado para probar diferentes datos
  - Eliminado botón "Ver como PDF" (ahora es automático)
  - Eliminado renderizador DOCX complejo

- 🔧 **Mejoras técnicas**:
  - Endpoint `/api/plantillas/[id]/preview` optimizado
  - Manejo de errores mejorado
  - Headers de seguridad configurados

#### 🔐 Seguridad y Performance
- 🛡️ **Headers de seguridad**:
  - Content-Security-Policy estricto en endpoints de preview
  - X-Content-Type-Options: nosniff
  - Cache-Control configurado apropiadamente
  
- ⚡ **Optimizaciones**:
  - Caché de previews DOCX en S3 (evita reconversiones)
  - Generación lazy de previews (solo cuando se necesita)
  - Invalidación de caché cuando se actualiza documento

#### 🧩 Componentes y Arquitectura
- 📦 **Componentes reutilizables**:
  - `DocumentViewer`: Modal de visualización universal
  - `useDocumentViewer`: Hook para gestión de estado del viewer
  - `DocumentUploadArea`: Componente de upload simplificado
  - `SubirDocumentosModal`: Modal completo para subir documentos

- 🏗️ **Arquitectura mejorada**:
  - Separación de lógica de negocio en `lib/documentos/preview.ts`
  - Helper de upload en `lib/documentos/client-upload.ts`
  - APIs RESTful consistentes

#### 📚 Documentación
- 📖 Documentación actualizada con todas las nuevas funcionalidades
- 🔗 Ejemplos de uso de visualización y upload
- 🗺️ Guía de carpetas maestras explicada

---

### v1.3.0 (2025-01-27)

#### 🔄 Refactorización de Tipos de Documentos
- ✨ **Simplificación de tipos**: Reducidos a 4 tipos unificados (`contrato`, `nomina`, `justificante`, `otro`)
- 🔗 **Unificación Médicos/Justificantes**: Las carpetas "Médicos" y "Justificantes" comparten el tipo `justificante` a nivel de datos
- 📁 **Mapeo automático**: Cualquier carpeta personalizada (incluyendo "Personales") se mapea automáticamente a `otro`
- 🎯 **Inferencia automática**: El tipo de documento se infiere automáticamente desde el nombre de la carpeta si no se especifica
- 🛠️ **Funciones helper**: `inferirTipoDocumento()` y `obtenerTipoDocumentoDesdeCarpeta()` centralizan la lógica de mapeo
- 📊 **Límites de tamaño actualizados**: Justificantes (5MB), Otros (10MB), manteniendo Contratos (10MB) y Nóminas (2MB)

#### 🔧 Mejoras Técnicas
- ✅ Validación consistente en todos los endpoints de upload
- ✅ Normalización automática de tipos en `POST /api/documentos` y `POST /api/upload`
- ✅ Carpetas globales mejoradas para incluir documentos subidos directamente a la carpeta global
- ✅ Revalidación automática de páginas después de subir documentos

### v1.3.0 (2025-11-20)

#### ✨ Nuevas Funcionalidades
- 📤 **Sistema de Uploads Avanzado**: Nueva infraestructura para uploads con progress tracking, cola de archivos, reintentos y cancelación
  - Drag & drop nativo para selección de archivos
  - Cola de uploads secuencial con gestión automática
  - Progress tracking en tiempo real con ETA y velocidad de subida
  - Reintentos automáticos (configurable, default: 3 intentos)
  - Cancelación de uploads en progreso
  - Previsualización de imágenes antes de subir
  - Validación robusta con magic numbers para detectar archivos corruptos

#### 🔧 Mejoras Técnicas
- 🎣 **Hook Reutilizable**: `useFileUpload` en `lib/hooks/use-file-upload.ts`
  - Gestión de cola, progreso, errores, reintentos y cancelaciones
  - Validación centralizada de tipo, tamaño y magic numbers
  - Preview automático de imágenes
  - Callbacks configurables para eventos de cola
  
- 🧩 **Componentes UI Mejorados**:
  - `FileUploadAdvanced`: Componente principal con drag & drop
  - `FilePreview`: Preview de archivo con indicadores de estado visuales
  - `UploadProgress`: Barra de progreso con ETA y velocidad
  - `UploadErrorAlert`: Alertas de error con botón de retry
  
- ⚡ **APIs Modernizadas**:
  - `/api/upload` y `/api/documentos` soportan streaming con `Readable.fromWeb`
  - Rate limiting contextual (usuario + empresa + IP)
  - Nombres de archivo sanitizados automáticamente
  - Optimización de memoria para archivos grandes
  
- 🔐 **Validaciones Centralizadas**:
  - `lib/validaciones/file-upload.ts`: Validaciones reutilizables
  - `lib/utils/file-helpers.ts`: Utilidades de formateo, tipos y previews
  - Validación de magic numbers para detectar archivos corruptos
  - Validación de tipo MIME vs extensión
  
- 📦 **Integración Completa**:
  - ✅ HR Documentos: `app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx`
  - ✅ Empleado Documentos: `app/(dashboard)/empleado/mi-espacio/documentos/[id]/carpeta-detail-client.tsx`
  - ✅ Onboarding Individual: `components/documentos/subir-documento-individual.tsx`

#### 🎯 Beneficios
- ✅ Mejor UX: Feedback inmediato, progreso visible, errores claros
- ✅ Mayor confiabilidad: Reintentos automáticos, validación robusta
- ✅ Performance: Streaming para archivos grandes, rate limiting
- ✅ Escalabilidad: Sistema reutilizable en cualquier contexto
- ✅ Mantenibilidad: Código centralizado y bien tipado

#### 📚 Documentación
- 📖 Documentación actualizada en `docs/HOOKS_REUTILIZABLES.md`
- 🏗️ Arquitectura documentada en `docs/ARQUITECTURA.md`
- 🚀 Optimizaciones documentadas en `docs/OPTIMIZACION.md`

### v1.2.0 (2025-11-12)

#### ✨ Nuevas Funcionalidades
- 🗂️ **Selector de Carpeta en Onboarding/Offboarding**: HR puede elegir carpeta destino al subir documentos
  - Opción 1: Seleccionar carpeta existente del empleado
  - Opción 2: Crear nueva carpeta personalizada
  - Opción 3: Automático (crear carpeta "Onboarding" por defecto)
- 📁 **Clarificación de Tipos de Carpetas**: Documentación detallada de los 3 tipos de carpetas
  - Carpetas del Sistema Individuales (por empleado)
  - Carpetas Globales HR (con filtros)
  - Carpetas Compartidas Manuales (sin filtros especiales)

#### 🔧 Mejoras Técnicas
- 🔄 `subirDocumentoOnboarding()` acepta `carpetaId` o `carpetaDestino` (nombre) opcional
- 🎯 Endpoint `/api/empleados/[id]/onboarding/documentos` soporta selección de carpeta
- 🧩 Componente `CarpetaSelector` integrado en formularios de onboarding
- 📖 Documentación actualizada con ejemplos de flujos completos

#### 🛠️ Preparado para Futuro
- ✅ Compatible con sistema de Plantillas de Documentos (próxima implementación)
- ✅ Compatible con Firma Digital (próxima implementación)
- ✅ Estructura lista para generación automática de documentos desde plantillas

### v1.1.0 (2025-11-08)

### ✨ Nuevas Funcionalidades
- ➕ Añadida carpeta "Justificantes" a carpetas del sistema (ahora son 5)
- 🌍 Carpetas globales con agregación de documentos de todos los empleados
- 🔍 Filtros por empleado y búsqueda en carpetas globales
- 🔗 Vinculación documento-ausencia con campo `documentoId`
- 📤 API `/api/upload` mejorada para crear documentos en BD
- 👤 Endpoint `/api/empleados/me` para obtener empleado actual
- 🗂️ Componente `CarpetaSelector` reutilizable

### 🔧 Mejoras
- 📋 Constantes unificadas en `lib/documentos.ts` (CARPETAS_SISTEMA, TIPOS_DOCUMENTO)
- 🔄 Integración completa con módulo de ausencias
- 📊 Vista HR mejorada con tabla adaptativa (columna "Empleado" en globales)
- 🎨 UI mejorada con banners explicativos en carpetas globales
- 🛠️ Funciones helper: `obtenerOCrearCarpetaSistema()`, `obtenerOCrearCarpetaGlobal()`

### 📚 Documentación
- 📖 Documentación actualizada con todos los nuevos flujos
- 🔗 Ejemplos de integración con ausencias, onboarding, offboarding
- 📝 Sección "Integraciones del Sistema" ampliada
- 🗺️ Diferencias entre carpetas globales vs individuales explicadas

### 🔮 Preparado para Fase 2
- 🤖 Estructura lista para IA (campos `procesadoIA`, `datosExtraidos`)
- 🔗 Vinculaciones preparadas para contratos y nóminas
- 📡 Endpoints de extracción documentados









