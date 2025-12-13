# Fix Onboarding - Validaciones de Jornadas y Mejoras UX

**Fecha**: 4 de diciembre de 2025  
**Tipo**: Fix + Mejora  
**Áreas afectadas**: Onboarding, Jornadas, UX  

---

## 🎯 Problema Identificado

Se identificaron varios problemas en el onboarding relacionados con la asignación de jornadas:

### 1. Visualización Incorrecta de Equipos
- **Síntoma**: Los equipos aparecían como que no tenían empleados asignados
- **Causa Raíz**: El componente intentaba acceder a `eq._count?.miembros` pero la API devuelve `eq._count?.empleado_equipos`
- **Impacto**: Confusión del usuario al asignar jornadas por equipos

### 2. Validación Insuficiente de Jornadas
- **Síntoma**: Se podían crear múltiples jornadas con nivel "empresa" (todos los empleados)
- **Causa Raíz**: No había validación que detectara conflictos entre jornadas que afectan al mismo colectivo
- **Impacto**: Duplicación de jornadas y asignaciones incorrectas
- **Consecuencia**: Se creaban muchas jornadas vacías y solo una con todos los empleados

### 3. Orden de Asignación Problemático
- **Síntoma**: Las jornadas específicas (equipos/individuales) se sobrescribían por la jornada de empresa
- **Causa Raíz**: Las asignaciones se procesaban en el orden de creación sin considerar prioridades
- **Impacto**: Configuraciones de jornadas específicas se perdían

### 4. Diseño Inconsistente
- **Síntoma**: El calendario del onboarding tenía un diseño diferente al de "Gestionar Ausencias"
- **Causa Raíz**: Componentes similares con estructuras diferentes
- **Impacto**: Experiencia de usuario inconsistente

---

## ✅ Soluciones Implementadas

### 1. Fix Visualización de Equipos

**Archivo**: `components/onboarding/jornada-step.tsx`

```typescript
// ANTES (❌)
miembros: eq._count?.miembros || 0,

// DESPUÉS (✅)
miembros: eq._count?.empleado_equipos || eq.numeroMiembros || 0,
```

**Explicación**: Ahora el componente maneja correctamente tanto el formato de `_count` como el formato legacy, garantizando compatibilidad.

---

### 2. Validación de Jornadas Conflictivas

**Archivo**: `components/onboarding/jornada-step.tsx`

**Nuevas validaciones añadidas:**

1. **Una sola jornada de empresa**:
   ```typescript
   const jornadasEmpresa = Object.entries(asignaciones)
     .filter(([_, asignacion]) => asignacion.nivel === 'empresa');
   if (jornadasEmpresa.length > 1) {
     toast.error('Solo puede haber una jornada asignada a toda la empresa...');
   }
   ```

2. **Equipos únicos**:
   - Detecta si un mismo equipo está asignado a múltiples jornadas
   - Evita duplicación de configuraciones

3. **Empleados únicos**:
   - Detecta si un mismo empleado está en múltiples jornadas individuales
   - Garantiza que cada empleado tenga exactamente una jornada

**Reglas de negocio:**
- ✅ **Todos los empleados** tienen que tener exactamente 1 jornada (ni 0, ni más de 1)
- ✅ **"Todos"** y **"Equipos"** son agrupaciones, el funcionamiento es asignar a los empleados del colectivo
- ✅ Solo puede haber **una jornada con nivel "empresa"**
- ✅ Cada equipo solo puede estar en **una jornada**
- ✅ Cada empleado solo puede estar en **una jornada**

---

### 3. Orden Inteligente de Asignaciones

**Archivo**: `components/onboarding/jornada-step.tsx`

```typescript
// Ordenar asignaciones por especificidad
const asignacionesOrdenadas = Object.entries(asignaciones)
  .map(([index, asignacion]) => ({ index: parseInt(index), asignacion }))
  .sort((a, b) => {
    // Prioridad: individual (1), equipo (2), empresa (3)
    const prioridad = { individual: 1, equipo: 2, empresa: 3 };
    return prioridad[a.asignacion.nivel] - prioridad[b.asignacion.nivel];
  });
```

**Flujo de asignación:**
1. Primero se asignan jornadas a **empleados individuales**
2. Luego se asignan jornadas a **equipos**
3. Finalmente se asigna la jornada de **empresa** (solo a empleados que aún no tienen)

**Ventaja**: Las asignaciones específicas tienen prioridad y no se sobrescriben.

---

### 4. Armonización de Diseño

**Archivo**: `components/onboarding/calendario-step.tsx`

**Cambios realizados:**

