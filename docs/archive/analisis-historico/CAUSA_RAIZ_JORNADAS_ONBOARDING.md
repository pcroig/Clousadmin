# Análisis Causa Raíz: Error de Jornadas en Onboarding

**Fecha**: 2025-12-10
**Problema**: Al importar empleados en el onboarding, sale error: "Sin jornada para X: No hay asignación automática. Configura una jornada de empresa/equipo primero."

---

## 🎯 CAUSA RAÍZ IDENTIFICADA

### El problema NO es técnico, es de **flujo de negocio inconsistente**

El sistema tiene **DOS flujos diferentes** para añadir empleados, con **lógicas contradictorias** sobre cuándo se requiere la jornada:

---

## 📊 COMPARACIÓN DE FLUJOS

### FLUJO 1: Onboarding Inicial (Signup)
**Ruta**: `/signup` → Paso 1 (Importar empleados) → Paso 3 (Configurar jornada)

**Orden de operaciones**:
1. **Paso 1**: Importar empleados vía Excel/IA (`/api/empleados/importar-excel/confirmar`)
   - Se crean empleados **SIN jornada** (porque aún no existe)
   - ❌ **PERO EL CÓDIGO VALIDA QUE TENGAN JORNADA** (líneas 298-303)

2. **Paso 3**: Configurar jornada laboral
   - Se crea la jornada de empresa
   - Se asigna automáticamente a todos los empleados sin jornada

**Problema**: El paso 1 **requiere** algo que solo existe en el paso 3.

---

### FLUJO 2: Añadir Persona desde HR Panel
**Ruta**: `/hr/organizacion/personas` → "Añadir Persona"

**Orden de operaciones**:
1. Modal para crear empleado (`POST /api/empleados`)
2. Si NO hay asignación automática (empresa/equipo):
   - ✅ Frontend muestra selector de jornada manual
   - ✅ Backend requiere `jornadaId` explícito (líneas 232-236)
3. Si HAY asignación automática:
   - ✅ Se crea empleado con `jornadaId: null` (resolución dinámica)

**Lógica**: ✅ **CORRECTA** - Requiere jornada existente antes de crear empleado.

---

## 🔍 ANÁLISIS DETALLADO DEL CÓDIGO

### Archivo: `app/api/empleados/importar-excel/confirmar/route.ts`

**Líneas 285-303** (Código problemático):
```typescript
// Resolver qué jornada asignar al nuevo empleado
const equipoIdsEmpleado = empleadoData.equipo && equiposCreados.has(empleadoData.equipo)
  ? [equiposCreados.get(empleadoData.equipo)!]
  : [];

const jornadaId = await resolverJornadaParaNuevoEmpleado(
  tx,
  session.user.empresaId,
  equipoIdsEmpleado
);

// ❌ ESTO CAUSA EL ERROR
// Si no hay asignación automática y el Excel no proporciona jornada, fallar
if (jornadaId === null) {
  resultados.errores.push(
    `Sin jornada para ${empleadoData.email}: No hay asignación automática. Configura una jornada de empresa/equipo primero.`
  );
  return null; // Saltar este empleado
}
```

**¿Por qué está mal esta validación en el contexto de onboarding?**

1. **En onboarding inicial**, la empresa está en setup
2. La jornada **se configura DESPUÉS** de importar empleados (Paso 3)
3. Es **IMPOSIBLE** que exista asignación automática en el Paso 1
4. Por tanto, TODOS los empleados fallarían ❌

---

### Archivo: `lib/jornadas/resolver-para-nuevo.ts`

**Líneas 98-104** (Comportamiento correcto pero usado incorrectamente):
```typescript
// 3. No hay asignaciones automáticas
// NO crear jornada automáticamente - el empleado debe tener una asignada explícitamente
console.log(
  `[resolverJornadaParaNuevoEmpleado] Sin asignaciones automáticas → jornadaId: null (requiere asignación explícita)`
);
return null;
```

**Este comportamiento es CORRECTO para**:
- ✅ Añadir persona desde HR panel (empresa ya operativa)
- ✅ Importar empleados en empresa con jornadas ya configuradas

