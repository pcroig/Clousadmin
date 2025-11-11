# Análisis de Recuperación: Mi Espacio

## 📋 RESUMEN EJECUTIVO

**Fecha**: 11 de noviembre de 2025  
**Commits afectados**:
- `d3e2378` - Tu trabajo original (`feat(mi-espacio): unificar tabs y mejorar UX de guardado`)
- `5d5e338` - Refactor que pisó cambios (`refactor(mi-espacio): unificar vista de ausencias`)

---

## ✅ LO QUE YA ESTÁ IMPLEMENTADO (en 5d5e338)

### Arquitectura mejorada
- ✅ Componente `AusenciasTab` movido a `components/shared/mi-espacio/ausencias-tab.tsx` (reutilizable)
- ✅ Modal de solicitud extraído a `SolicitarAusenciaModal` (componente separado)
- ✅ Optimización con `useMemo` para evitar re-renders innecesarios
- ✅ Helper `getAusenciaEstadoLabel` en `lib/utils/formatters.ts`
- ✅ Leyenda del calendario como constante (`calendarioLegend`)

### Funcionalidad General Tab (HR)
- ✅ **Botón guardar** funcional (línea 100 en `hr/mi-espacio/mi-espacio-hr-client.tsx`)
- ✅ **Lógica de auto-aprobación** implementada (líneas 188-220 en `general-tab.tsx`)
- ✅ **Diferenciación empleado/manager vs admin**:
  - Empleado/Manager → crea solicitud → auto-aprueba
  - Admin → guarda directo sin solicitud
- ✅ **Tracking de cambios** con `hasChanges` state

---

## ❌ LO QUE FALTA IMPLEMENTAR (de tus requisitos)

### 🔴 CRÍTICO - Calendario

#### Requisito original:
> "El calendario tiene que estar sincronizado con el calendario laboral de la empresa y la jornada del individuo! El calendario tiene que mostrar dos meses juntos, que ocupen el ancho de la card (respetando los margenes). Desde el calendario debería poder clicar y seleccionar los dias (popover)."

#### Estado actual:
- ❌ **Popover de selección NO implementado** - Solo muestra ausencias, no permite seleccionar fechas desde el calendario
- ⚠️ **Sincronización parcial** - Muestra días laborables y festivos, pero falta verificar jornada individual del empleado
- ✅ Dos meses mostrados correctamente

#### Código en versión antigua (d3e2378) que tiene valor:
```typescript
// Línea 282-295 en ausencias-tab.tsx (versión antigua)
const getDiaEstado = (date: Date): string | null => {
  const dateKey = format(date, 'yyyy-MM-dd');
  
  for (const ausencia of (ausencias || [])) {
    const inicio = new Date(ausencia.fechaInicio);
    const fin = new Date(ausencia.fechaFin);
    
    if (isWithinInterval(date, { start: inicio, end: fin })) {
      return ausencia.estado;
    }
  }
  
  return null;
};
```

**ACCIÓN NECESARIA**: Agregar funcionalidad de clic en calendario que abra popover con:
- Fecha seleccionada
- Estado (laborable/festivo/ausencia)
- Botón "Solicitar ausencia" si es día laborable

---

### 🔴 CRÍTICO - Unificación de tabs

#### Requisito original:
> "Espacio tienen tanto empleados, managers y Admins. Unificalo. La unica diferencia es que los empleados y managers los cambios generan una solicitud y los admins se guardan directamente."

#### Estado actual:
- ✅ **General Tab**: Ya unificado en `components/shared/mi-espacio/` (NO, sigue en `app/(dashboard)/hr/mi-espacio/tabs/`)
- ⚠️ **Ausencias Tab**: Movido a `components/shared` pero sin lógica de roles
- ❌ **Fichajes Tab**: NO unificado
- ❌ **Contratos Tab**: NO unificado

**ACCIÓN NECESARIA**: 
1. Mover todos los tabs a `components/shared/mi-espacio/`
2. Pasar prop `rol` a cada tab
3. Implementar lógica condicional de guardado según rol

---

### 🟡 IMPORTANTE - Campos duplicados

#### Requisito original:
> "Informacion laboral (quitalo de general) ya está en contratos. También quita el salario de general, es en contrato. Y quita salario bruto mensual!"

#### Estado actual:
- ❌ Salario sigue en General Tab
- ❌ Información laboral duplicada
- ❌ Salario bruto mensual no eliminado
- ❌ Complementos NO implementados dentro de salarios

**ACCIÓN NECESARIA**: Auditoría completa de campos en `general-tab.tsx` y `contratos-tab.tsx`

---

### 🟡 IMPORTANTE - Botón guardar posición

#### Requisito original:
> "Para guardar los cambios en general y contratos tiene que aparecer un boton arriba a la derecha (altura del avatar y titulo)."

#### Estado actual:
- ✅ HR tiene botón arriba a la derecha (línea 100-108 en `mi-espacio-hr-client.tsx`)
- ❌ Empleado NO tiene botón en esa posición (está abajo en `datos-client.tsx` línea 126-130)

**ACCIÓN NECESARIA**: Unificar posición del botón en todos los roles

---

### 🟡 IMPORTANTE - Sincronización jornada

#### Requisito original:
> "Muy importante: que este sincronizado la jornada (fichajes) con la jornada que sale en el espacio /hr/organizacion/personas/contrato>Jornada."

#### Estado actual:
- ⚠️ **Requiere verificación** - Buscar en schema de Prisma y API de fichajes

**ACCIÓN NECESARIA**: Auditar relación entre:
- `empleado.jornada` (en contratos)
- Cálculo de horas en `lib/calculos/fichajes.ts`
- Tab de fichajes en Mi Espacio

---

### 🟢 SECUNDARIO - Diseño documentos

