# Fix Armonización - Jornadas Onboarding y Gestión

**Fecha**: 4 de diciembre de 2025  
**Tipo**: Fix + Armonización  
**Áreas afectadas**: Onboarding, Gestión de Jornadas, APIs  

---

## 🎯 Problema Raíz

Las jornadas tienen **dos puntos de entrada** diferentes:
1. **Onboarding** (`components/onboarding/jornada-step.tsx`)
2. **Gestión HR** (`app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx`)

Ambos tenían **lógicas diferentes** y **bugs similares no sincronizados**, causando:
- ❌ Validaciones inconsistentes
- ❌ Bugs duplicados (equipos sin miembros)  
- ❌ Comportamientos diferentes en creación vs edición
- ❌ Confusión en el usuario

---

## 🔍 Análisis Detallado

### Estructura de Jornadas en BD

```prisma
model jornadas {
  id             String
  empresaId      String
  horasSemanales Decimal
  config         Json     // ← Aquí se guarda TODO (incluido tipo)
  esPredefinida  Boolean
  activa         Boolean
  empleados      empleados[]
  empresa        empresas
}
```

**Importante**: El campo `tipo` NO es un campo separado en la BD. Se guarda dentro de `config.tipo`.

### Formato de `config`

```typescript
{
  tipo: 'fija' | 'flexible',  // ← Campo clave
  lunes: { activo: boolean, entrada?: string, salida?: string, pausa_inicio?: string, pausa_fin?: string },
  // ... resto de días
  descansoMinimo?: string  // Solo en flexible (formato HH:MM)
}
```

---

## ✅ Problemas Solucionados

### 1. **Equipos sin Miembros Visibles** (ambos componentes)

**Problema**: Ambos componentes buscaban `_count.miembros` cuando la API devuelve `_count.empleado_equipos`

**Onboarding (ya estaba parcialmente arreglado)**:
```typescript
// ✅ YA CORREGIDO ANTERIORMENTE
miembros: ((eq._count as Record<string, unknown>)?.empleado_equipos as number) 
  || (eq.numeroMiembros as number) 
  || 0
```

**EditarJornadaModal (AHORA ARREGLADO)**:
```typescript
// ❌ ANTES
const response = await fetch('/api/organizacion/equipos');
miembros: e._count?.miembros ?? 0

// ✅ DESPUÉS
const response = await fetch('/api/equipos');  // Endpoint correcto
miembros: e._count?.empleado_equipos || e.numeroMiembros || 0
```

**Beneficio**: Ahora ambos componentes usan la misma API y misma lógica.

---

### 2. **Validaciones de Jornadas Conflictivas** (onboarding)

**Problema**: Se podían crear múltiples jornadas "Toda la empresa" y equipos/empleados duplicados.

**Solución**: Sistema de validación robusto añadido al onboarding:

```typescript
// Validar que solo haya 1 jornada de empresa
const jornadasEmpresa = Object.entries(asignaciones)
  .filter(([_, asignacion]) => asignacion.nivel === 'empresa');
if (jornadasEmpresa.length > 1) {
  toast.error('Solo puede haber una jornada asignada a toda la empresa...');
}

// Validar equipos únicos
const equiposUsados = new Set<string>();
// ... detectar duplicados

// Validar empleados únicos
const empleadosUsados = new Set<string>();
// ... detectar duplicados
```

**Reglas de negocio garantizadas**:
- ✅ Solo 1 jornada con nivel "empresa"
- ✅ Cada equipo en máximo 1 jornada
- ✅ Cada empleado en máximo 1 jornada  
- ✅ Todos los empleados deben tener exactamente 1 jornada

---

### 3. **Orden de Asignación Inteligente** (onboarding)

**Problema**: Las jornadas se asignaban en orden secuencial, permitiendo que "empresa" sobrescribiera las específicas.

**Solución**: Priorización por especificidad

```typescript
const asignacionesOrdenadas = Object.entries(asignaciones)
  .map(([index, asignacion]) => ({ index: parseInt(index), asignacion }))
  .sort((a, b) => {
    // Prioridad: individual (1) → equipo (2) → empresa (3)
    const prioridad = { individual: 1, equipo: 2, empresa: 3 };
    return prioridad[a.asignacion.nivel] - prioridad[b.asignacion.nivel];
  });
```

