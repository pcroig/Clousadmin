# Análisis Final: Problema de Jornadas en Diferentes Contextos

**Fecha**: 2025-12-10
**Problema**: Error "Sin jornada para X: No hay asignación automática" al importar empleados en onboarding

---

## 🎯 SITUACIÓN ACTUAL: Dos Flujos, Dos Momentos de Validación

### FLUJO A: Añadir Persona desde HR Panel (`/hr/organizacion/personas`)
**Componente**: `add-persona-onboarding-form.tsx`
**Contexto**: Empresa YA operativa con jornadas configuradas

**Flujo de validación**:
1. Usuario abre modal "Añadir Persona"
2. Completa datos básicos (nombre, email, equipo, puesto)
3. **VALIDACIÓN IN-SITU** (frontend):
   ```typescript
   // Línea 309-344: validarJornadaAutomatica()
   useEffect(() => {
     if (formData.equipoId) {
       validarJornadaAutomatica(); // ✅ Llama a /api/jornadas/validar-automatica
     }
   }, [formData.equipoId]);
   ```
4. Si NO hay asignación automática:
   - ✅ **Muestra selector de jornada** (líneas 771-795)
   - ✅ **Requiere selección manual** (línea 373-377)
5. Al guardar: `POST /api/empleados`
   - Backend valida: si no hay asignación automática Y no hay `jornadaId` → Error
   - ✅ **Funciona correctamente** porque frontend ya validó

**Momento de validación**: ⏱️ **DURANTE el llenado del formulario** (in-situ, reactivo)

---

### FLUJO B: Onboarding Inicial (`/signup`)
**Componente**: `AddEmpleadosOnboarding` → `ImportarEmpleadosExcel` o `AddPersonaManualForm`
**Contexto**: Empresa NUEVA, SIN jornadas configuradas aún

**Flujo de importación Excel**:
1. **Paso 1**: Usuario importa empleados vía Excel
2. `POST /api/empleados/importar-excel/confirmar`
   - **VALIDACIÓN BACKEND** (líneas 285-303):
   ```typescript
   const jornadaId = await resolverJornadaParaNuevoEmpleado(tx, empresaId, equipoIds);

   // ❌ PROBLEMA: Valida AQUÍ, pero jornadas se crean en Paso 3
   if (jornadaId === null) {
     resultados.errores.push(`Sin jornada para ${empleadoData.email}...`);
     return null; // Rechaza empleado
   }
   ```
3. **Paso 3**: Usuario configura jornada de empresa (DESPUÉS)

**Momento de validación**: ⏱️ **AL IMPORTAR** (antes de que existan jornadas)

**Flujo manual en onboarding**:
1. Usuario selecciona "Añadir Manual" en paso 1
2. Usa `AddPersonaManualForm` (mismo componente que HR Panel)
3. **VALIDACIÓN IN-SITU** (frontend):
   - ✅ Llama a `/api/jornadas/validar-automatica`
   - ✅ Si no hay asignación → muestra selector
4. **PROBLEMA**: En onboarding NO HAY jornadas creadas aún
   - Validación retorna: "no hay asignación automática"
   - Frontend muestra selector de jornadas
   - **Pero NO HAY jornadas disponibles** para seleccionar
   - Usuario NO puede continuar ❌

---

## 📊 MATRIZ DE COMPARACIÓN

| Aspecto | HR Panel (Empresa Operativa) | Onboarding (Empresa Nueva) |
|---------|------------------------------|----------------------------|
| **Contexto** | Jornadas YA configuradas | Jornadas NO existen aún |
| **Componente Frontend** | `add-persona-onboarding-form.tsx` | MISMO componente |
| **Endpoint Backend** | `POST /api/empleados` | `POST /api/empleados` (manual)<br>`POST /api/empleados/importar-excel/confirmar` (masivo) |
| **Validación Frontend** | ✅ In-situ, muestra selector si necesario | ❌ In-situ, pero NO hay jornadas para seleccionar |
| **Validación Backend** | ✅ Funciona (frontend ya validó) | ❌ Falla (jornadas no existen) |
| **Expectativa correcta** | Requiere jornada | Permitir sin jornada (temporal) |

---

## 🔍 CAUSA RAÍZ PRECISA

### El problema NO es técnico, es **conceptual**:

1. **Misma lógica de validación** (correcta para empresa operativa)
2. **Aplicada en contexto diferente** (empresa en setup)
3. **Momento incorrecto** (antes de que las jornadas existan)

### Específicamente:

#### ❌ En `POST /api/empleados/importar-excel/confirmar` (líneas 285-303)
```typescript
const jornadaId = await resolverJornadaParaNuevoEmpleado(...);

if (jornadaId === null) {
  // ❌ PROBLEMA: Esto SIEMPRE falla en onboarding inicial
  //    porque NO HAY jornadas_asignaciones todavía
  resultados.errores.push(`Sin jornada para ${email}...`);
  return null;
}
```

**¿Por qué falla?**
- `resolverJornadaParaNuevoEmpleado()` busca asignaciones en `jornada_asignaciones`
- En onboarding inicial, esa tabla está **VACÍA**
- Retorna `null` (correcto)
- Pero el código **rechaza** el empleado (incorrecto en este contexto)

