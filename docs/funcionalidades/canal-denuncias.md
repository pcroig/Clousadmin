# 🛡️ DOCUMENTACIÓN: CANAL DE DENUNCIAS - SISTEMA COMPLETO

**Versión**: 1.0
**Fecha**: 8 Noviembre 2025
**Estado**: Sistema completo y operativo

---

## 📋 RESUMEN EJECUTIVO

### ✅ COMPLETADO

1. **Base de Datos**: Modelo `Denuncia` implementado con soporte para denuncias anónimas y documentos adjuntos
2. **API Routes**: CRUD completo con permisos por rol (empleados crean, HR gestiona)
3. **Sistema de Notificaciones**: Integración completa con prioridad crítica para HR
4. **UI Empleados**: Modal de creación accesible desde header global con opción de anonimato
5. **UI HR**: Lista completa con filtros y página de detalle con gestión de estado
6. **Seguridad**: Sistema de permisos robusto, denuncias anónimas sin rastro de identidad

---

## 📊 ESTADO DETALLADO POR COMPONENTE

### 1. BASE DE DATOS

#### ✅ Modelo `Denuncia`

```prisma
model Denuncia {
  id              String  @id @default(uuid())
  empresaId       String
  denuncianteId   String? // NULL si es anónima

  // Contenido de la denuncia
  descripcion     String  @db.Text
  fechaIncidente  DateTime? @db.Date
  ubicacion       String? @db.Text

  // Estado y seguimiento
  estado          String  @default("pendiente") @db.VarChar(50)
  prioridad       String  @default("media") @db.VarChar(50)

  // Anonimato
  esAnonima       Boolean @default(false)

  // Asignación (HR)
  asignadaA       String? // Usuario ID (HR admin)
  asignadaEn      DateTime?

  // Resolución
  resueltaEn      DateTime?
  resolucion      String? @db.Text
  notasInternas   String? @db.Text

  // Documentos adjuntos (S3 keys en JSON)
  documentos      Json?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  empresa         Empresa  @relation(...)
  denunciante     Empleado? @relation(...) // NULL si anónima
}
```

**Estados disponibles:**
- `pendiente` (default) - Recién recibida, sin revisar
- `en_revision` - HR está investigando
- `resuelta` - Caso cerrado con resolución
- `archivada` - Archivada sin acción

**Prioridades:**
- `baja` - Asunto menor
- `media` (default) - Prioridad estándar
- `alta` - Requiere atención pronto
- `critica` - Requiere atención inmediata

#### ✅ Índices Optimizados

```prisma
@@index([empresaId, estado])
@@index([denuncianteId])
@@index([asignadaA])
@@index([createdAt])
```

---

### 2. API ROUTES

#### ✅ IMPLEMENTADOS

| Endpoint | Método | Rol | Estado | Notas |
|----------|--------|-----|--------|-------|
| `/api/denuncias` | POST | Empleado | ✅ | Crear denuncia (anónima o identificada) |
| `/api/denuncias` | GET | HR Admin | ✅ | Listar todas las denuncias de la empresa |
| `/api/denuncias/[id]` | GET | HR / Denunciante | ✅ | Ver detalle (HR o denunciante si NO anónima) |
| `/api/denuncias/[id]` | PATCH | HR Admin | ✅ | Actualizar estado, prioridad, asignación, resolución |

#### 📝 Detalles de Implementación

**POST `/api/denuncias`** - Crear denuncia
- **Body**:
  ```typescript
  {
    descripcion: string (min 10 chars),
    fechaIncidente?: string (ISO date),
    ubicacion?: string,
    esAnonima: boolean,
    documentos?: Array<{id, nombre, s3Key, mimeType, tamano, uploadedAt}>
  }
  ```
- **Validación**: Schema con Zod
- **Permisos**: Solo empleados (requiere `empleadoId` en sesión)
- **Comportamiento**:
  - Si `esAnonima = true`: `denuncianteId` = NULL
  - Si `esAnonima = false`: `denuncianteId` = empleadoId del usuario
  - Crea notificación automática a todos los HR Admins

