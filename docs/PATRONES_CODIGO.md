# 🛠️ PATRONES DE CÓDIGO - CLOUSADMIN

Patrones específicos y ejemplos de código para el proyecto.

---

## 📝 TypeScript Patterns

### ⏱️ Formateo de tiempos relativos

Utiliza `formatRelativeTime` para mostrar fechas relativas en interfaz (ej. "hace 2 días", "dentro de 3 horas").

```typescript
import { formatRelativeTime } from '@/lib/utils/formatRelativeTime';

// Mostrar "Hace 5 min"
const creado = formatRelativeTime(solicitud.fechaCreacion, {
  locale: 'es',
  minimalUnit: 'minute',
  style: 'short',
});

// Mostrar "Dentro de 2 d"
const proximaRevision = formatRelativeTime(tarea.proximaRevision, {
  locale: 'es',
  minimalUnit: 'day',
  style: 'short',
});
```

- Mantén `locale: 'es'` para coherencia.
- Usa `minimalUnit` para evitar resultados como "hace 0 segundos".
- Centraliza lógica relativa en `lib/utils/formatRelativeTime.ts` antes de crear nuevos helpers.

### Type Safety
```typescript
// ✅ GOOD: Explicit types
interface EmpleadoFormData {
  nombre: string;
  apellidos: string;
  email: string;
  fechaAlta: Date;
  departamentoId: string;
}

// ✅ GOOD: Zod schema for validation
import { z } from 'zod';

const empleadoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  apellidos: z.string().min(1, "Apellidos requeridos"),
  email: z.string().email("Email inválido"),
  fechaAlta: z.date(),
  departamentoId: z.string().uuid()
});

// ❌ BAD: Using 'any'
function processData(data: any) { ... }

// ✅ GOOD: Generic with constraints
function processData<T extends EmpleadoFormData>(data: T) { ... }

// ✅ GOOD: Unknown obliga a validar antes de usar
function parseResponse(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Formato inesperado');
  }
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  // ...
}

// ❌ BAD: @ts-ignore tapa el error sin solucionarlo
// ✅ Preferir @ts-expect-error documentando la excepción y arreglarla cuanto antes
```

---

## 🚀 Next.js Patterns

### Server Components vs Client Components
```typescript
// ✅ DEFAULT: Server Component (no 'use client')
// app/empleado/dashboard/page.tsx
export default async function EmpleadoDashboard() {
  const empleado = await prisma.empleado.findUnique(...);
  return <Dashboard empleado={empleado} />;
}

// ✅ USE CLIENT: Only when needed (interactivity, hooks, browser APIs)
// components/empleado/WidgetFichar.tsx
'use client';

import { useState } from 'react';

export function WidgetFichar() {
  const [tiempo, setTiempo] = useState(0);
  // Uses useState, needs 'use client'
}
```

### API Routes
```typescript
// app/api/empleados/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { empleadoSchema } from '@/lib/validaciones/schemas';

// GET /api/empleados
export async function GET(req: NextRequest) {
  try {
    const empleados = await prisma.empleado.findMany({
      include: { departamento: true }
    });
    return NextResponse.json(empleados);
  } catch (error) {
    console.error('Error fetching empleados:', error);
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
      { status: 500 }
    );
  }
}

// POST /api/empleados
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = empleadoSchema.parse(body);

    const empleado = await prisma.empleado.create({
      data: validatedData
    });

    return NextResponse.json(empleado, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Error al crear empleado' },
      { status: 500 }
    );
  }
}
```

### Server Actions
```typescript
// app/empleado/ausencias/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

export async function solicitarAusencia(formData: FormData) {
  const fechaInicio = new Date(formData.get('fechaInicio') as string);
  const fechaFin = new Date(formData.get('fechaFin') as string);
  const empleadoId = formData.get('empleadoId') as string;

  const ausencia = await prisma.ausencia.create({
    data: {
      empleadoId,
      fechaInicio,
      fechaFin,
      tipo: 'vacaciones',
      estado: 'pendiente'
    }
  });

  revalidatePath('/empleado/ausencias');
  return { success: true, ausencia };
}
```

