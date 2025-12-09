# Rediseño Completo del Onboarding de Empleado

**Fecha:** 2025-12-09
**Tipo:** Feature / Refactor
**Impacto:** Alto

---

## 🎯 Resumen

Rediseño completo del flujo de onboarding de empleados, eliminando la sidebar/checklist y adoptando un diseño secuencial simple con acordeones para las acciones del workflow.

---

## 🔄 Cambios Realizados

### 1. Rediseño de Estructura de Pasos

**Antes:**
- Diseño con sidebar y checklist
- Acciones del workflow como pasos secuenciales separados (4, 5, 6...)
- Títulos estáticos
- Sin navegación "Anterior"/"Siguiente" en PWA

**Ahora:**
- ✅ Diseño secuencial simple (pasos 1-3)
- ✅ Un solo paso 4 con **todas** las acciones del workflow en acordeones
- ✅ Títulos dinámicos que cambian por paso
- ✅ Navegación completa con botones "Anterior"/"Siguiente"

### 2. Paso 4: Workflow con Acordeones

**Archivo creado:** `components/onboarding/workflow-acciones-step.tsx`

**Características:**
- Muestra todas las acciones del workflow en una sola pantalla
- Usa acordeones (`Accordion` de shadcn/ui)
- Permite completar acciones en **cualquier orden**
- Actualización inmediata del progreso (sin refresh)
- Checkmark verde ✓ cuando una acción está completada
- Botón "Completar onboarding" solo activo cuando todas las acciones están completadas

**Tipos de acciones soportadas:**
1. `rellenar_campos` - Formulario con campos configurables
2. `compartir_docs` - Documentos compartidos para revisar
3. `solicitar_docs` - Subir documentos requeridos
4. `solicitar_firma` - Firmar documentos

### 3. Títulos Dinámicos

**Implementación en:** `app/(auth)/onboarding/[token]/onboarding-form.tsx:115-144`

```typescript
const getCurrentStepInfo = () => {
  if (currentStep === 1) {
    return {
      title: `Hola ${saludoNombre}, bienvenido a ${nombreEmpresa}`,
      description: `Configura tu acceso a ${nombreEmpresa}.`,
    };
  }
  if (currentStep === 2) {
    return {
      title: 'Conecta tus herramientas de trabajo',
      description: 'Sincroniza tu calendario y app de mensajería.',
    };
  }
  if (currentStep === 3) {
    return {
      title: 'Instala Clousadmin en tu móvil',
      description: 'Accede fácilmente desde tu smartphone.',
    };
  }
  if (currentStep === 4 && accionesActivas.length > 0) {
    return {
      title: 'Completa tu perfil',
      description: 'Finaliza las acciones pendientes para activar tu cuenta.',
    };
  }
  // ...
};
```

### 4. Navegación en PWA

**Archivo modificado:** `components/onboarding/pwa-explicacion.tsx`

**Cambios:**
- Añadido prop `onBack?: () => void`
- Añadido prop `showBackButton?: boolean`
- Renderiza botones "Anterior" y "Siguiente"/"Completar onboarding"

```typescript
{showCompleteButton && (
  <div className="flex justify-between pt-4 border-t">
    {showBackButton && onBack && (
      <Button variant="outline" onClick={onBack} disabled={loading}>
        Anterior
      </Button>
    )}
    <LoadingButton onClick={handleComplete} loading={loading}>
      {loading ? 'Cargando...' : buttonText}
    </LoadingButton>
  </div>
)}
```

### 5. Estado Local de Progreso

**Problema:** Al completar una acción, el checkmark no aparecía hasta recargar la página.

**Solución:** Estado local que se actualiza inmediatamente.

```typescript
const [progresoLocal, setProgresoLocal] = useState(progreso);

const handleActualizarDatos = async (accionId: string, datos?: Record<string, unknown>) => {
  // 1. Guardar en servidor
  await fetch(`/api/onboarding/${token}/progreso`, { ... });

  // 2. Actualizar estado local INMEDIATAMENTE
  setProgresoLocal(prev => ({
    ...prev,
    acciones: {
      ...prev.acciones,
      [accionId]: true,
    },
  }));

  // 3. Mostrar feedback
  toast.success('Acción completada correctamente');
};
```