**GET `/api/denuncias`** - Listar denuncias
- **Query params**: `estado` (opcional: 'pendiente', 'en_revision', 'resuelta', 'archivada', 'todas')
- **Permisos**: Solo HR Admin
- **Retorna**: Array de denuncias con datos de denunciante (si no anónima)

**GET `/api/denuncias/[id]`** - Ver detalle
- **Permisos**:
  - HR Admin: puede ver todas de su empresa
  - Empleado: solo sus propias denuncias NO anónimas
- **Retorna**: Denuncia completa con relaciones

**PATCH `/api/denuncias/[id]`** - Actualizar
- **Body**:
  ```typescript
  {
    estado?: 'pendiente' | 'en_revision' | 'resuelta' | 'archivada',
    prioridad?: 'baja' | 'media' | 'alta' | 'critica',
    asignadaA?: string | null,
    resolucion?: string,
    notasInternas?: string
  }
  ```
- **Permisos**: Solo HR Admin
- **Comportamiento**:
  - Si `estado = 'resuelta'`: actualiza `resueltaEn` automáticamente
  - Si cambia `asignadaA`: actualiza `asignadaEn`
  - Si cambia `estado` y NO es anónima: envía notificación al denunciante

---

### 3. SISTEMA DE NOTIFICACIONES

#### ✅ Tipos de Notificación

**`denuncia_recibida`** - Nueva denuncia
- **Destinatarios**: Todos los HR Admins de la empresa
- **Prioridad**: `critica`
- **Metadata**:
  ```typescript
  {
    denunciaId: string,
    esAnonima: boolean,
    prioridad: 'critica',
    accionUrl: '/hr/denuncias/{id}',
    accionTexto: 'Revisar denuncia'
  }
  ```
- **Título**: "Nueva denuncia recibida"
- **Mensaje**: Incluye si es anónima y preview de descripción (100 chars)

**`denuncia_actualizada`** - Cambio de estado
- **Destinatarios**: Denunciante (solo si NO es anónima)
- **Prioridad**: `alta`
- **Metadata**:
  ```typescript
  {
    denunciaId: string,
    nuevoEstado: string,
    prioridad: 'alta',
    accionUrl: '/empleado/denuncias/{id}',
    accionTexto: 'Ver denuncia'
  }
  ```
- **Título**: "Actualización en tu denuncia"
- **Mensaje**: Personalizado según el nuevo estado

#### ✅ Funciones en `lib/notificaciones.ts`

```typescript
export async function crearNotificacionDenunciaRecibida(
  prisma: PrismaClient,
  params: {
    denunciaId: string;
    empresaId: string;
    esAnonima: boolean;
    descripcionBreve: string;
  }
)

export async function crearNotificacionDenunciaActualizada(
  prisma: PrismaClient,
  params: {
    denunciaId: string;
    empresaId: string;
    empleadoId: string;
    nuevoEstado: string;
    mensaje: string;
  }
)
```

---

### 4. COMPONENTES UI - EMPLEADOS

#### ✅ Header Global

**Ubicación**: `components/layout/header.tsx`

- **Descripción**: Barra superior presente en todas las páginas del dashboard
- **Botón**: "Canal de denuncias" con icono Shield (lucide-react)
- **Comportamiento**:
  - **Empleados/Managers**: Abre modal de creación
  - **HR Admin**: Redirige a `/hr/denuncias`

#### ✅ Modal de Creación

**Ubicación**: `components/empleado/crear-denuncia-modal.tsx`

**Campos del formulario:**
1. **Descripción** (obligatorio)
   - Textarea con mínimo 10 caracteres
   - Placeholder: "Describe la situación con el mayor detalle posible..."
   - 6 filas de altura