#### ❌ En `add-persona-onboarding-form.tsx` (manual)
```typescript
// Línea 309: Validar jornada cuando selecciona equipo
useEffect(() => {
  if (formData.equipoId) {
    validarJornadaAutomatica(); // Llama a /api/jornadas/validar-automatica
  }
}, [formData.equipoId]);

// Línea 373: Bloquea submit si no hay jornada
if (!jornadaValidacion?.tieneAsignacionAutomatica && !formData.jornadaId) {
  toast.error('Debes seleccionar una jornada para este empleado');
  return;
}
```

**¿Por qué falla?**
- Valida que haya jornada (correcto para HR Panel)
- En onboarding, NO hay jornadas para seleccionar
- Usuario queda bloqueado sin poder continuar

---

## 💡 ALTERNATIVAS DE SOLUCIÓN

### OPCIÓN 1: Detectar Contexto en Backend (Recomendada para Excel)
**Archivo**: `app/api/empleados/importar-excel/confirmar/route.ts`

```typescript
// Detectar si es onboarding inicial
const esOnboardingInicial = await tx.jornada_asignaciones.count({
  where: { empresaId: session.user.empresaId }
}) === 0;

const jornadaId = await resolverJornadaParaNuevoEmpleado(...);

// Solo validar jornada obligatoria SI la empresa YA tiene jornadas configuradas
if (!esOnboardingInicial && jornadaId === null) {
  resultados.errores.push(`Sin jornada para ${empleadoData.email}...`);
  return null;
}

// En onboarding inicial, permitir jornadaId: null
// Se asignará en paso 3 cuando se configure la jornada
```

**Ventajas**:
- ✅ Fix quirúrgico (10 líneas)
- ✅ No rompe nada existente
- ✅ Lógica correcta por contexto

**Desventajas**:
- ⚠️ Solo soluciona importación Excel
- ⚠️ No soluciona formulario manual en onboarding

---

### OPCIÓN 2: Detectar Contexto en Frontend (Recomendada para Manual)
**Archivo**: `add-persona-onboarding-form.tsx`

```typescript
// Cargar jornadas al montar componente
useEffect(() => {
  async function cargarJornadas() {
    const res = await fetch('/api/jornadas');
    const data = await res.json();
    setJornadas(data);
  }
  cargarJornadas();
}, []);

// NUEVO: Detectar si es onboarding inicial
const esOnboardingInicial = jornadas.length === 0;

// Modificar validación de submit (línea 373)
if (!esOnboardingInicial) {
  // Solo validar jornada si NO es onboarding inicial
  if (!jornadaValidacion?.tieneAsignacionAutomatica && !formData.jornadaId) {
    toast.error('Debes seleccionar una jornada para este empleado');
    return;
  }
}

// Modificar renderizado condicional (línea 756)
{formData.equipoId && !esOnboardingInicial && (
  // Solo mostrar validación de jornada si NO es onboarding inicial
  <div className="mt-4">
    {validandoJornada ? (...) : jornadaValidacion?.tieneAsignacionAutomatica ? (...) : (...)}
  </div>
)}
```

**Ventajas**:
- ✅ Soluciona formulario manual en onboarding
- ✅ No afecta uso desde HR Panel
- ✅ UX mejor (no muestra validaciones innecesarias)

**Desventajas**:
- ⚠️ Solo soluciona añadir manual
- ⚠️ No soluciona importación Excel

---

### OPCIÓN 3: Separar Componentes por Contexto
**Crear dos componentes diferentes**:

1. `AddPersonaHRPanel` - Para empresa operativa
   - Validación estricta de jornadas
   - Usado en `/hr/organizacion/personas`

2. `AddPersonaOnboarding` - Para onboarding inicial
   - SIN validación de jornadas
   - Usado en `/signup` paso 1

**Ventajas**:
- ✅ Separación clara de responsabilidades
- ✅ No hay lógica condicional confusa
- ✅ Fácil de mantener y testear

**Desventajas**:
- ❌ Duplicación de código
- ❌ Más componentes a mantener
- ❌ Cambios futuros deben replicarse

---

### OPCIÓN 4: Parámetro Prop Explícito
**Modificar `AddPersonaOnboardingForm` con prop `esOnboarding`**:

```typescript
interface AddPersonaOnboardingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tipoEmpleado: 'nuevo' | 'existente';
  esOnboarding?: boolean; // NUEVO: Indica si es contexto de onboarding
}

// Uso desde HR Panel
<AddPersonaOnboardingForm esOnboarding={false} ... />

// Uso desde Signup
<AddPersonaOnboardingForm esOnboarding={true} ... />

// Lógica de validación
if (!esOnboarding && !jornadaValidacion?.tieneAsignacionAutomatica && !formData.jornadaId) {
  toast.error('Debes seleccionar una jornada');
  return;
}
```

**Ventajas**:
- ✅ Explícito y claro
- ✅ Sin duplicación de código
- ✅ Fácil de entender

**Desventajas**:
- ⚠️ Solo soluciona frontend
- ⚠️ Requiere prop en todos los usos del componente