### 6. Fix Crítico: Conversión de fechaNacimiento

**Problema:** Prisma rechazaba `fechaNacimiento: "2025-12-03"` (string) esperando `DateTime`.

**Error:**
```
Invalid value for argument `fechaNacimiento`: premature end of input. Expected ISO-8601 DateTime.
```

**Solución en:** `lib/onboarding.ts:741-750`

```typescript
for (const campo of camposATransferir) {
  if (datosTemporales[campo] !== undefined && datosTemporales[campo] !== null) {
    // Convertir fechaNacimiento de string a Date
    if (campo === 'fechaNacimiento' && typeof datosTemporales[campo] === 'string') {
      datosEmpleado[campo] = new Date(datosTemporales[campo] as string);
    } else {
      datosEmpleado[campo] = datosTemporales[campo];
    }
  }
}
```

### 7. Simplificación de Importación de Empleados

**Archivo modificado:** `components/shared/importar-empleados-excel.tsx`

**Cambios:**
- ❌ Eliminado paso intermedio "Confirmar e importar X empleados"
- ✅ Importación directa después de analizar el archivo
- ✅ Botón cambiado de "Guardar y volver" a "Guardar"

**Archivo modificado:** `app/(auth)/signup/signup-form.tsx`

**Cambios en banner:**
- Solo muestra "empleados del equipo" (no cuenta al HR admin)
- Solo aparece cuando hay 2+ empleados totales (admin + al menos 1 del equipo)

```typescript
{empleadosCount > 1 && (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <p className="text-sm text-green-800">
      ✓ {empleadosCount - 1} empleado{empleadosCount - 1 > 1 ? 's' : ''} del equipo añadido{empleadosCount - 1 > 1 ? 's' : ''}
    </p>
  </div>
)}
```

### 8. Componentes Modificados

**Componentes de acciones individuales:**
Eliminados props de navegación innecesarios (`onBack`, `showBackButton`) ya que ahora se usan dentro de acordeones:

- `components/onboarding/rellenar-campos-step.tsx`
- `components/onboarding/compartir-docs-step.tsx`
- `components/onboarding/solicitar-docs-step.tsx`
- `components/onboarding/solicitar-firma-step.tsx`

Botones simplificados:
- "Guardar" (rellenar campos)
- "Marcar como leído" (compartir docs)
- "Confirmar documentos" (solicitar docs)
- "Confirmar firmas" (solicitar firma)

---

## 📁 Archivos Modificados

### Nuevos
- `components/onboarding/workflow-acciones-step.tsx` - Contenedor de acordeones para workflow
- `docs/funcionalidades/onboarding-empleado.md` - Documentación completa

### Modificados
- `app/(auth)/onboarding/[token]/onboarding-form.tsx` - Reescrito completamente
- `components/onboarding/pwa-explicacion.tsx` - Añadidos botones de navegación
- `components/onboarding/rellenar-campos-step.tsx` - Eliminados props de navegación
- `components/onboarding/compartir-docs-step.tsx` - Eliminados props de navegación
- `components/onboarding/solicitar-docs-step.tsx` - Eliminados props de navegación, botón "Confirmar documentos"
- `components/onboarding/solicitar-firma-step.tsx` - Eliminados props de navegación, botón "Confirmar firmas"
- `lib/onboarding.ts` - Fix conversión de fechaNacimiento
- `components/shared/importar-empleados-excel.tsx` - Eliminado paso de confirmación
- `app/(auth)/signup/signup-form.tsx` - Banner solo muestra empleados del equipo
- `docs/funcionalidades/onboarding-empresa.md` - Actualizado con cambios v2.2

---

## 🎨 Mejoras de UX

### Antes
- Sidebar con checklist compleja
- Pasos del workflow separados (navegación confusa)
- Sin indicación clara de qué falta completar
- Títulos estáticos en todo el flujo