2. **Fecha del incidente** (opcional)
   - Input tipo date
   - Permite registrar fecha aproximada

3. **Ubicación/Contexto** (opcional)
   - Input texto
   - Ejemplo: "Oficina Madrid, reunión de equipo, email..."

4. **Enviar de forma anónima** (checkbox)
   - Checkbox destacado en fondo gris
   - Texto explicativo: "Si marcas esta opción, tu identidad no será registrada y no recibirás actualizaciones sobre el estado de la denuncia"

**Alertas de confidencialidad:**
- Alert informativo en parte superior
- Mensaje: "Todas las denuncias son tratadas con la máxima confidencialidad y revisadas exclusivamente por el equipo de Recursos Humanos"

**Validación:**
- Descripción mínimo 10 caracteres (validación client-side y server-side)
- Toast de éxito diferenciado para anónimas vs identificadas

**UX:**
- Modal responsive (max-width: 2xl)
- Scroll vertical si contenido excede altura
- Botones: "Cancelar" (outline) + "Enviar denuncia" (primary con loading)

---

### 5. COMPONENTES UI - HR ADMIN

#### ✅ Página Lista

**Ubicación**: `app/(dashboard)/hr/denuncias/page.tsx` (Server) + `denuncias-client.tsx` (Client)

**Características:**
- **Header**: TableHeader con icono Shield, título "Canal de Denuncias", subtítulo con contador
- **Filtros**:
  - Búsqueda por descripción o nombre denunciante
  - Filtro por estado: Todas / Pendientes / En revisión / Resueltas / Archivadas
- **Tabla**: DataTable con columnas:
  1. **Denunciante**: Avatar + nombre (o "Anónima" con icono Shield)
  2. **Descripción**: Truncada a 100 caracteres con ellipsis
  3. **Prioridad**: Badge con colores (baja=azul, media=amarillo, alta=naranja, crítica=rojo)
  4. **Estado**: Badge con colores (pendiente=amarillo, en_revision=azul, resuelta=verde, archivada=gris)
  5. **Fecha**: Formato "dd MMM yyyy" (locale español)

**Navegación**: Click en fila redirige a `/hr/denuncias/[id]`

#### ✅ Página Detalle

**Ubicación**: `app/(dashboard)/hr/denuncias/[id]/page.tsx` (Server) + `denuncia-detail.tsx` (Client)

**Layout**: Grid 2 columnas (main content + sidebar)

**Sección principal (col-span-2):**

1. **Card Descripción**
   - Descripción completa con whitespace preservado

2. **Card Detalles**
   - Fecha del incidente (si existe)
   - Ubicación/contexto (si existe)
   - Tipo: Badge "Denuncia Anónima" (si aplica)

3. **Card Gestión** (formulario de actualización)
   - **Estado**: Select con 4 opciones
   - **Prioridad**: Select con 4 opciones
   - **Asignar a**: Select con HR Admins (incluye opción "Sin asignar")
   - **Resolución**: Textarea para describir resolución
   - **Notas internas**: Textarea para notas privadas de HR
   - **Botón**: "Guardar cambios" con loading state

**Sidebar (col-span-1):**

1. **Card Denunciante**
   - Si anónima: Icono Shield + mensaje "Denuncia anónima"
   - Si identificada: Avatar + nombre + email + teléfono

2. **Card Estado actual**
   - Estado: Badge con label en español
   - Prioridad: Badge con color
   - Fecha de resolución (si resuelta)

**Header de página:**
- Botón atrás (arrow-left) a `/hr/denuncias`
- Título "Detalle de Denuncia"
- Subtítulo con fecha de recepción

---

### 6. SEGURIDAD Y PRIVACIDAD

#### ✅ Protección de Datos

**Denuncias anónimas:**
- `denuncianteId` = NULL en base de datos
- No se almacena ningún dato identificativo
- No se envían notificaciones de actualización
- HR no puede ver quién la creó

