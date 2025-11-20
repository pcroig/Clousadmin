# 🏗️ ARQUITECTURA - CLOUSADMIN

Documentación de la arquitectura del proyecto, decisiones técnicas y estructura del código.

---

## 📚 Índice

1. [Stack Tecnológico](#stack-tecnológico)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
4. [Flujo de Datos](#flujo-de-datos)
5. [Autenticación y Autorización](#autenticación-y-autorización)
6. [Base de Datos](#base-de-datos)

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript (strict mode)
- **React**: React 19
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Formularios**: react-hook-form + Zod
- **Gráficos**: Recharts
- **Estado**: React Server Components (sin Redux/Zustand)

### Backend
- **Runtime**: Node.js 18+
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Autenticación**: JWT con jose + bcryptjs
- **Validación**: Zod schemas

### Cloud & External (Opcional)
- **Storage**: Hetzner Object Storage (S3-compatible)
- **IA**: OpenAI GPT-4 Vision, Anthropic Claude, Google Gemini

---

## 📁 Estructura del Proyecto

```
Clousadmin/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rutas públicas (login, registro)
│   │   └── login/
│   ├── (dashboard)/              # Rutas protegidas
│   │   ├── empleado/             # Dashboard empleado
│   │   ├── hr/                   # Dashboard HR Admin
│   │   └── manager/              # Dashboard Manager
│   ├── api/                      # API Routes
│   │   ├── ausencias/
│   │   ├── denuncias/            # ✨ Canal de denuncias
│   │   ├── fichajes/
│   │   └── jornadas/
│   └── layout.tsx                # Layout principal
│
├── components/                   # Componentes React
│   ├── ui/                       # shadcn/ui (auto-generados)
│   ├── shared/                   # Componentes compartidos
│   ├── empleado/                 # Componentes específicos empleado
│   └── hr/                       # Componentes específicos HR
│
├── lib/                          # Utilidades y lógica de negocio
│   ├── auth.ts                   # Autenticación (JWT)
│   ├── prisma.ts                 # Cliente Prisma (singleton)
│   ├── s3.ts                     # Object Storage (Hetzner S3-compatible)
│   ├── rate-limit.ts             # Rate limiting (Redis + fallback)
│   ├── calculos/                 # Lógica de negocio
│   │   ├── ausencias.ts
│   │   ├── fichajes.ts
│   │   └── balance-horas.ts
│   ├── validaciones/             # Validaciones
│   │   ├── schemas.ts            # Zod schemas
│   │   ├── file-upload.ts        # Validaciones de archivos
│   │   ├── nif.ts
│   │   └── iban.ts
│   ├── hooks/                    # React hooks reutilizables
│   │   ├── use-api.ts            # Hook para GET requests
│   │   ├── use-mutation.ts       # Hook para POST/PATCH/DELETE
│   │   └── use-file-upload.ts    # Hook para uploads avanzados
│   ├── utils/                    # Utilidades generales
│   │   ├── file-helpers.ts       # Helpers de archivos (formato, tipos)
│   │   └── ...
│   └── ia/                       # Lógica IA
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma             # Schema de base de datos
│   ├── seed.ts                   # Datos de prueba
│   └── migrations/               # Migraciones (auto-generadas)
│
├── types/                        # TypeScript types
├── middleware.ts                 # Middleware de autenticación
├── .cursorrules                  # Reglas de desarrollo
└── docs/                         # Documentación
```

---

## 🎯 Decisiones Arquitectónicas

### 1. **Server Components por Defecto**

❌ **Evitar:**
```tsx
'use client';  // Solo usar cuando sea necesario

export function MiComponente() {
  const [data, setData] = useState([]);
  // Fetch en cliente
}
```

✅ **Preferir:**
```tsx
// Server Component (por defecto)
export default async function MiComponente() {
  const data = await prisma.tabla.findMany();
  return <UI data={data} />;
}
```

**Razón**: Mejor rendimiento, SEO, y menos JavaScript al cliente.

### 2. **Separación Data Fetching vs Presentación**

✅ **Patrón recomendado:**
```tsx
// page.tsx (Server Component)
async function obtenerDatos() {
  return await prisma.tabla.findMany();
}

export default async function Page() {
  const datos = await obtenerDatos();
  return <ClientComponent datos={datos} />;
}

// client-component.tsx
'use client';
export function ClientComponent({ datos }) {
  // Solo UI interactiva
}
```

**Razón**: Testeable, mantenible, escalable.

### 3. **API Routes para Mutaciones**

- **GET**: Server Components directo
- **POST/PATCH/DELETE**: API Routes

✅ **Patrón Actualizado (2025-01-27):**
```tsx
// app/api/ausencias/route.ts
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  createdResponse,
} from '@/lib/api-handler';

export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación centralizada
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // 2. Validación centralizada
    const validationResult = await validateRequest(req, schema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;
  
    // 3. Lógica de negocio
    const ausencia = await prisma.ausencia.create({ 
      data: {
        ...validatedData,
        empresaId: session.user.empresaId,
      },
    });
  
    // 4. Respuesta estandarizada
    return createdResponse(ausencia);
  } catch (error) {
    return handleApiError(error, 'API POST /api/ausencias');
  }
}
```

**Beneficios**:
- ✅ Código más limpio (-15 líneas por archivo)
- ✅ Manejo de errores centralizado
- ✅ Validación consistente
- ✅ Fácil mantenimiento

**Ver**: [API_REFACTORING.md](API_REFACTORING.md) para documentación completa.

### 4. **Validación en Todas las Capas**

1. **Frontend**: react-hook-form + Zod
2. **API**: Zod schemas
3. **Base de Datos**: Prisma constraints

### 5. **Multi-tenancy**

Todas las queries filtran por `empresaId`:
```tsx
const datos = await prisma.tabla.findMany({
  where: {
    empresaId: session.user.empresaId,  // SIEMPRE
  },
});
```

#### 5.1 Contexto multi-tenant vía headers

- El `middleware.ts` inyecta los headers `x-empresa-id`, `x-user-id`, `x-user-role` y `x-empleado-id` en todas las requests autenticadas. Esto permite que componentes anidados y utilidades lean el tenant actual sin volver a consultar Prisma.
- Puedes acceder a esos datos con `getTenantContextFromHeaders()` (en `lib/multi-tenant.ts`). Usa este helper **solo** cuando la request ya pasó por un `getSession()` validado (por ejemplo, subcomponentes de una página que ya hizo el check de sesión).
- `getSession()` sigue siendo la fuente de verdad para autenticación porque valida contra `sesionActiva` en la base de datos. No sustituyas `getSession()` por los headers en layouts/páginas/server actions que necesiten comprobar que la sesión sigue vigente o aplicar control de acceso.
- Patrón recomendado:

```tsx
// Page / server action
const session = await getSession(); // autentica y valida contra BD
if (!session) redirect('/login');

// Componentes o helpers que se montan después del redirect/guardado
const tenant = await getTenantContextFromHeaders();
// tenant nunca debe usarse para saltarse la validación anterior
```

---

## 🔐 Autenticación y Autorización

### Tipos de Invitación

El sistema maneja **dos tipos de invitaciones**:

1. **Invitación de Signup** (`InvitacionSignup`):
   - Para crear una nueva **empresa** y su primer HR Admin
   - Solo puede ser enviada por el administrador de la plataforma
   - Endpoint: `POST /api/admin/invitar-signup` (requiere `PLATFORM_ADMIN_SECRET_KEY`)
   - Ruta: `/signup?token=...`
   - Al completar, crea: Empresa + Usuario HR Admin + Empleado

2. **Invitación de Empleado** (`InvitacionEmpleado`):
   - Para añadir **empleados** a una empresa existente
   - Solo puede ser enviada por HR Admin de la empresa
   - Endpoint: `POST /api/empleados/invitar`
   - Ruta: `/onboarding/[token]`
   - Al completar, crea contraseña para el empleado existente

### Waitlist

Sistema de lista de espera para usuarios que quieren crear cuenta pero no tienen invitación:

- Acceso: `/waitlist` o desde `/login` si el email no existe
- Almacenamiento: Tabla `Waitlist`
- Conversión: Administrador puede convertir entrada de waitlist en invitación

📖 **Ver documentación completa:** [`docs/funcionalidades/autenticacion.md`](funcionalidades/autenticacion.md)

### Flujo de Autenticación

```
1. Usuario → POST /api/auth/login
2. Servidor valida credenciales (bcryptjs)
3. Genera JWT (jose)
4. Guarda en cookie httpOnly
5. Middleware verifica JWT en cada request
6. Server Components usan getSession()
```

### Roles

- **hr_admin**: Acceso total
- **manager**: Acceso a su equipo
- **empleado**: Acceso a sus datos

### Implementación

```tsx
// lib/auth.ts
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME);
  if (!token) return null;
  return verifyToken(token.value);
}

// middleware.ts
export async function middleware(request: NextRequest) {
  const session = await getSession();
  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

---

## 💾 Base de Datos

### Convenciones Prisma

```prisma
model Empleado {
  id        String   @id @default(uuid())
  nombre    String
  apellidos String
  email     String   @unique
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relaciones (plural para one-to-many)
  ausencias Ausencia[]
  fichajes  Fichaje[]
  
  // Foreign keys
  empresaId String
  empresa   Empresa @relation(fields: [empresaId], references: [id])
  
  @@index([empresaId])
  @@map("empleados")  // Plural en DB
}
```

### Migraciones

```bash
# Crear nueva migración
npx prisma migrate dev --name add_field

# Aplicar migraciones (producción)
npx prisma migrate deploy

# Regenerar cliente
npx prisma generate
```

---

## 🔄 Flujo de Datos

### Ejemplo: Solicitar Ausencia

```
1. [UI] Empleado rellena formulario
   ↓ (react-hook-form + Zod)
2. [Cliente] Validación frontend
   ↓ (POST /api/ausencias)
3. [API] Validación backend (Zod)
   ↓
4. [API] Verificar sesión y permisos
   ↓
5. [API] Validar saldo disponible
   ↓
6. [Prisma] Crear ausencia en DB
   ↓
7. [API] Retornar ausencia creada
   ↓
8. [UI] Actualizar y mostrar confirmación
```

---

## 📊 Patrones de Código

### 1. Manejo de Errores

```tsx
// ✅ BUENO
try {
  const result = await operacion();
  return { success: true, data: result };
} catch (error) {
  console.error('[Context]', error);
  
  if (error instanceof PrismaClientKnownRequestError) {
    return { success: false, error: 'Error de base de datos' };
  }
  
  if (error instanceof z.ZodError) {
    return { success: false, error: 'Datos inválidos', details: error.errors };
  }
  
  return { success: false, error: 'Error desconocido' };
}
```

### 2. Logging

```tsx
console.error('[API GET Ausencias]', error);  // Siempre con contexto
```

### 3. Tipos TypeScript

```tsx
// ✅ Definir tipos explícitos
interface AusenciaData {
  tipo: string;
  fechaInicio: Date;
  fechaFin: Date;
}

// ❌ Evitar 'any'
function procesar(data: any) { ... }
```

---

## 🚀 Performance

### 1. Evitar N+1 Queries

```tsx
// ❌ MAL
const empleados = await prisma.empleado.findMany();
for (const emp of empleados) {
  const ausencias = await prisma.ausencia.findMany({ where: { empleadoId: emp.id } });
}

// ✅ BIEN
const empleados = await prisma.empleado.findMany({
  include: {
    ausencias: true,
  },
});
```

### 2. Indexes en Prisma

```prisma
model Ausencia {
  @@index([empleadoId])
  @@index([fechaInicio, fechaFin])
}
```

---

## 📁 Sistema de Uploads Avanzado

### Arquitectura

El sistema de uploads está diseñado para ser **escalable, eficiente y reutilizable**:

**Componentes principales**:
- `lib/hooks/use-file-upload.ts` - Hook principal con gestión de cola, progreso, reintentos y cancelación
- `components/shared/file-upload-advanced.tsx` - Componente UI con drag & drop
- `lib/utils/file-helpers.ts` - Utilidades de formateo, tipos y previews
- `lib/validaciones/file-upload.ts` - Validaciones centralizadas (tipo, tamaño, magic numbers)

### Flujo de Upload

```
1. [UI] Usuario selecciona archivos (drag & drop o click)
   ↓
2. [Hook] useFileUpload valida archivos (tipo, tamaño, magic numbers)
   ↓
3. [Hook] Agrega archivos a cola y genera previews (si es imagen)
   ↓
4. [Hook] Procesa cola secuencialmente (uno por uno)
   ↓
5. [Handler] UploadHandler ejecuta XMLHttpRequest con tracking de progreso
   ↓
6. [API] /api/upload o /api/documentos procesa con streaming
   ↓
7. [Storage] Upload a Hetzner S3 (o local en desarrollo)
   ↓
8. [Hook] Actualiza estado (success/error) y permite reintentos
```

### Características

**Performance**:
- ✅ Streaming uploads con `Readable.fromWeb` para archivos grandes
- ✅ Upload secuencial para evitar saturar el servidor
- ✅ Progress tracking en tiempo real con XMLHttpRequest
- ✅ Rate limiting contextual (usuario + empresa + IP)

**UX**:
- ✅ Drag & drop nativo
- ✅ Previsualización de imágenes antes de subir
- ✅ Barra de progreso con ETA y velocidad de subida
- ✅ Reintentos automáticos (configurable, default: 3)
- ✅ Cancelación de uploads en progreso
- ✅ Validación inmediata de tipo y tamaño
- ✅ Indicadores de estado visuales (queued, uploading, success, error, cancelled)

**Validación**:
- ✅ Tipo MIME (configurable)
- ✅ Tamaño máximo (configurable, default: 5MB)
- ✅ Magic numbers para detectar archivos corruptos
- ✅ Límite de archivos en cola (configurable, default: 10)
- ✅ Validación centralizada reutilizable (cliente + servidor)

**Integración**:
- ✅ APIs modernizadas: `/api/upload` y `/api/documentos` con streaming
- ✅ Integrado en HR documentos y Empleado documentos
- ✅ Integrado en onboarding individual (extracción IA)
- ✅ Preparado para reutilización en cualquier contexto

### Uso en Componentes

```tsx
import { FileUploadAdvanced } from '@/components/shared/file-upload-advanced';
import { useFileUpload, type UploadHandler } from '@/lib/hooks/use-file-upload';

function MiComponente() {
  const handleUpload: UploadHandler = useCallback(
    ({ file, signal, onProgress }) => {
      // Implementación con XMLHttpRequest para progress tracking
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.(event.loaded, event.total);
        }
      };
      // ... configuración y manejo de abort signal
      return new Promise((resolve) => { /* ... */ });
    },
    [/* dependencies */]
  );

  return (
    <FileUploadAdvanced
      onUpload={handleUpload}
      acceptedTypes={['application/pdf', 'image/jpeg', 'image/png']}
      maxSizeMB={10}
      allowMultiple
      autoUpload
    />
  );
}
```

### Componentes UI Relacionados

- `components/shared/file-upload-advanced.tsx` - Componente principal con drag & drop
- `components/ui/file-preview.tsx` - Preview de archivo con indicadores de estado
- `components/ui/upload-progress.tsx` - Barra de progreso con ETA y velocidad
- `components/ui/upload-error-alert.tsx` - Alertas de error con botón de retry

---

## 📝 Próximos Pasos

- Implementar auto-completado de fichajes
- ✅ Integrar Hetzner Object Storage para documentos (completado)
- ✅ Sistema de uploads avanzado con progress tracking (completado)
- Implementar IA para extracción de datos
- Tests unitarios e integración

---

**Versión**: 1.3
**Última actualización**: 20 de noviembre 2025
**Cambios**: Agregado sistema de uploads avanzado con progress tracking, streaming, rate limiting y componentes reutilizables