---

## 💾 Prisma Patterns

### Schema Conventions
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ✅ GOOD: Singular table names, camelCase fields
model empleado {
  id        String   @id @default(uuid())
  nombre    String
  apellidos String
  email     String   @unique
  nif       String?  @unique

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations (plural for one-to-many)
  ausencias Ausencia[]
  fichajes  Fichaje[]
  documentos Documento[]

  // Foreign keys
  empresaId String
  empresa   Empresa @relation(fields: [empresaId], references: [id])

  @@index([empresaId])
  @@index([email])
  @@map("empleados") // Maps to plural table name in DB
}

model ausencia {
  id           String   @id @default(uuid())
  tipo         String   // 'vacaciones', 'baja_medica', 'permiso'
  fechaInicio  DateTime
  fechaFin     DateTime
  estado       String   @default("pendiente") // 'pendiente', 'aprobada', 'rechazada'

  empleadoId   String
  empleado     Empleado @relation(fields: [empleadoId], references: [id])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([empleadoId])
  @@index([fechaInicio, fechaFin])
  @@map("ausencias")
}
```

### Query Patterns
```typescript
// ✅ GOOD: Use Prisma client singleton
import { prisma } from '@/lib/prisma';

// ✅ GOOD: Avoid N+1 queries with include/select
const empleados = await prisma.empleado.findMany({
  include: {
    departamento: true,
    ausencias: {
      where: { estado: 'aprobada' },
      orderBy: { fechaInicio: 'desc' }
    }
  }
});

// ✅ GOOD: Use selects reutilizables from lib/prisma/selects.ts
import { empleadoSelectListado } from '@/lib/prisma/selects';

const empleados = await prisma.empleado.findMany({
  where: { empresaId, activo: true },
  select: empleadoSelectListado, // Evita cargar relaciones innecesarias
  orderBy: { apellidos: 'asc' }
});

// ✅ GOOD: Batch processing instead of loops with queries
// ❌ BAD: N+1 query problem
const empleados = await prisma.empleado.findMany();
for (const emp of empleados) {
  const ausencias = await prisma.ausencia.findMany({
    where: { empleadoId: emp.id }
  });
}

// ✅ GOOD: Precarga con findMany + Map para lookups O(1)
const fichajeIds = autoCompletados.map(ac => ac.fichajeId).filter(Boolean);
const fichajesBatch = await prisma.fichaje.findMany({
  where: { id: { in: fichajeIds } },
  include: { empleado: { include: { jornada: true } } }
});
const fichajesMap = new Map(fichajesBatch.map(f => [f.id, f]));

// Ahora lookup O(1) sin queries adicionales
for (const ac of autoCompletados) {
  const fichaje = fichajesMap.get(ac.fichajeId); // ✅ Sin query adicional
}

// ✅ GOOD: Batch processing para cálculos complejos
import { calcularBalanceMensualBatch } from '@/lib/calculos/balance-horas';

// ❌ BAD: Loop con queries N+1
for (const empleado of empleados) {
  const balance = await calcularBalanceMensual(empleado.id, mes, anio); // Query x empleado
}

// ✅ GOOD: Batch processing una sola vez
const empleadoIds = empleados.map(e => e.id);
const balancesBatch = await calcularBalanceMensualBatch(
  empresaId,
  empleadoIds,
  mes,
  anio
);
// Ahora acceso O(1) sin queries adicionales
for (const empleado of empleados) {
  const balance = balancesBatch.get(empleado.id); // ✅ Sin query adicional
}

// ✅ GOOD: Query única por rango + agrupación en memoria
// ❌ BAD: Query por cada evento
const eventos = await prisma.eventoNomina.findMany();
for (const evento of eventos) {
  const compensaciones = await prisma.compensacionHoraExtra.findMany({
    where: { 
      empresaId,
      createdAt: { gte: inicioMes, lt: finMes } // Query x evento
    }
  });
}