**Denuncias identificadas:**
- `denuncianteId` almacenado normalmente
- Usuario puede ver el estado de su denuncia
- Recibe notificaciones de cambios de estado
- HR puede ver datos del denunciante

#### ✅ Control de Acceso

**Empleados:**
- ✅ Pueden crear denuncias (anónimas o identificadas)
- ✅ Pueden ver sus propias denuncias NO anónimas
- ❌ No pueden ver denuncias de otros
- ❌ No pueden actualizar denuncias
- ❌ No pueden ver lista de denuncias

**Managers:**
- ✅ Pueden crear denuncias (igual que empleados)
- ❌ No tienen acceso especial a denuncias

**HR Admin:**
- ✅ Pueden ver todas las denuncias de su empresa
- ✅ Pueden actualizar estado, prioridad, asignación
- ✅ Pueden agregar resolución y notas internas
- ✅ Pueden asignar denuncias a otros HR admins
- ✅ Ven datos del denunciante (si NO anónima)

#### ✅ Validaciones

**Server-side (API):**
- Validación con Zod en todos los endpoints
- Verificación de rol en cada request
- Verificación de empresa (multi-tenant)
- Descripción mínimo 10 caracteres

**Client-side (UI):**
- Validación de longitud de descripción
- Feedback inmediato con toast
- Estados de loading durante requests

---

### 7. FLUJO DE USUARIO

#### 🎯 Flujo Empleado - Crear Denuncia

1. Usuario hace click en botón "Canal de denuncias" en header
2. Se abre modal con formulario
3. Usuario completa:
   - Descripción de la situación (obligatorio)
   - Fecha del incidente (opcional)
   - Ubicación/contexto (opcional)
   - Marca/desmarca checkbox "Enviar de forma anónima"
4. Click en "Enviar denuncia"
5. Validación client-side (mín 10 chars)
6. POST a `/api/denuncias`
7. Sistema crea denuncia con estado `pendiente`
8. Sistema envía notificación a todos los HR Admins
9. Toast de éxito al usuario
10. Modal se cierra

#### 🎯 Flujo HR - Gestionar Denuncia

1. HR recibe notificación crítica "Nueva denuncia recibida"
2. Click en notificación → redirige a `/hr/denuncias/[id]`
   - O navega a `/hr/denuncias` y click en fila de tabla
3. Ve detalle completo de la denuncia
4. Puede actualizar:
   - Estado (pendiente → en_revision → resuelta)
   - Prioridad (si es crítica, alta, etc.)
   - Asignación (a sí mismo o a otro HR)
   - Resolución (campo de texto libre)
   - Notas internas (visible solo para HR)
5. Click en "Guardar cambios"
6. PATCH a `/api/denuncias/[id]`
7. Si cambia estado y denuncia NO es anónima:
   - Sistema envía notificación al denunciante
8. Toast de éxito
9. Página se actualiza (router.refresh)

---

### 8. CARACTERÍSTICAS TÉCNICAS

#### ✅ Tecnologías Utilizadas

- **Backend**: Next.js App Router (Server Actions)
- **Base de datos**: PostgreSQL + Prisma ORM
- **Validación**: Zod schemas
- **UI**: shadcn/ui components (Dialog, Badge, Card, Textarea, etc.)
- **Iconos**: lucide-react (Shield, Calendar, MapPin, etc.)
- **Fechas**: date-fns (formato español)
- **Notificaciones**: Sistema centralizado en `lib/notificaciones.ts`
- **Autenticación**: Sistema de sesiones existente

#### ✅ Patrones de Código

- **Server/Client separation**: Server Components para data fetching, Client Components para interactividad
- **API Routes**: RESTful con handlers separados por método HTTP
- **Validación centralizada**: Schemas de Zod reutilizables
- **Error handling**: try/catch con `handleApiError` utility
- **Multi-tenant**: Todas las queries filtradas por `empresaId`
- **Typescript**: Fully typed (interfaces, types)