---

### OPCIÓN 5: Posponer Validación (Backend) con Campo Temporal
**Modificar modelo de datos temporalmente**:

```typescript
// En backend: Crear empleado con flag especial
const empleadoData = {
  ...
  jornadaId: null,
  jornadaPendienteOnboarding: true, // NUEVO: Indica que espera jornada
};

// En paso 3 de onboarding: Asignar jornadas masivamente
const empleadosPendientes = await prisma.empleados.findMany({
  where: {
    empresaId: session.user.empresaId,
    jornadaPendienteOnboarding: true,
  }
});

// Asignar jornada y limpiar flag
await prisma.empleados.updateMany({
  where: { id: { in: empleadosPendientes.map(e => e.id) } },
  data: {
    jornadaId: nuevaJornadaId, // o null si hay asignación empresa/equipo
    jornadaPendienteOnboarding: false,
  }
});
```

**Ventajas**:
- ✅ Rastrea explícitamente empleados pendientes
- ✅ No depende de heurísticas

**Desventajas**:
- ❌ Requiere migración de schema
- ❌ Complejidad adicional
- ❌ Sobr ingenierado para el problema

---

## 🎯 RECOMENDACIÓN FINAL

**Implementar OPCIÓN 1 + OPCIÓN 2 (Híbrido)**

### Para Importación Excel (Backend):
```typescript
// app/api/empleados/importar-excel/confirmar/route.ts
const esOnboardingInicial = await tx.jornada_asignaciones.count({
  where: { empresaId: session.user.empresaId }
}) === 0;

const jornadaId = await resolverJornadaParaNuevoEmpleado(...);

if (!esOnboardingInicial && jornadaId === null) {
  resultados.errores.push(`Sin jornada para ${empleadoData.email}...`);
  return null;
}
```

### Para Formulario Manual (Frontend):
```typescript
// add-persona-onboarding-form.tsx
const [jornadas, setJornadas] = useState([]);

useEffect(() => {
  async function cargarJornadas() {
    const res = await fetch('/api/jornadas');
    const data = await res.json();
    setJornadas(data || []);
  }
  cargarJornadas();
}, []);

const esOnboardingInicial = jornadas.length === 0;

// Validar solo si NO es onboarding
if (!esOnboardingInicial && !jornadaValidacion?.tieneAsignacionAutomatica && !formData.jornadaId) {
  toast.error('Debes seleccionar una jornada');
  return;
}

// Renderizar validación solo si NO es onboarding
{formData.equipoId && !esOnboardingInicial && (
  <div className="mt-4">{/* Validación de jornada */}</div>
)}
```

---

## ✅ VERIFICACIÓN POST-FIX

### Escenario 1: Onboarding Inicial - Excel
1. Crear cuenta → Paso 1: Importar 10 empleados vía Excel
   - **Backend detecta**: `esOnboardingInicial = true`
   - **Resultado**: ✅ Empleados creados con `jornadaId: null`
2. Paso 3: Configurar jornada de empresa
   - ✅ Jornada se asigna automáticamente

### Escenario 2: Onboarding Inicial - Manual
1. Crear cuenta → Paso 1: "Añadir Manual"
   - **Frontend detecta**: `jornadas.length === 0`
   - **Resultado**: ✅ NO muestra validación de jornada
   - ✅ Permite crear empleado sin jornada
2. Paso 3: Configurar jornada
   - ✅ Asignación automática

### Escenario 3: HR Panel - Sin Asignación Automática
1. Empresa operativa (con jornadas)
2. HR añade persona sin jornada empresa/equipo
   - **Frontend detecta**: `jornadas.length > 0 && !asignación automática`
   - **Resultado**: ✅ Muestra selector de jornada
   - ✅ Requiere selección manual

### Escenario 4: HR Panel - Con Asignación Automática
1. Empresa operativa con jornada de empresa
2. HR añade persona
   - **Resultado**: ✅ Mensaje verde "Jornada asignada automáticamente"
   - ✅ Crea empleado con `jornadaId: null` (resolución dinámica)

---

## 📋 ARCHIVOS A MODIFICAR

1. **app/api/empleados/importar-excel/confirmar/route.ts** (líneas 285-303)
   - Añadir detección de onboarding inicial
   - Condicionar validación obligatoria

2. **components/organizacion/add-persona-onboarding-form.tsx**
   - Cargar jornadas al montar
   - Detectar `esOnboardingInicial`
   - Condicionar validación y renderizado

---

## 🎓 LECCIONES APRENDIDAS

1. **Mismo componente, diferentes contextos** requiere lógica contextual
2. **Estado de la empresa** (inicial vs operativa) es un factor crítico
3. **Validaciones universales** no siempre son correctas
4. **Momento de validación** importa tanto como la validación misma
5. **Heurísticas simples** (`jornadas.length === 0`, `asignaciones.count === 0`) funcionan bien

---

**Conclusión**: El problema es que la lógica de validación asume una empresa operativa, pero se aplica también en el setup inicial donde las jornadas aún no existen. La solución es detectar automáticamente el contexto y adaptar las validaciones.
