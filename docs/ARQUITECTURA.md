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
- **AWS**: S3, RDS, Cognito, SES
- **IA**: OpenAI GPT-4 Vision

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
│   ├── calculos/                 # Lógica de negocio
│   │   ├── ausencias.ts
│   │   ├── fichajes.ts
│   │   └── balance-horas.ts
│   ├── validaciones/             # Validaciones
│   │   ├── schemas.ts            # Zod schemas
│   │   ├── nif.ts
│   │   └── iban.ts
│   └── ia/                       # Lógica IA (futuro)
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

## 📝 Próximos Pasos

- Implementar auto-completado de fichajes
- Integrar AWS S3 para documentos
- Implementar IA para extracción de datos
- Tests unitarios e integración

---

**Versión**: 1.2
**Última actualización**: 8 de noviembre 2025
**Cambios**: Agregado Canal de Denuncias, Header global, sistema de notificaciones