// ✅ GOOD: Una query con rango completo + agrupación
const rangoInicio = eventos[0] ? calcularInicioPrimerEvento() : null;
const rangoFin = eventos[eventos.length - 1] ? calcularFinUltimoEvento() : null;
const compensacionesBatch = await prisma.compensacionHoraExtra.findMany({
  where: {
    empresaId,
    createdAt: { gte: rangoInicio, lt: rangoFin } // ✅ Una sola query
  }
});

// Agrupar en memoria por mes
const compensacionesPorMes = compensacionesBatch.reduce((acc, comp) => {
  const key = `${comp.createdAt.getFullYear()}-${comp.createdAt.getMonth() + 1}`;
  if (!acc[key]) acc[key] = [];
  acc[key].push(comp);
  return acc;
}, {} as Record<string, typeof compensacionesBatch>);

// ✅ GOOD: Use transactions for multi-step operations
await prisma.$transaction(async (tx) => {
  const empleado = await tx.empleado.create({ data: empleadoData });
  await tx.documento.createMany({
    data: carpetasDefecto.map(nombre => ({
      nombre,
      tipo: 'carpeta',
      empleadoId: empleado.id
    }))
  });
});
```

---

## 👤 Hover Cards para Empleados

### Patrón: Información Contextual Uniforme

Usa `EmpleadoHoverCard` para mostrar información del empleado (rol, equipo, email, estado) de forma consistente en toda la plataforma.

```typescript
import { EmpleadoHoverCard } from '@/components/empleado/empleado-hover-card';
import { EmployeeAvatar } from '@/components/shared/employee-avatar';

// ✅ GOOD: En widgets con avatar
<EmpleadoHoverCard
  empleado={{
    nombre: solicitud.empleado.nombre,
    apellidos: solicitud.empleado.apellidos,
    puesto: solicitud.empleado.puesto,
    email: solicitud.empleado.email,
    equipoNombre: solicitud.empleado.equipoNombre,
    fotoUrl: solicitud.empleado.fotoUrl,
  }}
  estado={{ label: 'Pendiente de aprobación' }}
>
  <EmployeeAvatar nombre={solicitud.empleado.nombre} fotoUrl={solicitud.empleado.fotoUrl} size="sm" />
</EmpleadoHoverCard>

// ✅ GOOD: En tablas con nombre
<EmpleadoHoverCard
  empleado={{
    nombre: ausencia.empleado.nombre,
    apellidos: ausencia.empleado.apellidos,
    puesto: ausencia.empleado.puesto,
    email: ausencia.empleado.email,
    equipoNombre: ausencia.empleado.equipoNombre,
    fotoUrl: ausencia.empleado.fotoUrl,
  }}
  estado={{
    label: getAusenciaEstadoLabel(ausencia.estado),
    description: getTipoBadge(ausencia.tipo),
  }}
  side="right"
>
  {ausencia.empleado.nombre} {ausencia.empleado.apellidos}
</EmpleadoHoverCard>
```

**Reglas importantes:**
- ✅ El hover card muestra **siempre la misma información** (rol, equipo, email) independientemente del contexto
- ✅ El `estado` es opcional y contextual (ausencia, fichaje, solicitud)
- ✅ Usa `side="right"` en tablas para evitar que el card se salga de la pantalla
- ✅ No cambia de color al hacer hover (mantiene el estilo del trigger)
- ❌ No uses metadatos específicos del contexto (fechas, horas, etc.) - solo información del empleado

**Queries que deben incluir datos del empleado:**
```typescript
// ✅ GOOD: Incluir email, puesto, equipos en queries
const ausencias = await prisma.ausencia.findMany({
  include: {
    empleado: {
      select: {
        nombre: true,
        apellidos: true,
        puesto: true,
        email: true,
        fotoUrl: true,
        equipos: {
          select: {
            equipo: {
              select: {
                nombre: true,
              },
            },
          },
          take: 1,
        },
      },
    },
  },
});
```

**Componentes que usan hover cards:**
- `SolicitudesWidget` - avatares y nombres
- `PlantillaWidget` - avatares en categorías
- Tablas de Ausencias - nombres en mobile y desktop
- Tablas de Fichajes - nombres en mobile y desktop

---

## 🎨 shadcn/ui Patterns

### Installation
```bash
# Initialize shadcn/ui (run once)
npx shadcn@latest init