**Este comportamiento es INCORRECTO para**:
- ❌ Onboarding inicial donde NO HAY jornadas aún

---

## 🎭 CONTEXTOS DIFERENTES, MISMO ENDPOINT

El endpoint `/api/empleados/importar-excel/confirmar` se usa en **DOS contextos**:

### Contexto A: Onboarding Inicial (Signup)
- **Estado de empresa**: Nueva, sin jornadas configuradas
- **Expectativa**: Permitir crear empleados sin jornada
- **Asignación de jornada**: Se hace en paso posterior (Paso 3)
- **Comportamiento actual**: ❌ FALLA porque requiere jornada

### Contexto B: Importación desde HR Panel
- **Estado de empresa**: Operativa, con jornadas ya configuradas
- **Expectativa**: Validar que haya jornada (automática o manual)
- **Asignación de jornada**: Debe existir antes de importar
- **Comportamiento actual**: ✅ CORRECTO - valida jornada

---

## 📚 DOCUMENTACIÓN VS REALIDAD

### Según `docs/funcionalidades/jornadas.md` (líneas 366-373):

> **Importante**:
> - La jornada no se crea automáticamente al crear la cuenta. Debe configurarse en el paso 3.
> - **Los empleados importados en el paso 1 quedan sin jornada hasta completar el paso 3.**
> - El calendario laboral (días laborables y festivos) se configura en el paso 4.
> - Todos los pasos se completan en `/signup` sin redirección a otras páginas.

**La documentación DICE** que los empleados pueden quedar sin jornada.
**El código ACTUAL** no lo permite ❌

---

## 🔧 SOLUCIONES POSIBLES

### Opción 1: Detectar Contexto de Onboarding (RECOMENDADA)

Modificar `/api/empleados/importar-excel/confirmar` para detectar si es onboarding inicial:

```typescript
// Determinar si estamos en onboarding (empresa sin jornadas configuradas)
const esOnboarding = await tx.jornada_asignaciones.count({
  where: { empresaId: session.user.empresaId }
}) === 0;

const jornadaId = await resolverJornadaParaNuevoEmpleado(
  tx,
  session.user.empresaId,
  equipoIdsEmpleado
);

// Solo validar jornada si NO es onboarding
if (!esOnboarding && jornadaId === null) {
  resultados.errores.push(
    `Sin jornada para ${empleadoData.email}: No hay asignación automática. Configura una jornada de empresa/equipo primero.`
  );
  return null;
}

// En onboarding, permitir jornadaId: null
// Se asignará automáticamente en el paso 3
```

**Ventajas**:
- ✅ Mínimo cambio en código
- ✅ Mantiene validación estricta para empresas operativas
- ✅ Permite onboarding inicial sin jornadas
- ✅ Alineado con documentación

**Desventajas**:
- ⚠️ Lógica implícita (detecta onboarding por ausencia de asignaciones)

---

### Opción 2: Parámetro Explícito

Añadir parámetro `permitirSinJornada` al endpoint:

```typescript
// En el body del request
interface ConfirmarImportacionBody {
  empleados: EmpleadoDetectado[];
  equiposDetectados: string[];
  managersDetectados: string[];
  permitirSinJornada?: boolean; // NUEVO
}

// En la validación
if (!permitirSinJornada && jornadaId === null) {
  resultados.errores.push(...);
  return null;
}
```

**Llamada desde onboarding**:
```typescript
await fetch('/api/empleados/importar-excel/confirmar', {
  body: JSON.stringify({
    empleados,
    equiposDetectados,
    managersDetectados,
    permitirSinJornada: true, // Onboarding inicial
  })
});
```

**Ventajas**:
- ✅ Explícito y claro
- ✅ Control total del frontend
- ✅ Fácil de testear

**Desventajas**:
- ⚠️ Requiere cambios en frontend
- ⚠️ Podría usarse incorrectamente

---

### Opción 3: Endpoints Separados

Crear dos endpoints diferentes:

1. `POST /api/empleados/importar-excel/confirmar` (producción, requiere jornadas)
2. `POST /api/onboarding/importar-empleados` (onboarding, permite sin jornadas)

**Ventajas**:
- ✅ Separación clara de responsabilidades
- ✅ Validaciones específicas por contexto
- ✅ Más seguro (no hay flags booleanos)

**Desventajas**:
- ❌ Código duplicado
- ❌ Más endpoints a mantener

---

## 🎯 RECOMENDACIÓN FINAL

**Implementar Opción 1: Detectar Contexto de Onboarding**

**Razones**:
1. Cambio mínimo y quirúrgico
2. No rompe frontend existente
3. Alineado con la documentación
4. Lógica de negocio correcta:
   - Si empresa NO tiene jornadas → Onboarding → Permitir empleados sin jornada
   - Si empresa SÍ tiene jornadas → Operativa → Requerir jornada

**Implementación**:

```typescript
// app/api/empleados/importar-excel/confirmar/route.ts
// Línea ~285 (antes de la validación actual)

// Detectar si es onboarding inicial (empresa sin sistema de jornadas configurado)
const tieneJornadasConfiguradas = await tx.jornada_asignaciones.count({
  where: { empresaId: session.user.empresaId }
}) > 0;

const jornadaId = await resolverJornadaParaNuevoEmpleado(
  tx,
  session.user.empresaId,
  equipoIdsEmpleado
);

// SOLO validar jornada obligatoria si la empresa ya tiene jornadas configuradas
if (tieneJornadasConfiguradas && jornadaId === null) {
  resultados.errores.push(
    `Sin jornada para ${empleadoData.email}: No hay asignación automática. Configura una jornada de empresa/equipo primero.`
  );
  return null; // Saltar este empleado
}

// En onboarding inicial (sin jornadas configuradas), permitir jornadaId: null
// Se asignará automáticamente cuando se configure la jornada en el paso 3
console.log(
  tieneJornadasConfiguradas
    ? `[Importar] Empresa operativa - jornada requerida`
    : `[Importar] Onboarding inicial - empleados sin jornada permitidos`
);
```

---

## 📋 ARCHIVOS A MODIFICAR

1. **app/api/empleados/importar-excel/confirmar/route.ts** (líneas 285-303)
   - Añadir detección de contexto onboarding
   - Condicionar validación de jornada obligatoria

---

## ✅ VALIDACIÓN POST-FIX

### Escenario 1: Onboarding Inicial
1. Usuario crea cuenta en `/signup`
2. Paso 1: Importa 10 empleados vía Excel
   - ✅ Empleados se crean con `jornadaId: null`
   - ✅ No hay errores de validación
3. Paso 3: Configura jornada de empresa (40h flexible)
   - ✅ Jornada se asigna automáticamente a los 10 empleados
4. Resultado: ✅ 10 empleados con jornada asignada

### Escenario 2: Empresa Operativa (sin asignación automática)
1. Empresa ya tiene jornadas configuradas
2. HR intenta importar empleados desde panel
3. NO hay jornada de empresa ni de equipo
   - ❌ Error: "Sin jornada para X: No hay asignación automática..."
4. Resultado: ✅ Validación correcta - HR debe configurar jornadas primero

### Escenario 3: Empresa Operativa (con asignación automática)
1. Empresa tiene jornada de empresa configurada
2. HR importa empleados
   - ✅ Empleados se crean con `jornadaId: null`
   - ✅ Resolución dinámica asigna jornada de empresa
3. Resultado: ✅ Empleados con jornada correcta

---

## 🔍 APRENDIZAJES

1. **Mismo endpoint, diferentes contextos** requiere lógica contextual
2. La validación "estricta" no siempre es correcta - depende del estado del sistema
3. Documentación debe reflejarse en el código (actualmente divergían)
4. Onboarding es un **estado especial** que requiere reglas especiales

---

**Conclusión**: El problema era que el código asumía que **siempre** debe haber jornadas, cuando en realidad durante el onboarding inicial es **imposible** que existan. La solución es detectar automáticamente el contexto y adaptar las validaciones.