### Ahora
- ✅ Diseño limpio y secuencial
- ✅ Todas las acciones visibles en una pantalla
- ✅ Checkmarks verdes ✓ claros
- ✅ Títulos contextuales por paso
- ✅ Navegación intuitiva con botones "Anterior"/"Siguiente"
- ✅ Feedback inmediato al completar acciones

---

## 🐛 Bugs Corregidos

### 1. fechaNacimiento como String
**Severidad:** Alta
**Impacto:** Bloqueaba completar onboarding

**Error:**
```
Invalid `prisma.empleados.update()` invocation
Invalid value for argument `fechaNacimiento`: "2025-12-03"
Expected ISO-8601 DateTime
```

**Fix:** Conversión explícita a `Date` antes de guardar en base de datos.

### 2. Progreso No se Actualizaba
**Severidad:** Media
**Impacto:** Confusión del usuario (parecía que no se guardaba)

**Fix:** Estado local `progresoLocal` que se actualiza inmediatamente al completar acciones.

### 3. Workflow como Pasos Secuenciales
**Severidad:** Media
**Impacto:** Mala UX (usuario forzado a completar en orden)

**Fix:** Acordeones que permiten completar en cualquier orden.

---

## 📊 Métricas de Impacto

### Líneas de Código
- **Añadidas:** ~500 líneas (nuevo componente + documentación)
- **Modificadas:** ~300 líneas (refactor de onboarding-form)
- **Eliminadas:** ~200 líneas (sidebar/checklist viejo)

### Componentes
- **Nuevos:** 1 (`WorkflowAccionesStep`)
- **Modificados:** 8
- **Eliminados:** 0 (mantenemos backward compatibility)

---

## 🔒 Seguridad

**Sin cambios de seguridad.** Todos los endpoints existentes se mantienen:
- Token validation
- Encriptación de datos sensibles
- Permisos de acceso

---

## 🚀 Deployment

### Requisitos
- ✅ No requiere migraciones de base de datos
- ✅ No requiere cambios de env variables
- ✅ Compatible con onboardings existentes

### Rollback
Si es necesario revertir:
1. Restaurar `onboarding-form.tsx` a versión anterior
2. Eliminar `workflow-acciones-step.tsx`
3. Revertir cambios en componentes individuales

---

## 📚 Documentación Actualizada

- ✅ Creado: `docs/funcionalidades/onboarding-empleado.md`
- ✅ Actualizado: `docs/funcionalidades/onboarding-empresa.md`
- ✅ Creado: `docs/historial/2025-12-09-rediseno-onboarding-empleado.md` (este archivo)

---

## ✅ Testing Realizado

### Manual Testing
- ✅ Flujo completo de onboarding simplificado
- ✅ Flujo completo de onboarding con workflow
- ✅ Completar acciones en diferente orden
- ✅ Navegación Anterior/Siguiente
- ✅ Conversión de fechaNacimiento
- ✅ Actualización inmediata de progreso

### Edge Cases
- ✅ Onboarding sin workflow (solo 3 pasos)
- ✅ Onboarding con todas las acciones del workflow
- ✅ Recargar página en medio del onboarding
- ✅ Completar onboarding dos veces (prevención)

---

## 🔮 Trabajo Futuro

### Posibles Mejoras
1. **Layout de dos columnas** en formularios de rellenar campos
2. **Preview de documentos** en paso de compartir docs
3. **Progreso parcial** en acciones (ej: 2/5 documentos subidos)
4. **Estimación de tiempo** por acción
5. **Gamificación** (badges, celebraciones)

### Configuración de Workflow
Actualmente el workflow se configura manualmente en base de datos. Futuro:
- Panel de HR Admin para configurar workflow
- Templates predefinidos de onboarding
- Conditional logic (si X entonces Y)

---

## 👥 Equipo

**Desarrollador:** Claude Code + Sofia Roig
**Reviewer:** Sofia Roig
**Testing:** Sofia Roig

---

**Última actualización:** 2025-12-09
**Estado:** ✅ Completado e implementado
