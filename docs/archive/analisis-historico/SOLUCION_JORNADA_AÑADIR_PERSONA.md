# Solución: Validación de Jornada en "Añadir Persona"

## Problema Identificado

Al añadir una persona manualmente desde HR (sin usar onboarding con paso de jornada), si NO hay asignación automática de jornada (empresa/equipo), el empleado quedaría sin jornada asignada.

## Solución Implementada

### 1. Backend: Validación en API

**`POST /api/empleados`** ahora:

1. **Intenta resolver jornada automáticamente** usando `resolverJornadaParaNuevoEmpleado()`
2. Si retorna `null` (sin asignación automática) y NO se proporcionó `jornadaId` en el body:
   - ❌ Retorna error: "No hay jornada asignada automáticamente. Debes proporcionar una jornada"
3. Si se proporciona `jornadaId` en el body:
   - ✅ Valida que existe y pertenece a la empresa
   - ✅ Asigna esa jornada

**`POST /api/empleados/importar-excel/confirmar`**:
- Si no hay asignación automática: Agrega error y salta ese empleado
- Mensaje claro: "Configura una jornada de empresa/equipo primero"

### 2. Frontend: Modificación de AddPersonaOnboardingForm

#### A. Agregar campo jornadaId a FormData

```typescript
interface FormData {
  // ... campos existentes
  jornadaId?: string; // NUEVO: Jornada seleccionada manualmente
}
```

#### B. Cargar jornadas disponibles

```typescript
const [jornadas, setJornadas] = useState<Jornada[]>([]);
const [jornadaAutomatica, setJornadaAutomatica] = useState<{
  jornadaId: string | null;
  origen: 'empresa' | 'equipo' | null;
  mensaje: string;
} | null>(null);

// Cargar jornadas disponibles
const cargarJornadas = async () => {
  const res = await fetch('/api/jornadas');
  const data = await res.json();
  setJornadas(data);
};

// Validar jornada automática cuando cambia el equipo
useEffect(() => {
  if (formData.equipoId) {
    validarJornadaAutomatica();
  }
}, [formData.equipoId]);

const validarJornadaAutomatica = async () => {
  const res = await fetch('/api/jornadas/validar-automatica', {
    method: 'POST',
    body: JSON.stringify({
      equipoIds: formData.equipoId ? [formData.equipoId] : [],
    }),
  });

  const data = await res.json();
  setJornadaAutomatica(data);

  if (data.jornadaId) {
    // Hay asignación automática, no necesita seleccionar
    setFormData({...formData, jornadaId: undefined});
  } else {
    // No hay asignación automática, DEBE seleccionar
    // Mostrar advertencia
  }
};
```

#### C. Agregar sección en el formulario

Después del campo "Equipo", agregar:

```tsx
{/* Jornada - Solo si NO hay asignación automática */}
{jornadaAutomatica && !jornadaAutomatica.jornadaId && (
  <div className="col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <div className="flex items-start gap-2 mb-3">
      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-900">
          Jornada requerida
        </p>
        <p className="text-sm text-amber-700">
          No hay jornada asignada automáticamente. Selecciona una jornada para este empleado.
        </p>
      </div>
    </div>

    <Label>Jornada *</Label>
    <SearchableSelect
      items={jornadas.map(j => ({
        value: j.id,
        label: `${j.horasSemanales}h - ${j.tipo}`,
      }))}
      value={formData.jornadaId || ''}
      onChange={(value) => setFormData({...formData, jornadaId: value})}
      placeholder="Seleccionar jornada"
    />
  </div>
)}

{/* Mensaje informativo si HAY asignación automática */}
{jornadaAutomatica && jornadaAutomatica.jornadaId && (
  <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg">
    <div className="flex items-start gap-2">
      <Check className="h-5 w-5 text-green-600 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-green-900">
          Jornada asignada automáticamente
        </p>
        <p className="text-sm text-green-700">
          {jornadaAutomatica.mensaje}
        </p>
      </div>
    </div>
  </div>
)}
```

#### D. Enviar jornadaId en handleSubmit

```typescript
const empleadoData: Record<string, unknown> = {
  // ... campos existentes
  jornadaId: formData.jornadaId, // Enviar si fue seleccionada manualmente
};
```

### 3. API Helper: Validar Jornada Automática

**Nuevo endpoint**: `POST /api/jornadas/validar-automatica`

```typescript
export async function POST(req: NextRequest) {
  const { equipoIds } = await req.json();
  const session = await getSession();

  const jornadaId = await resolverJornadaParaNuevoEmpleado(
    prisma,
    session.user.empresaId,
    equipoIds || []
  );

  if (jornadaId === null) {
    return Response.json({
      jornadaId: null,
      origen: null,
      mensaje: 'No hay jornada asignada automáticamente',
    });
  }

  // Determinar origen
  const asignacionEmpresa = await prisma.jornada_asignaciones.findFirst({
    where: { empresaId: session.user.empresaId, nivelAsignacion: 'empresa' },
  });

  const origen = asignacionEmpresa ? 'empresa' : 'equipo';
  const mensaje = origen === 'empresa'
    ? 'Se asignará la jornada de empresa'
    : 'Se asignará la jornada del equipo seleccionado';

  return Response.json({ jornadaId, origen, mensaje });
}
```

## Flujo de Usuario

### Caso 1: Con asignación automática (empresa/equipo)
1. Usuario abre "Añadir Persona"
2. Completa datos básicos, selecciona equipo
3. ✅ **Mensaje verde**: "Jornada asignada automáticamente: Se asignará la jornada de empresa"
4. Guarda → Empleado creado con `jornadaId: null` (resolución dinámica)

### Caso 2: Sin asignación automática
1. Usuario abre "Añadir Persona"
2. Completa datos básicos, selecciona equipo
3. ⚠️ **Advertencia amarilla**: "No hay jornada asignada automáticamente. Selecciona una jornada"
4. Usuario DEBE seleccionar una jornada del dropdown
5. Guarda → Empleado creado con `jornadaId: <seleccionada>` (asignación directa)

### Caso 3: Sin jornadas en absoluto
1. Usuario abre "Añadir Persona"
2. ⚠️ **Advertencia**: "No hay jornadas configuradas. Debes crear al menos una jornada primero"
3. Botón "Crear jornada" → Redirige a gestión de jornadas

## Archivos Modificados

- ✅ `lib/jornadas/resolver-para-nuevo.ts` - Retorna null si no hay asignación automática
- ✅ `app/api/empleados/route.ts` - Valida y requiere jornadaId si no hay asignación automática
- ✅ `app/api/empleados/importar-excel/confirmar/route.ts` - Retorna error si no hay asignación automática
- 🔄 `components/organizacion/add-persona-onboarding-form.tsx` - Agregar validación y selector de jornada
- 🔄 `app/api/jornadas/validar-automatica/route.ts` - Nuevo endpoint para validar jornada automática

## Ventajas de esta Solución

1. **Transparente**: Usuario ve claramente si hay asignación automática o no
2. **Guiada**: Si no hay asignación automática, se le pide seleccionar explícitamente
3. **Segura**: Backend valida que SIEMPRE haya una jornada asignada
4. **Consistente**: Mismo comportamiento en API manual, Excel import y onboarding
5. **Retrocompatible**: No rompe flujos existentes que SÍ tienen asignación automática