**Resultado**: Las asignaciones más específicas (individuales) tienen prioridad sobre las generales (empresa).

---

### 4. **Diseño Armonizado del Calendario** (onboarding)

**Problema**: Pestañas y botones diferentes a "Gestionar Ausencias".

**Solución**:
- Pestañas: "Calendario" / "Festivos" (consistente)
- Botones: "Añadir festivo" + "Importar" (mismo orden)
- Layout unificado

---

## 📊 Tabla Comparativa

| Aspecto | Onboarding (ANTES) | Onboarding (DESPUÉS) | Gestionar (ANTES) | Gestionar (DESPUÉS) |
|---------|-------------------|---------------------|-------------------|---------------------|
| **API Equipos** | `/api/equipos` | `/api/equipos` ✅ | `/api/organizacion/equipos` ❌ | `/api/equipos` ✅ |
| **Campo miembros** | `_count.empleado_equipos` ✅ | `_count.empleado_equipos` ✅ | `_count.miembros` ❌ | `_count.empleado_equipos` ✅ |
| **Validación empresa única** | ❌ No | ✅ Sí | N/A (modal individual) | N/A |
| **Validación duplicados** | ❌ No | ✅ Sí (equipos + empleados) | ❌ No | ❌ No (pendiente) |
| **Orden asignación** | ❌ Secuencial | ✅ Por prioridad | N/A (asignación individual) | N/A |
| **Diseño calendario** | ⚠️ Inconsistente | ✅ Armonizado | ✅ Referencia | ✅ Referencia |
| **Validación completa empleados** | ✅ Sí | ✅ Sí | N/A | N/A |

---

## 🔧 Cambios Técnicos

### Archivos Modificados

```
✅ components/onboarding/jornada-step.tsx
   - Fix visualización equipos (_count.empleado_equipos)
   - Validaciones de conflictos (empresa única, equipos/empleados únicos)
   - Orden inteligente de asignaciones (individual → equipo → empresa)
   - Campo tieneDescanso + descansoMinutos (armonizado con gestionar)
   
✅ components/onboarding/calendario-step.tsx
   - Armonización de pestañas: "Calendario" / "Festivos"
   - Botones: "Añadir festivo" + "Importar"
   - Prop showCreateButton={false} en ListaFestivos
   
✅ app/(dashboard)/hr/horario/fichajes/editar-jornada-modal.tsx
   - Cambiado a API correcta: /api/equipos
   - Fix visualización equipos (_count.empleado_equipos)
   - Lógica tieneDescanso + descansoMinutos (ya existía)
   
✅ app/api/jornadas/[id]/route.ts
   - Clarificación: tipo se guarda en config.tipo (no campo separado)
   - Sin cambios funcionales (ya funcionaba correctamente)
```

### Interfaz Compartida

Ambos componentes usan la misma interfaz de datos:

```typescript
interface JornadaFormData {
  tipoJornada: 'fija' | 'flexible';
  horasSemanales: string;
  horariosFijos: Record<string, HorarioDia>;
  tieneDescanso: boolean;       // ← Campo de control
  descansoMinutos: string;      // ← Solo se usa si tieneDescanso=true
}
```

**Valores por defecto armonizados**:
```typescript
{
  tipoJornada: 'flexible',
  horasSemanales: '40',
  horariosFijos: { lunes: {...}, ..., domingo: {...} },
  tieneDescanso: true,
  descansoMinutos: '60',
}
```

---

## 🧪 Testing Manual Recomendado

### Test 1: Onboarding - Validación Empresa Única
1. Crear Jornada 1 → Asignar a "Toda la empresa"
2. Crear Jornada 2 → Intentar asignar a "Toda la empresa"
3. ✅ **Esperado**: Error "Solo puede haber una jornada asignada a toda la empresa"

### Test 2: Onboarding - Validación Equipos Duplicados
1. Crear Jornada 1 → Asignar a "Equipo Desarrollo"
2. Crear Jornada 2 → Intentar asignar a "Equipo Desarrollo"
3. ✅ **Esperado**: Error "El equipo seleccionado ya está asignado a otra jornada"