# Add components as needed
npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add calendar
npx shadcn@latest add hover-card  # Para EmpleadoHoverCard
```

### Component Patterns
```typescript
// ✅ GOOD: Use shadcn/ui components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';

export function EmpleadoForm() {
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="nombre"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <Input {...field} />
          </FormItem>
        )}
      />
      <Button type="submit">Guardar</Button>
    </Form>
  );
}

// ❌ BAD: Don't modify shadcn/ui components directly
// Edit components/ui/button.tsx - DON'T DO THIS
// Instead, create a wrapper or extend via className
```

---

## 🔐 Security Patterns

### Environment Variables
```typescript
// ✅ GOOD: Validate env vars at startup
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  // Hetzner Object Storage (S3-compatible)
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string(),
  STORAGE_ACCESS_KEY: z.string(),
  STORAGE_SECRET_KEY: z.string(),
  STORAGE_BUCKET: z.string(),
  ENABLE_CLOUD_STORAGE: z.boolean(),
  // AI Providers
  OPENAI_API_KEY: z.string().startsWith('sk-').optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  // Email (Resend)
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string().email(),
  // Auth (JWT - Cognito ya no se usa)
  NEXTAUTH_SECRET: z.string().min(32),
});

export const env = envSchema.parse(process.env);
```

### Input Validation
```typescript
// ✅ GOOD: Always validate user inputs with Zod
import { z } from 'zod';

const nifSchema = z.string().regex(/^\d{8}[A-Z]$/, "NIF inválido");
const ibanSchema = z.string().regex(/^ES\d{22}$/, "IBAN español inválido");

// Validate before database operations
const validatedNif = nifSchema.parse(userInput.nif);
```

### Authentication Checks
```typescript
// ✅ GOOD: Check auth in Server Components and API Routes
import { getServerSession } from 'next-auth';

export default async function ProtectedPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Check role-based access
  if (session.user.role !== 'HR_ADMIN') {
    return <div>Acceso denegado</div>;
  }

  return <AdminDashboard />;
}
```

---

## 🧪 Testing Patterns

### Test Structure
```
tests/
├── unit/           # Fast, isolated logic tests
│   ├── calculos/   # Business logic (ausencias, fichajes, balance-horas)
│   ├── validaciones/ # Validation utilities (IBAN, NIF)
│   └── ia/         # AI extraction logic (mocked OpenAI calls)
├── integration/    # Database, external API tests
│   ├── api/        # API route tests
│   └── prisma/     # Database queries
└── e2e/            # Full user workflows (Playwright)
```

### Testing Patterns
```typescript
// Use Vitest (faster than Jest for Next.js)
import { describe, it, expect, vi } from 'vitest';
import { calcularSaldoVacaciones } from '@/lib/calculos/ausencias';

describe('calcularSaldoVacaciones', () => {
  it('calcula correctamente días disponibles', () => {
    const empleado = {
      fechaAlta: new Date('2024-01-01'),
      diasVacacionesAnuales: 22
    };

    const ausencias = [
      { tipo: 'vacaciones', dias: 5 },
      { tipo: 'vacaciones', dias: 3 }
    ];

    const saldo = calcularSaldoVacaciones(empleado, ausencias);
    expect(saldo).toBe(14); // 22 - 5 - 3
  });
});

