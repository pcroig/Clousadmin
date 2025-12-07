# Corrección: Eliminación de Duplicación de Gestión de Jornadas

**Fecha:** 7 Diciembre 2025 - 23:00h  
**Problema detectado:** Usuario veía el modal ANTIGUO en vez de la nueva UI implementada

---

## 🐛 Problema Raíz

Había **DOS lugares** para gestionar jornadas:

1. ❌ **Modal antiguo** (DEPRECADO): 
   - Ruta: `/hr/horario/fichajes` → botón "Jornadas" → modal `JornadasModal`
   - Archivo: `app/(dashboard)/hr/horario/fichajes/jornadas-modal.tsx`
   - NO tenía los cambios nuevos (tabla expandible, validación, etc.)

2. ✅ **Página nueva** (CORRECTO):
   - Ruta: `/hr/horario/jornadas`
   - Archivo: `app/(dashboard)/hr/horario/jornadas/jornadas-client.tsx`
   - SÍ tiene todos los cambios nuevos

**Resultado:** El usuario entraba a fichajes, hacía click en "Jornadas" y veía el modal antiguo sin los cambios.

---

## ✅ Solución Implementada

### 1. Cambios en `fichajes-client.tsx`

**Antes:**
```typescript
import { JornadasModal } from './jornadas-modal';

// Estado
const [jornadasModal, setJornadasModal] = useState(false);

// Botón mobile
{
  icon: Settings,
  label: 'Jornadas',
  onClick: () => setJornadasModal(true),  // ❌ Abre modal antiguo
}

// Botón desktop
<Button onClick={() => setJornadasModal(true)}>
  Jornadas
</Button>

// Renderiza modal
<JornadasModal 
  open={jornadasModal} 
  onClose={() => setJornadasModal(false)} 
/>
```

**Después:**
```typescript
// ✅ Import eliminado
// JornadasModal eliminado - ahora se usa la ruta /hr/horario/jornadas

// ✅ Estado eliminado
// const [jornadasModal, setJornadasModal] = useState(false);

// ✅ Botón mobile redirige
{
  icon: Settings,
  label: 'Jornadas',
  onClick: () => router.push('/hr/horario/jornadas'),  // ✅ Redirige a página nueva
}

// ✅ Botón desktop redirige
<Button onClick={() => router.push('/hr/horario/jornadas')}>
  Jornadas
</Button>

// ✅ Modal eliminado del render
// (Ya no existe en el JSX)
```

---

### 2. Deprecación de `jornadas-modal.tsx`

El archivo `app/(dashboard)/hr/horario/fichajes/jornadas-modal.tsx` fue **deprecado completamente**:

```typescript
// ========================================
// ARCHIVO DEPRECADO - NO USAR
// ========================================
//
// Este modal ha sido reemplazado por la página completa en:
// /hr/horario/jornadas
//
// Los botones que antes abrían este modal ahora redirigen a:
// router.push('/hr/horario/jornadas')
//
// Razón de la deprecación:
// - El modal antiguo no tenía la nueva UI de tabla expandible
// - No tenía el sistema de validación de asignaciones
// - Causaba confusión porque había dos lugares para gestionar jornadas
//
// Si necesitas gestionar jornadas, usa:
// - Ruta: /hr/horario/jornadas
// - Componente: app/(dashboard)/hr/horario/jornadas/jornadas-client.tsx
//
// Fecha de deprecación: 7 Diciembre 2025
// ========================================

export function JornadasModal() {
  console.error(
    '⚠️ JornadasModal está DEPRECADO. Usa router.push("/hr/horario/jornadas") en su lugar.'
  );
  return null;
}
```

**¿Por qué no eliminarlo completamente?**
- Para evitar errores de importación si hay código viejo que lo referencia
- El componente devuelve `null` y muestra error en consola si se usa
- Deja documentación clara de por qué fue eliminado

---

## 📁 Archivos Modificados

