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

// ❌ BAD: N+1 query problem
const empleados = await prisma.empleado.findMany();
for (const emp of empleados) {
  const ausencias = await prisma.ausencia.findMany({
    where: { empleadoId: emp.id }
  });
}
```

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
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET: z.string(),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  COGNITO_USER_POOL_ID: z.string(),
  COGNITO_CLIENT_ID: z.string()
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

**Versión**: 1.0  
**Última actualización**: 25 de octubre 2025
