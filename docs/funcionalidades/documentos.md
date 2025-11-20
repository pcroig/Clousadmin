# 📁 Sistema de Gestión Documental

**Estado**: ✅ Implementado y Funcional  
**Versión**: 1.0.0 MVP  
**Fecha de finalización**: 2 de Noviembre 2025

---

## 🎯 Resumen Ejecutivo

Sistema completo de gestión documental con:
- ✅ Carpetas automáticas por empleado (Contratos, Nóminas, Personales, Médicos)
- ✅ Upload y descarga de documentos con validaciones
- ✅ Sistema de permisos (HR, Empleados, Managers)
- ✅ Vista jerárquica de carpetas y documentos
- ✅ Carpetas compartidas (HR Admin)
- ✅ Preparado para IA en Fase 2

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
- Verás todas las carpetas de la empresa
- Carpetas con ícono 🌍 son globales (agregan documentos de todos los empleados)
- Click en una carpeta para ver su contenido
- Dentro de la carpeta podrás:
  • Ver todos los documentos en formato tabla
  • En carpetas globales: filtrar por empleado y buscar
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
```
1. Navegar a la carpeta destino
2. Click en "Subir Documentos" o arrastra archivos al área de drop
3. Seleccionar archivos (múltiples archivos permitidos)
4. Sistema muestra:
   - Preview de archivos antes de subir
   - Progreso de subida en tiempo real (porcentaje, velocidad, ETA)
   - Estado de cada archivo (en cola, subiendo, completado, error)
5. Validaciones automáticas:
   - Tipo de archivo (PDF, JPG, PNG)
   - Tamaño máximo (configurable, default: 10MB)
   - Magic numbers (detección de archivos corruptos)
6. Reintentos automáticos en caso de error (hasta 3 intentos)
7. Cancelación de uploads en progreso disponible
```

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
2. Click en "Subir Documentos" o arrastra archivos al área de drop
3. Seleccionar archivo(s) - múltiples archivos permitidos
4. Sistema muestra progreso en tiempo real con:
   - Barra de progreso por archivo
   - Velocidad de subida y tiempo restante (ETA)
   - Previsualización de imágenes antes de subir
5. Validaciones automáticas antes y durante la subida
6. Reintentos automáticos si hay error de red
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
```

**Características:**
- URLs firmadas para descargas seguras
- Eliminación automática al borrar documentos
- Migración automática desde storage local (ver `scripts/migrate-documents-to-s3.ts`)

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
│       └── route.ts                           # GET (download), DELETE
└── carpetas/
    ├── route.ts                               # POST (create), GET (list)
    └── [id]/
        └── route.ts                           # GET (view), DELETE

scripts/
└── crear-carpetas-empleados-existentes.ts     # Script de migración
```

### Frontend
```
app/(dashboard)/
├── hr/
│   └── documentos/
│       ├── page.tsx                           # Lista de carpetas
│       ├── documentos-client.tsx              # Cliente con modal crear
│       └── [id]/
│           ├── page.tsx                       # Vista detalle carpeta
│           └── carpeta-detail-client.tsx      # Cliente con upload/download/delete
└── empleado/
    └── mi-espacio/
        └── documentos/
            ├── page.tsx                       # Lista de carpetas (tabs)
            ├── documentos-client.tsx          # Cliente con tabs personal/compartido
            └── [id]/
                ├── page.tsx                   # Vista detalle carpeta
                └── carpeta-detail-client.tsx  # Cliente con upload/download
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
- 🔜 Versionado de documentos
- 🔜 Firma electrónica
- 🔜 Workflow de aprobación
- 🔜 OCR para documentos escaneados
- 🔜 CDN para descargas rápidas

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
- Verificar rol del usuario en sesión

---

## 📞 Soporte

Para dudas o mejoras:
1. Revisar código en `lib/documentos.ts` (utilidades y constantes)
2. Revisar APIs en `app/api/documentos` y `app/api/carpetas`
3. Verificar logs de consola para errores

---

## ✅ Checklist de Implementación

### Core del Sistema
- [x] Schema Prisma actualizado
- [x] Migraciones ejecutadas
- [x] 5 carpetas del sistema (Contratos, Nóminas, Justificantes, Personales, Médicos)
- [x] APIs de documentos (upload, download, delete)
- [x] APIs de carpetas (create, list, view, delete)
- [x] Sistema de permisos implementado
- [x] Validaciones de archivos
- [x] Script de migración ejecutado
- [x] TypeScript sin errores
- [x] Compatible con Next.js 16

### Vistas y UI
- [x] Vista HR de carpetas
- [x] Vista HR de detalle de carpeta
- [x] Vista HR con carpetas globales agregadas
- [x] Filtros por empleado en carpetas globales
- [x] Búsqueda en carpetas globales
- [x] Columna "Empleado" en carpetas globales
- [x] Vista Empleado de carpetas
- [x] Vista Empleado de detalle de carpeta

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
- [x] Constantes unificadas (CARPETAS_SISTEMA, TIPOS_DOCUMENTO)
- [x] Validaciones de archivos y carpetas
- [x] Hooks de integración

### Documentación
- [x] Documentación completa actualizada
- [x] Flujos de integración documentados
- [x] Ejemplos de uso de APIs
- [x] Guía de carpetas globales vs individuales
- [x] Preparación para Fase 2 (IA)

---

**Última actualización**: 2025-01-27  
**Versión**: 1.3.0 MVP  
**Status**: ✅ COMPLETADO Y FUNCIONAL

---

## 🆕 Changelog

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