### Test 3: Onboarding - Visualización Equipos
1. Crear jornada → Seleccionar "Un equipo concreto"
2. ✅ **Esperado**: Ver equipos con número correcto de miembros (ej: "Marketing (5 miembros)")

### Test 4: Gestionar Jornadas - Visualización Equipos
1. HR > Horario > Fichajes > Nueva Jornada
2. Seleccionar "Un equipo concreto"
3. ✅ **Esperado**: Ver equipos con número correcto de miembros

### Test 5: Gestionar Jornadas - Editar y Cambiar Tipo
1. Crear jornada Flexible 40h con descanso 60min
2. Editar → Cambiar a Fija con horarios específicos
3. Guardar
4. ✅ **Esperado**: 
   - Tipo cambia correctamente a "Fija"
   - Horarios se guardan
   - Descanso se mantiene

### Test 6: Onboarding - Orden de Asignación
1. Crear Jornada 1 (40h) → Empleado "Juan"
2. Crear Jornada 2 (35h) → "Toda la empresa"
3. Guardar
4. ✅ **Esperado**:
   - Juan tiene 40h
   - Resto tiene 35h

### Test 7: Calendario - Diseño Consistente
1. Onboarding > Paso Calendario
2. HR > Horario > Ausencias > Gestionar Ausencias
3. ✅ **Esperado**: Mismo diseño de pestañas y botones

---

## 📝 Notas Técnicas

### ¿Por qué el campo `tipo` se guarda en `config`?

El campo `tipo` podría haber sido un campo separado en la tabla, pero se decidió guardarlo en `config.tipo` porque:
1. **Flexibilidad**: Toda la configuración de la jornada está en un solo JSON
2. **Histórico**: Así se diseñó originalmente
3. **Compatibilidad**: No requiere migración de BD

**Impacto**: 
- ✅ Al crear/actualizar, SIEMPRE se debe incluir `config.tipo`
- ✅ El schema `jornadaCreateSchema` y `jornadaUpdateSchema` NO tienen campo `tipo` separado
- ✅ La API valida y guarda correctamente

### Diferencias entre Onboarding y Gestionar

| Característica | Onboarding | Gestionar Jornadas |
|----------------|------------|-------------------|
| **Múltiples jornadas** | ✅ Sí (wizard) | ❌ No (modal individual) |
| **Validación empresa única** | ✅ Necesaria | ❌ No aplica |
| **Verificación jornadas previas** | ❌ No (inicial) | ✅ Sí (alerta confirmación) |
| **Validación empleados completos** | ✅ Sí (obligatorio) | ❌ No (opcional) |

---

## ⚠️ Pendientes / Mejoras Futuras

### Prioridad MEDIA
1. **Validación de duplicados en Gestionar Jornadas**:
   - Añadir las mismas validaciones del onboarding
   - Evitar que se asignen equipos/empleados a múltiples jornadas

2. **Unificar lógica de asignación**:
   - Extraer lógica compartida a `lib/jornadas/`
   - Reutilizar entre onboarding y gestionar

### Prioridad BAJA
1. **Migrar `tipo` a campo separado**:
   - Requiere migración de BD
   - Simplificaría queries
   - **Decisión**: Por ahora NO, mantener en config

---

## 🚀 Deployment Checklist

- [x] Código compilado sin errores TypeScript
- [x] Linting pasado  
- [x] Armonización entre onboarding y gestionar
- [x] Documentación completa
- [ ] Testing manual en staging
- [ ] Verificar con datos reales de producción
- [ ] Monitoreo de logs post-deploy

---

## 📊 Impacto

### Antes
- ❌ Dos APIs diferentes para equipos
- ❌ Equipos mostraban 0 miembros en ambos lugares
- ❌ Se podían crear jornadas conflictivas
- ❌ Validaciones inconsistentes
- ❌ Lógica diferente entre crear y editar

### Después
- ✅ API unificada `/api/equipos` 
- ✅ Visualización correcta de miembros
- ✅ Validaciones robustas (onboarding)
- ✅ Diseño armonizado
- ✅ Misma estructura de datos
- ✅ Documentación clara de diferencias intencionales

---

**Autor**: Claude (Anthropic)  
**Revisado por**: Sofia Roig  
**Estado**: ✅ Implementado, compilado y documentado

Co-Authored-By: Claude <noreply@anthropic.com>