#### Requisito original:
> "El diseño de las cards de los documentos, tiene que ser igual que el de los documentos de HR."

**ACCIÓN NECESARIA**: Comparar componentes de documentos y unificar diseño

---

### 🟢 SECUNDARIO - Historial cambios salario

#### Requisito original:
> "en cambios de salario, tiene que salir una fila editable con el nuevo salario y la fecha cambiada."

**ACCIÓN NECESARIA**: Implementar tabla de historial de salarios en Contratos Tab

---

### 🟢 SECUNDARIO - Botón "Dar de baja"

#### Requisito original:
> "En contratos dar de baja tiene que salir arriba a la derecha (como el boton de guardar), no como una card independiente"

**ACCIÓN NECESARIA**: Mover botón y conectar con `@offboarding.md`

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Análisis (AHORA)
1. ✅ Comparar ambas versiones de ausencias-tab.tsx
2. ✅ Identificar requisitos no cumplidos
3. ⏳ Crear documento de análisis (este archivo)

### Fase 2: Decisión de arquitectura
**OPCIÓN A** (Recomendada): Mantener refactor + migrar funcionalidades faltantes
- ✅ Mantiene optimizaciones (`useMemo`)
- ✅ Mantiene componentes reutilizables
- ✅ Solo migras lo que falta
- ⚠️ Más trabajo de integración

**OPCIÓN B**: Revertir refactor completo
- ✅ Recuperas todo tu trabajo inmediatamente
- ❌ Pierdes optimizaciones del refactor
- ❌ Componentes menos reutilizables

### Fase 3: Implementación (si eliges OPCIÓN A)

#### 3.1 Calendario con popover (2-3 horas)
```typescript
// Agregar en components/shared/mi-espacio/ausencias-tab.tsx
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
const [showPopover, setShowPopover] = useState(false);

// En Calendar component:
<Calendar
  onDayClick={(date) => {
    setSelectedDate(date);
    setShowPopover(true);
  }}
  // ... resto de props
/>

// Agregar Popover component con:
// - Mostrar fecha
// - Mostrar estado (laborable/festivo/ausencia)
// - Botón "Solicitar ausencia" si es laborable
```

#### 3.2 Unificar tabs (4-6 horas)
1. Mover `general-tab.tsx` a `components/shared/mi-espacio/`
2. Mover `fichajes-tab.tsx` a `components/shared/mi-espacio/`
3. Mover `contratos-tab.tsx` a `components/shared/mi-espacio/`
4. Actualizar imports en:
   - `app/(dashboard)/empleado/mi-espacio/mi-espacio-client.tsx`
   - `app/(dashboard)/manager/mi-espacio/mi-espacio-manager-client.tsx`
   - `app/(dashboard)/hr/mi-espacio/mi-espacio-hr-client.tsx`

#### 3.3 Limpiar campos duplicados (1-2 horas)
1. Auditar `FORM_FIELDS` en `general-tab.tsx`
2. Eliminar: salario, información laboral, salario bruto mensual
3. Agregar complementos en `contratos-tab.tsx`

#### 3.4 Sincronizar jornada (2-3 horas)
1. Verificar schema Prisma `empleado.jornada`
2. Verificar cálculo en `lib/calculos/fichajes.ts`
3. Sincronizar con tab Fichajes

#### 3.5 Botón guardar posición (30 min)
1. Unificar en todos los `mi-espacio-*-client.tsx`

#### 3.6 Resto de features (3-4 horas)
- Diseño documentos
- Historial salarios
- Botón dar de baja

**TOTAL ESTIMADO**: 13-19 horas

---

## 🚨 CÓMO EVITAR QUE VUELVA A PASAR

### 1. **Trabaja SIEMPRE en ramas de feature**
```bash
# ❌ NUNCA hagas esto:
git checkout main
# ... trabajar directamente en main

# ✅ SIEMPRE haz esto:
git checkout -b feat/mi-espacio-unificacion
# ... trabajar en rama
git push origin feat/mi-espacio-unificacion
# Abrir Pull Request en GitHub
```

### 2. **Sube tus ramas frecuentemente**
```bash
# Cada día o cada vez que completes una parte:
git add .
git commit -m "feat(mi-espacio): calendario con popover WIP"
git push origin feat/mi-espacio-unificacion
```

### 3. **Abre PRs aunque estén en progreso**
- Marca como "Draft" / "WIP" en GitHub
- Así nadie puede pisar tu trabajo sin que veas el conflicto

### 4. **Sincroniza con `main` regularmente**
```bash
# Desde tu rama:
git fetch origin
git rebase origin/main

# Si hay conflictos, Git te avisará ANTES de que se pise nada
```

### 5. **Usa `git stash` si necesitas cambiar de rama**
```bash
git stash save "trabajo en progreso calendario"
git checkout main
git pull
git checkout feat/mi-espacio-unificacion
git stash pop
```

### 6. **Commits pequeños y frecuentes**
- Mejor 10 commits pequeños que 1 commit gigante
- Más fácil de revertir si algo sale mal
- `git reflog` te permite recuperar commits perdidos

---

## 📝 PRÓXIMOS PASOS INMEDIATOS

1. **DECIDE**: ¿Opción A (mantener refactor) u Opción B (revertir)?
2. **Si Opción A**: Empezar por Fase 3.1 (calendario popover) - es lo más crítico
3. **Si Opción B**: 
   ```bash
   git checkout main
   git revert 5d5e338
   # Resolver conflictos manualmente
   ```

4. **En cualquier caso**:
   - Crear rama nueva para el trabajo
   - Subir a GitHub/GitLab
   - Abrir PR
   - ¡No trabajar más directamente en `main`!

---

**¿Qué prefieres? ¿Opción A o B?**