#### ✅ Optimizaciones

- **Índices de BD**: Optimizados para queries comunes (empresaId, estado, denuncianteId)
- **Relaciones Prisma**: Include solo campos necesarios
- **Client Components**: useState para estado local, useRouter para navegación
- **Loading States**: LoadingButton component en formularios

---

### 9. MEJORAS FUTURAS (OPCIONALES)

#### 🔮 Posibles Extensiones

1. **Upload de documentos adjuntos**
   - Integración con S3 existente
   - Campo `documentos` ya preparado (JSON)
   - Botón de upload en modal de creación

2. **Sistema de comentarios internos**
   - Modelo `DenunciaComentario` (relacionado a Denuncia)
   - Timeline de comentarios en página de detalle
   - Solo visible para HR

3. **Estados intermedios personalizados**
   - Permitir a HR crear estados custom
   - Tabla `EstadoDenuncia` configurable por empresa

4. **Reportes y estadísticas**
   - Dashboard de métricas de denuncias
   - Gráficos de tendencias (por tipo, por mes)
   - Tiempo promedio de resolución

5. **Categorización de denuncias**
   - Tipos predefinidos: Acoso, Discriminación, Fraude, etc.
   - Selector en modal de creación
   - Filtros adicionales en lista de HR

6. **Escalación automática**
   - Si denuncia crítica no se revisa en X días
   - Notificación a HR director o platform admin

7. **Integración con compliance**
   - Export a PDF de denuncias resueltas
   - Reportes de cumplimiento normativo
   - Auditoría de accesos

---

## 🎯 RESUMEN DE ARCHIVOS

### Base de Datos
- `prisma/schema.prisma` - Modelo Denuncia agregado
- `prisma/migrations/20251108124922_add_denuncias/` - Migración aplicada

### API Routes
- `app/api/denuncias/route.ts` - GET (listar) + POST (crear)
- `app/api/denuncias/[id]/route.ts` - GET (detalle) + PATCH (actualizar)

### Componentes
- `components/layout/header.tsx` - Header global con botón
- `components/empleado/crear-denuncia-modal.tsx` - Modal de creación

### Páginas HR
- `app/(dashboard)/hr/denuncias/page.tsx` - Server Component lista
- `app/(dashboard)/hr/denuncias/denuncias-client.tsx` - Client Component lista
- `app/(dashboard)/hr/denuncias/[id]/page.tsx` - Server Component detalle
- `app/(dashboard)/hr/denuncias/[id]/denuncia-detail.tsx` - Client Component detalle

### Lógica de Negocio
- `lib/notificaciones.ts` - Funciones `crearNotificacionDenunciaRecibida` y `crearNotificacionDenunciaActualizada`

### Layout
- `app/(dashboard)/layout.tsx` - Layout principal con Header

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Modelo de BD creado y migrado
- [x] Índices optimizados agregados
- [x] API POST crear denuncia implementada
- [x] API GET listar denuncias implementada
- [x] API GET detalle implementada
- [x] API PATCH actualizar implementada
- [x] Validación con Zod en todos los endpoints
- [x] Permisos por rol verificados
- [x] Sistema de notificaciones integrado
- [x] Modal de creación con campos completos
- [x] Opción de anonimato funcional
- [x] Header global con botón agregado
- [x] Página lista HR con filtros
- [x] Página detalle HR con formulario
- [x] Badges de estado y prioridad con colores
- [x] Manejo de denuncias anónimas
- [x] Formateo de fechas en español
- [x] Build exitoso sin errores
- [x] Documentación completa

---

## 📞 SOPORTE

Para dudas o problemas con el canal de denuncias:
- Revisar logs de aplicación para errores de API
- Verificar permisos de usuario en base de datos
- Comprobar que el modelo Denuncia está sincronizado con Prisma Client
- Verificar que las notificaciones funcionan correctamente

**Estado**: ✅ Sistema completamente funcional y listo para producción