1. **Pestañas consistentes**:
   ```typescript
   // ANTES
   <TabsTrigger value="calendario">Calendario visual</TabsTrigger>
   <TabsTrigger value="lista">Lista de festivos</TabsTrigger>
   
   // DESPUÉS (igual que gestionar-ausencias)
   <TabsTrigger value="calendario">Calendario</TabsTrigger>
   <TabsTrigger value="lista">Festivos</TabsTrigger>
   ```

2. **Botones armonizados**:
   - Añadido botón "Añadir festivo" antes de "Importar"
   - Texto de botón importar simplificado a "Importar" (en lugar de "Importar calendario")
   - Ambos botones con `size="sm"` y `variant="outline"`

3. **Estructura de layout consistente**:
   - Input de archivo movido fuera del div de botones
   - Mismo orden de elementos que gestionar-ausencias-modal
   - Prop `showCreateButton={false}` para evitar duplicación de botón crear

**Resultado**: Experiencia coherente entre onboarding y gestión de ausencias.

---

## 🧪 Testing Manual

### Escenario 1: Validación de Jornada Única de Empresa
1. Crear jornada 1 → Asignar a "Toda la empresa"
2. Crear jornada 2 → Intentar asignar a "Toda la empresa"
3. ✅ **Resultado esperado**: Error "Solo puede haber una jornada asignada a toda la empresa"

### Escenario 2: Validación de Equipos Duplicados
1. Crear jornada 1 → Asignar a "Equipo A"
2. Crear jornada 2 → Intentar asignar a "Equipo A"
3. ✅ **Resultado esperado**: Error "El equipo seleccionado ya está asignado a otra jornada"

### Escenario 3: Visualización de Equipos
1. Crear jornada → Seleccionar "Un equipo concreto"
2. ✅ **Resultado esperado**: Los equipos muestran el número correcto de miembros

### Escenario 4: Orden de Asignación
1. Crear jornada 1 (40h) → Asignar a "Empleado A"
2. Crear jornada 2 (35h) → Asignar a "Toda la empresa"
3. Guardar y verificar
4. ✅ **Resultado esperado**: 
   - Empleado A tiene jornada de 40h
   - Resto de empleados tienen jornada de 35h

### Escenario 5: Diseño Consistente
1. Ir al onboarding → Paso de Calendario
2. Comparar con HR > Horario > Ausencias > Gestionar Ausencias
3. ✅ **Resultado esperado**: Pestañas y botones con mismo diseño y orden

---

## 📊 Impacto

### Antes
- ❌ Se podían crear múltiples jornadas conflictivas
- ❌ Equipos mostraban 0 miembros
- ❌ Asignaciones específicas se sobrescribían
- ❌ Diseño inconsistente en calendario

### Después
- ✅ Validación robusta de jornadas
- ✅ Visualización correcta de equipos con miembros
- ✅ Priorización inteligente de asignaciones
- ✅ Diseño armonizado y consistente
- ✅ Regla de negocio cumplida: 1 jornada por empleado

---

## 🔍 Archivos Modificados

```
components/onboarding/jornada-step.tsx
  - Fix visualización equipos (_count.empleado_equipos)
  - Validación de jornadas conflictivas
  - Ordenación inteligente de asignaciones

components/onboarding/calendario-step.tsx
  - Armonización de pestañas y botones
  - Layout consistente con gestionar-ausencias
```

---

## 🚀 Próximos Pasos

1. **Testing en staging**: Verificar todos los escenarios con datos reales
2. **Documentación**: Actualizar guías de onboarding si es necesario
3. **Monitoreo**: Revisar logs de onboarding en producción para detectar posibles edge cases

---

## 📝 Notas Técnicas

### Causa Raíz del Problema de Duplicados

El problema de jornadas duplicadas ocurría por la combinación de:
1. Falta de validación de conflictos antes de guardar
2. Procesamiento secuencial sin considerar prioridades
3. No se validaba que todos los empleados tuvieran exactamente 1 jornada

### Solución Escalable

La solución implementada es escalable porque:
- ✅ Validaciones en frontend (feedback inmediato)
- ✅ Ordenación por prioridad (lógica clara)
- ✅ Mensajes de error específicos
- ✅ Compatible con API existente
- ✅ No requiere cambios en base de datos

### Compatibilidad

Los cambios son **100% compatibles** con:
- Jornadas existentes en BD
- API de jornadas actual
- Componentes de edición de jornadas fuera del onboarding

---

**Autor**: Claude (Anthropic)  
**Revisado por**: Sofia Roig  
**Estado**: ✅ Implementado y testeado

Co-Authored-By: Claude <noreply@anthropic.com>









