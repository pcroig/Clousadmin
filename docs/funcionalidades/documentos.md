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
  tipoDocumento: String // 'contrato' | 'nomina' | 'medico' | 'personal' | 'otro'
  mimeType: String
  tamano: Int
  s3Key: String // Ruta del archivo (local en MVP, S3 en futuro)
  s3Bucket: String
  procesadoIA: Boolean // Preparado para Fase 2
  datosExtraidos: Json? // Preparado para Fase 2
}
```

### Carpetas del Sistema (Automáticas)

Cada empleado tiene 4 carpetas creadas automáticamente:

1. **📄 Contratos** (`esSistema: true`)
   - Contratos laborales
   - Modificaciones
   - Anexos
   - Finiquitos

2. **💰 Nóminas** (`esSistema: true`)
   - PDFs de nóminas mensuales
   - Por ahora solo storage (validaciones en Fase 2)

3. **👤 Personales** (`esSistema: true`)
   - DNI/NIE/Pasaporte
   - Certificado bancario
   - Certificado SS
   - Títulos académicos

4. **🏥 Médicos** (`esSistema: true`)
   - Partes de baja
   - Justificantes médicos
   - Se vinculan a ausencias

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

#### `POST /api/documentos`
Upload de documentos (multipart/form-data)

**Body:**
```json
{
  "file": File,
  "carpetaId": "uuid",
  "empleadoId": "uuid",
  "tipoDocumento": "contrato|nomina|medico|personal|otro"
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
    "esSistema": true
  },
  "documentos": [...],
  "subcarpetas": [...]
}
```

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
- Click en una carpeta para ver su contenido
- Dentro de la carpeta podrás:
  • Ver todos los documentos en formato tabla
  • Descargar documentos
  • Eliminar documentos
  • Subir nuevos documentos
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
2. Click en "Subir Documentos"
3. Seleccionar archivos
4. Documentos se suben con validaciones automáticas
```

### Para Empleados

#### Ver Mis Documentos
```
Navegar a: /empleado/mi-espacio/documentos
- Tab "Personales": Tus 4 carpetas del sistema
  • Contratos (solo lectura)
  • Nóminas (solo lectura)
  • Personales (puedes subir archivos)
  • Médicos (puedes subir archivos)
- Tab "Compartidos": Carpetas compartidas por la empresa
- Click en cualquier carpeta para ver su contenido
- Dentro de la carpeta podrás:
  • Ver todos los documentos en formato tabla
  • Descargar documentos
  • Subir documentos (solo en Personales y Médicos)
```

#### Subir Documentos Personales
```
1. Click en carpeta "Personales" o "Médicos"
2. Click en "Subir Archivo"
3. Seleccionar archivo (validación automática)
```

---

## ✅ Validaciones Implementadas

### Archivos

**Formatos permitidos:**
- PDF (principal)
- Imágenes: JPG, PNG, HEIC
- Office: DOCX, XLSX

**Tamaños máximos:**
- Contratos: 10MB
- Nóminas: 2MB
- Personales: 5MB
- Médicos: 5MB

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

### Actual (MVP): Filesystem Local
```
/uploads/
  ├─ [empresaId]/
  │   ├─ [empleadoId]/
  │   │   ├─ contratos/
  │   │   ├─ nominas/
  │   │   ├─ personales/
  │   │   └─ medicos/
  │   └─ compartidos/
  │       └─ [carpetaId]/
```

### Futuro (Fase 2): AWS S3
El código ya está preparado con campos `s3Key` y `s3Bucket` en el modelo.

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

## 🔄 Integración con Creación de Empleados

### Opción 1: Automática (Recomendada)
```typescript
import { crearEmpleadoConCarpetas } from '@/lib/hooks/use-crear-empleado';

const empleado = await crearEmpleadoConCarpetas({
  nombre: 'Ana',
  apellidos: 'García',
  email: 'ana@empresa.com',
  empresaId: 'uuid',
  // ... otros campos
});
// Las carpetas se crean automáticamente en la transacción
```

### Opción 2: Post-hook
```typescript
import { postCrearEmpleado } from '@/lib/hooks/use-crear-empleado';

// Después de crear un empleado
await postCrearEmpleado(nuevoEmpleado.id, empresaId);
```

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
- 🔜 Migración a AWS S3
- 🔜 CDN para descargas rápidas

---

## 📝 Notas Técnicas

### Estructura de Carpetas del Sistema
Cada empleado tiene automáticamente 4 carpetas:
1. **Contratos** - Contratos laborales, modificaciones, anexos
2. **Nóminas** - PDFs de nóminas mensuales
3. **Personales** - DNI, certificados bancarios, títulos
4. **Médicos** - Justificantes médicos, bajas IT

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
- El campo `s3Key` se usa para el path local en MVP, será la key de S3 en Fase 2
- Validación en cada API usando `getSession()` y verificando rol

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
   - Compatible con Next.js 15 (async params)

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

- [x] Schema Prisma actualizado
- [x] Migraciones ejecutadas
- [x] APIs de documentos (upload, download, delete)
- [x] APIs de carpetas (create, list, view, delete)
- [x] Vista HR de carpetas
- [x] Vista HR de detalle de carpeta
- [x] Vista Empleado de carpetas
- [x] Vista Empleado de detalle de carpeta
- [x] Sistema de permisos implementado
- [x] Validaciones de archivos
- [x] Carpetas automáticas para empleados
- [x] Script de migración ejecutado
- [x] Hooks de integración
- [x] Documentación completa
- [x] TypeScript sin errores
- [x] Compatible con Next.js 15
- [x] Preparado para Fase 2

---

**Última actualización**: 2025-01-27  
**Versión**: 1.0.0 MVP  
**Status**: ✅ COMPLETADO Y FUNCIONAL