// Mock external services
vi.mock('@/lib/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: '{"nombre": "Test"}' } }]
        })
      }
    }
  }
}));
```

---

## 👤 Avatar Components

### EmployeeAvatar (Componente Unificado)

**Siempre usa `EmployeeAvatar` para renderizar avatares de empleados.** Este componente centraliza la lógica de avatares, asegurando consistencia visual y comportamiento uniforme.

```typescript
// ✅ GOOD: Usar EmployeeAvatar
import { EmployeeAvatar } from '@/components/shared/employee-avatar';

<EmployeeAvatar
  nombre={empleado.nombre}
  apellidos={empleado.apellidos}
  fotoUrl={empleado.fotoUrl}
  size="md"
/>

// ❌ BAD: Implementación manual duplicada
<Avatar>
  <AvatarImage src={empleado.fotoUrl} />
  <AvatarFallback>{getInitials(empleado.nombre)}</AvatarFallback>
</Avatar>
```

**Tamaños disponibles:**
- `xs`: 24x24px (text-[10px])
- `sm`: 32x32px (text-xs)
- `md`: 48x48px (text-base) - **default**
- `lg`: 64x64px (text-lg)
- `xl`: 80x80px (text-xl)

**Props personalizables:**
```typescript
<EmployeeAvatar
  nombre="María"
  apellidos="García López"
  fotoUrl="https://..."
  size="lg"
  className="border-2 border-primary" // Clases adicionales
  fallbackClassName="text-sm"         // Override tamaño texto fallback
  fallbackContent={<UserIcon />}      // Contenido custom para fallback
  alt="Foto de perfil de María"       // Alt text para accesibilidad
/>
```

**Fuente de datos:**
- **Siempre usar `empleado.fotoUrl`** como fuente única de verdad
- El campo `usuario.avatar` está deprecado y no debe usarse
- En APIs y queries, siempre incluir `fotoUrl: true` en el select de Prisma

```typescript
// ✅ GOOD: Incluir fotoUrl en queries
const empleado = await prisma.empleado.findUnique({
  where: { id },
  select: {
    id: true,
    nombre: true,
    apellidos: true,
    fotoUrl: true, // Siempre incluir
  },
});

// ✅ GOOD: Usar fotoUrl en componentes
<EmployeeAvatar
  nombre={empleado.nombre}
  apellidos={empleado.apellidos}
  fotoUrl={empleado.fotoUrl}
/>
```

**Obtener avatar del usuario actual (Server Components):**
- Usa la función helper `getCurrentUserAvatar(session)` para obtener el avatar del usuario actual
- Esta función consulta `empleado.fotoUrl` de forma eficiente y maneja fallbacks automáticamente

```typescript
// ✅ GOOD: Usar helper para obtener avatar del usuario actual
import { getSession, getCurrentUserAvatar } from '@/lib/auth';

export default async function MyPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  
  const avatarUrl = await getCurrentUserAvatar(session);
  // avatarUrl es string | null, obtenido desde empleado.fotoUrl
  
  return <EmployeeAvatar fotoUrl={avatarUrl} />;
}

// ❌ BAD: Consultar directamente sin helper (duplica lógica)
const empleado = await prisma.empleado.findUnique({
  where: { id: session.user.empleadoId },
  select: { fotoUrl: true },
});
```

**AvatarCell (Para tablas):**
Para celdas de tabla con avatar + nombre, usa `AvatarCell`:

```typescript
import { AvatarCell } from '@/components/shared/data-table';

// En definición de columnas
{
  id: 'nombre',
  header: 'Nombre',
  cell: (row) => (
    <AvatarCell
      nombre={row.nombre}
      apellidos={row.apellidos}
      fotoUrl={row.fotoUrl}
      subtitle={row.puesto}
      compact={isMobile}
    />
  ),
}
```

**Subida de avatares:**
- Endpoint: `POST /api/empleados/[id]/avatar`
- Formato: FormData con campo `file`
- Validación: JPG/PNG/WEBP, máx. 2MB
- Almacenamiento: Hetzner Object Storage con ACL `public-read`

```typescript
// ✅ GOOD: Subir avatar
const formData = new FormData();
formData.append('file', file);