### Archivos Cambiados
1. ✅ `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx`
   - Eliminado import de `JornadasModal`
   - Eliminado estado `jornadasModal`
   - Cambiados botones a `router.push('/hr/horario/jornadas')`
   - Eliminado render del modal

2. ✅ `app/(dashboard)/hr/horario/fichajes/jornadas-modal.tsx`
   - Archivo deprecado completamente
   - Componente devuelve `null` con error en consola
   - Documentación clara de por qué fue eliminado

### Archivos NO Modificados (ya correctos)
3. ✅ `app/(dashboard)/hr/horario/jornadas/page.tsx` - Ruta correcta
4. ✅ `app/(dashboard)/hr/horario/jornadas/jornadas-client.tsx` - Componente con cambios nuevos

---

## 🎯 Cómo Prevenir Este Problema

### Para Futuros Desarrollos

**1. Principio de Única Fuente de Verdad**
- Nunca crear múltiples formas de hacer lo mismo
- Si hay un modal Y una página para lo mismo → eliminar uno

**2. Cuando Rediseñas una Funcionalidad**
```typescript
// ❌ MAL: Crear nuevo componente sin eliminar el viejo
// - Creas jornadas-client.tsx nuevo
// - Dejas jornadas-modal.tsx viejo
// - Usuario puede usar ambos y se confunde

// ✅ BIEN: Deprecar/eliminar el viejo
// - Creas jornadas-client.tsx nuevo
// - Deprecas jornadas-modal.tsx viejo
// - Cambias TODAS las referencias al viejo por el nuevo
// - Usuario solo puede usar el nuevo
```

**3. Buscar Todas las Referencias**
```bash
# Antes de deprecar un archivo, busca TODAS sus referencias:
grep -r "JornadasModal" app/
grep -r "import.*jornadas-modal" app/
grep -r "setJornadasModal" app/

# Cambia TODAS las referencias antes de deprecar
```

**4. Documentar la Deprecación**
```typescript
// ✅ BIEN: Dejar documentación clara
// ARCHIVO DEPRECADO - NO USAR
// Reemplazado por: /nueva/ruta
// Razón: ...
// Fecha: ...

// ❌ MAL: Solo borrar el archivo
// (nadie sabrá por qué fue eliminado)
```

---

## ✅ Resultado Final

Ahora hay **UN SOLO lugar** para gestionar jornadas:

**Ruta única:** `/hr/horario/jornadas`

**Cómo llegar:**
1. Desde fichajes: Botón "Jornadas" → redirige a `/hr/horario/jornadas`
2. Desde navegación: HR > Horario > Jornadas
3. Directo: http://localhost:3000/hr/horario/jornadas

**Funcionalidades disponibles:**
- ✅ Tabla expandible (click en fila para editar inline)
- ✅ Sistema de validación de asignaciones
- ✅ Columna "Asignados" con avatares
- ✅ Fix errores de hidratación HTML
- ✅ Validación que todos los empleados tengan 1 jornada

---

## 🔍 Verificación

### Antes de Este Fix
```
Usuario en /hr/horario/fichajes
  ↓ Click "Jornadas"
  ↓
Modal antiguo (JornadasModal) ❌
  - Sin tabla expandible
  - Sin validación
  - Sin cambios nuevos
```

### Después de Este Fix
```
Usuario en /hr/horario/fichajes
  ↓ Click "Jornadas"
  ↓ router.push('/hr/horario/jornadas')
  ↓
Página nueva (JornadasClient) ✅
  - Tabla expandible
  - Sistema de validación
  - Todos los cambios nuevos
```

---

## 📝 Lecciones Aprendidas

1. **Siempre deprecar código viejo** cuando creas funcionalidad nueva que lo reemplaza
2. **Buscar TODAS las referencias** antes de deprecar
3. **Usar redirección en lugar de modal** para funcionalidades complejas
4. **Documentar la deprecación** para que otros desarrolladores sepan por qué
5. **Verificar en localhost** DESPUÉS de deprecar para confirmar que funciona

---

*Generado: 7 de Diciembre de 2025 - 23:00h*  
*Problema resuelto definitivamente*
