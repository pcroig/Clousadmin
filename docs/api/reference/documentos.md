# Referencia API - Documentos

**Última actualización:** 4 de diciembre de 2025
**Estado:** Referencia completa de endpoints. Ver funcionalidad detallada en [`docs/funcionalidades/documentos.md`](../../funcionalidades/documentos.md).

---

## Endpoints de Documentos

| Endpoint | Método | Descripción | Permisos |
|----------|--------|-------------|----------|
| `/api/documentos` | GET | Listado de documentos con filtros | Todos |
| `/api/documentos` | POST | Subida de documento (multipart) | HR Admin, Empleado (carpetas permitidas) |
| `/api/documentos/[id]` | GET | Descargar documento | HR Admin, Propietario, Asignados |
| `/api/documentos/[id]/preview` | GET | Preview in-app (PDF/imagen/DOCX→PDF) | HR Admin, Propietario, Asignados |
| `/api/documentos/[id]` | DELETE | Eliminar documento | HR Admin |

---

## Endpoints de Carpetas

| Endpoint | Método | Descripción | Permisos |
|----------|--------|-------------|----------|
| `/api/carpetas` | GET | Listar carpetas (filtradas por permisos) | Todos |
| `/api/carpetas` | POST | Crear carpeta compartida | HR Admin |
| `/api/carpetas/[id]` | GET | Ver contenido de carpeta | HR Admin, Propietario, Asignados |
| `/api/carpetas/[id]` | DELETE | Eliminar carpeta vacía | HR Admin |
| `/api/carpetas/[id]/empleados-con-acceso` | GET | Lista empleados con acceso a carpeta | HR Admin |

---

## Detalles de Endpoints

### **GET `/api/documentos`**

Lista documentos accesibles para el usuario actual.

**Query params:**
```
?carpetaId=uuid        // Filtrar por carpeta
&empleadoId=uuid       // Filtrar por empleado (solo HR Admin)
&tipoDocumento=contrato|nomina|justificante|otro
```

**Filtros automáticos por rol:**
- **Empleado**: Solo ve sus documentos propios y compartidos asignados
- **HR Admin**: Ve todos los documentos de la empresa

**Response:**
```json
{
  "documentos": [
    {
      "id": "uuid",
      "nombre": "Contrato.pdf",
      "tipoDocumento": "contrato",
      "carpetaId": "uuid",
      "empleadoId": "uuid",
      "tamano": 102400,
      "mimeType": "application/pdf",
      "createdAt": "2025-12-04T10:00:00Z"
    }
  ]
}
```

---

### **GET `/api/documentos/[id]/preview`**

Visualización in-app de documentos con conversión automática.

**Query params:**
```
?regenerate=1  // Forzar regeneración de preview DOCX
```

**Conversión automática:**
- **PDFs**: Se sirven directamente
- **Imágenes** (JPG, PNG, GIF, WebP): Se sirven directamente
- **DOCX**: Se convierten automáticamente a PDF (con caché)

**Headers de respuesta:**
- `Content-Type`: Según tipo de documento
- `Content-Security-Policy`: Optimizada por tipo MIME
- `X-Frame-Options: SAMEORIGIN`
- `Cache-Control`: Con `stale-while-revalidate`

**Response:** Stream del documento/preview

**Errores:**
- `403`: Sin permisos
- `404`: Documento no encontrado
- `415`: Tipo de archivo no soportado para preview

---

### **POST `/api/carpetas`**

Crear carpeta compartida (solo HR Admin).

**Body:**
```json
{
  "nombre": "Políticas 2025",
  "compartida": true,
  "asignadoA": "todos|equipo:<id>|empleado:<id1>,empleado:<id2>"
}
```

**Validación:**
- Solo HR Admin puede crear carpetas compartidas
- Empleados no pueden crear carpetas manualmente (se crean automáticamente)

---

### **GET `/api/carpetas`**

Lista carpetas accesibles según permisos.

**Filtros automáticos:**

**Para Empleados:**
```sql
WHERE (
  empleadoId = <empleadoId>  -- Carpetas propias
  OR (
    empleadoId IS NULL
    AND compartida = true
    AND (
      asignadoA = 'todos'
      OR asignadoA LIKE '%empleado:<empleadoId>%'
    )
  )
)
```

**Para HR Admin:**
```sql
WHERE empleadoId IS NULL  -- Solo carpetas master y compartidas
```

---

## Sistema de Permisos

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Ver propias carpetas | ✅ | ✅ | ✅ |
| Ver carpetas de equipo | ❌ | ✅ | ✅ |
| Ver todas las carpetas | ❌ | ❌ | ✅ |
| Subir a Justificantes/Otros | ✅ | ❌ | ✅ |
| Subir a Contratos/Nóminas | ❌ | ❌ | ✅ |
| Crear carpetas compartidas | ❌ | ❌ | ✅ |
| Eliminar documentos | ❌ | ❌ | ✅ |
| Eliminar carpetas | ❌ | ❌ | ✅ |

---

## Tipos de Carpetas

### **1. Carpetas del Sistema (4 tipos)**
Definidas en `CARPETAS_SISTEMA`: Contratos, Nóminas, Justificantes, Otros

- Se crean automáticamente para cada empleado
- `esSistema: true`, `empleadoId: <id>`

### **2. Carpetas Master HR**
Vista agregada de documentos de todos los empleados:

- `esSistema: true`, `empleadoId: null`, `compartida: true`
- Incluyen filtros por empleado y búsqueda
- Solo visible para HR Admin

### **3. Carpetas Compartidas Custom**
Creadas manualmente por HR:

- `esSistema: false`, `empleadoId: null`, `compartida: true`
- Asignadas a todos, equipos o empleados específicos

---

## Recursos Relacionados

**Backend:**
- `app/api/documentos/route.ts` - Lista y upload
- `app/api/documentos/[id]/route.ts` - Descarga, delete
- `app/api/documentos/[id]/preview/route.ts` - Preview in-app
- `app/api/carpetas/route.ts` - Lista y creación
- `app/api/carpetas/[id]/route.ts` - Vista detalle
- `lib/documentos.ts` - Lógica de negocio
- `lib/documentos/preview.ts` - Conversión DOCX→PDF
- `lib/documentos/preview-headers.ts` - Headers de seguridad

**Frontend:**
- `app/(dashboard)/hr/documentos/*` - Vistas HR
- `app/(dashboard)/empleado/mi-espacio/documentos/*` - Vistas Empleado
- `components/shared/document-viewer.tsx` - Visor de documentos
- `components/shared/document-upload-area.tsx` - Upload component