const response = await fetch(`/api/empleados/${empleadoId}/avatar`, {
  method: 'POST',
  body: formData,
});

const { url } = await response.json();
// El avatar se actualiza automáticamente en empleado.fotoUrl
```

---

## 📊 Tablas Unificadas (DataTable Pattern)

### Regla Principal: Siempre usar DataTable

**Todas las tablas del sistema deben usar el componente `DataTable` compartido** para garantizar:
- ✅ Estilo visual consistente (header grisaceo, filas completas)
- ✅ EmptyState de shadcn integrado
- ✅ Responsive design con columnas priorizadas
- ✅ Código centralizado y reutilizable

```typescript
// ✅ GOOD: Usar DataTable con columnas tipadas
import { AvatarCell, DataTable, type Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { CalendarIcon } from 'lucide-react';

interface Ausencia {
  id: string;
  empleado: {
    nombre: string;
    apellidos: string;
    puesto: string;
    fotoUrl: string | null;
  };
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
}

const columns: Column<Ausencia>[] = [
  {
    id: 'empleado',
    header: 'Empleado',
    cell: (row) => (
      <AvatarCell
        nombre={row.empleado.nombre}
        apellidos={row.empleado.apellidos}
        fotoUrl={row.empleado.fotoUrl}
        subtitle={row.empleado.puesto}
      />
    ),
    sticky: true, // Primera columna sticky en mobile
    priority: 'high', // Siempre visible
  },
  {
    id: 'tipo',
    header: 'Tipo',
    cell: (row) => <Badge>{getTipoBadge(row.tipo)}</Badge>,
    priority: 'high',
  },
  {
    id: 'fechas',
    header: 'Fechas',
    align: 'center', // Header centrado con contenido
    cell: (row) => (
      <div className="text-center">
        {format(new Date(row.fechaInicio), 'dd MMM')} - {format(new Date(row.fechaFin), 'dd MMM')}
      </div>
    ),
    priority: 'medium', // Oculta en mobile pequeño
  },
  {
    id: 'estado',
    header: 'Estado',
    align: 'center',
    cell: (row) => {
      if (row.estado === 'pendiente') {
        return (
          <div className="flex justify-center gap-2">
            <Button variant="ghost" size="sm">Aprobar</Button>
            <Button variant="ghost" size="sm">Rechazar</Button>
          </div>
        );
      }
      return <Badge>{getEstadoBadge(row.estado)}</Badge>;
    },
    priority: 'high',
  },
];

// Usar en componente
<DataTable
  columns={columns}
  data={ausencias}
  getRowId={(row) => row.id}
  onRowClick={(row) => handleOpenModal(row)}
  emptyContent={
    <EmptyState
      layout="table"
      icon={CalendarIcon}
      title="No hay ausencias registradas"
      description="Cambia el periodo o ajusta los filtros para ver registros."
    />
  }
/>
```

### AvatarCell para Columnas de Empleados

**Siempre usa `AvatarCell`** para mostrar empleados en tablas. Integra avatar + nombre + puesto automáticamente.

```typescript
// ✅ GOOD: Usar AvatarCell
{
  id: 'empleado',
  header: 'Empleado',
  cell: (row) => (
    <AvatarCell
      nombre={row.empleado.nombre}
      apellidos={row.empleado.apellidos}
      fotoUrl={row.empleado.fotoUrl}
      subtitle={row.empleado.puesto} // Opcional: muestra debajo del nombre
    />
  ),
  sticky: true,
  priority: 'high',
}
```

**Características de AvatarCell:**
- Muestra avatar + nombre + puesto en una sola celda
- Responsive: avatar más pequeño en mobile
- Integra `EmployeeAvatar` automáticamente
- Soporta `subtitle` para mostrar información adicional (puesto, equipo, etc.)

### EmptyState Obligatorio

**Todos los estados vacíos deben usar `EmptyState` de shadcn** con layout `table`.

```typescript
// ✅ GOOD: EmptyState de shadcn
import { EmptyState } from '@/components/shared/empty-state';
import { CalendarIcon } from 'lucide-react';

<DataTable
  columns={columns}
  data={ausencias}
  emptyContent={
    <EmptyState
      layout="table"
      icon={CalendarIcon}
      title="No hay ausencias registradas"
      description="Cambia el periodo o ajusta los filtros para ver registros."
    />
  }
/>

// ❌ BAD: Texto plano o estilos custom
{data.length === 0 && (
  <div className="text-center py-10 text-gray-500">
    No hay datos
  </div>
)}
```

### Prioridades de Columnas

```typescript
type ColumnPriority = 'high' | 'medium' | 'low';

// high: Siempre visible (mobile + desktop)
// medium: Oculta en mobile pequeño, visible en tablet+
// low: Solo visible en desktop
```

**Regla general:**
- Primera columna (empleado): `priority: 'high'`, `sticky: true`
- Columnas importantes (tipo, estado): `priority: 'high'`
- Columnas secundarias (fechas, detalles): `priority: 'medium'`
- Columnas opcionales (acciones complejas): `priority: 'low'`

### Alineación de Headers

**Los headers deben estar centrados cuando el contenido de la columna está centrado.**

```typescript
{
  id: 'fechas',
  header: 'Fechas',
  align: 'center', // Header centrado con contenido
  cell: (row) => (
    <div className="text-center">
      {format(new Date(row.fechaInicio), 'dd MMM')}
    </div>
  ),
}
```

### Filas Clicables

**Las filas deben ser clicables para abrir modales de edición/detalle.**

```typescript
<DataTable
  columns={columns}
  data={ausencias}
  onRowClick={(row) => handleOpenModal(row)}
  // ... otros props
/>
```

**Nota importante:** Si tienes botones de acción inline (como "Aprobar"/"Rechazar"), usa `event.stopPropagation()` para evitar que el click en el botón abra el modal:

```typescript
<Button
  onClick={(event) => {
    event.stopPropagation(); // Previene que se abra el modal
    handleAprobar(row.id);
  }}
>
  Aprobar
</Button>
```

### Tablas Migradas

Las siguientes tablas ya usan el patrón unificado:
- ✅ `/hr/horario/ausencias` - Tabla de ausencias
- ✅ `/hr/horario/fichajes` - Tabla de fichajes
- ✅ `/hr/organizacion/personas` - Tabla de empleados (si aplica)

### Eliminación de Estilos Alternativos

**No uses componentes de tabla alternativos:**
- ❌ `Table`, `TableRow`, `TableCell` de shadcn directamente en nuevas tablas
- ❌ Estilos custom de tabla (deben venir de `DataTable`)
- ❌ Empty states con texto plano

**Motivo:** Unificar estilos y centralizar código para mantener consistencia visual y facilitar mantenimiento.

---

## 📝 Code Comments

```typescript
// ✅ GOOD: Explain WHY, not WHAT
// Usamos GPT-4 Vision porque necesitamos OCR de PDFs escaneados
const response = await openai.chat.completions.create({ ... });

// ✅ GOOD: Document complex business logic
/**
 * Calcula el saldo de vacaciones de un empleado.
 * Regla: 22 días/año en España, proporcional a meses trabajados.
 * Se descuentan ausencias tipo 'vacaciones' aprobadas.
 */
export function calcularSaldoVacaciones(empleado, ausencias) { ... }

// ❌ BAD: Obvious comments
// Get employee by ID
const empleado = await prisma.empleado.findUnique({ where: { id } });
```

---

**Versión**: 1.1  
**Última actualización**: 27 de enero 2025
