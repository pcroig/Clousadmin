# Changelog - Sistema de Notificaciones v2.3.0

**Fecha**: 2025-11-29
**Versión**: 2.3.0
**Estado**: ✅ COMPLETADO

---

## 📊 Resumen de Cambios

### Nuevas Notificaciones Implementadas: +4 tipos

1. **`fichaje_aprobado`** - Notifica al empleado cuando HR/Manager aprueba su fichaje
2. **`fichaje_rechazado`** - Notifica al empleado cuando HR/Manager rechaza su fichaje (con motivo)
3. **`complemento_asignado`** - Notifica al empleado y manager cuando se asigna un complemento salarial
4. **`documento_eliminado`** - Notifica al empleado cuando HR elimina un documento de su expediente

### Total de Notificaciones: 33 → 37 tipos

---

## 🆕 Nuevas Notificaciones (Detalle)

### 1. Fichaje Aprobado

**Archivo**: `lib/notificaciones.ts:738-768`
**API**: `app/api/fichajes/[id]/route.ts:173-187`

```typescript
crearNotificacionFichajeAprobado(prisma, {
  fichajeId,
  empresaId,
  empleadoId,
  fecha,
}, { actorUsuarioId: session.user.id });
```

**Destinatario**: Empleado afectado
**Título**: `"Fichaje aprobado"`
**Mensaje**: `"Tu fichaje del [fecha] ha sido aprobado y finalizado."`
**Icono**: CheckCircle (✓)
**Prioridad**: Normal

---

### 2. Fichaje Rechazado

**Archivo**: `lib/notificaciones.ts:770-802`
**API**: `app/api/fichajes/[id]/route.ts:198-213`

```typescript
crearNotificacionFichajeRechazado(prisma, {
  fichajeId,
  empresaId,
  empleadoId,
  fecha,
  motivoRechazo,  // Opcional
}, { actorUsuarioId: session.user.id });
```

**Destinatario**: Empleado afectado
**Título**: `"Fichaje requiere corrección"`
**Mensaje**: `"Tu fichaje del [fecha] necesita ser corregido. Motivo: [motivo]"`
**Icono**: XCircle (✗)
**Prioridad**: Alta

---

### 3. Complemento Asignado

**Archivo**: `lib/notificaciones.ts:1938-2001`
**API**: `app/api/empleados/[id]/complementos/route.ts:202-217`

```typescript
crearNotificacionComplementoAsignado(prisma, {
  empleadoId,
  empleadoNombre,
  empresaId,
  complementoNombre,
  importe,  // Opcional
}, { actorUsuarioId: session.user.id });
```

**Destinatarios**:
- Empleado afectado
- Manager del empleado (si existe)

**Para Empleado:**
- **Título**: `"Nuevo complemento: [nombre]"`
- **Mensaje**: `"Se te ha asignado el complemento '[nombre]' por [importe]€. Se aplicará en tus próximas nóminas."`

**Para Manager:**
- **Título**: `"Complemento asignado a [empleado]"`
- **Mensaje**: `"Se ha asignado el complemento '[nombre]' a [empleado] por [importe]€."`

**Icono**: DollarSign ($)
**Prioridad**: Normal

---

### 4. Documento Eliminado

**Archivo**: `lib/notificaciones.ts:1587-1617`
**API**: `app/api/documentos/[id]/route.ts:205-221`

```typescript
crearNotificacionDocumentoEliminado(prisma, {
  documentoNombre,
  tipoDocumento,
  empresaId,
  empleadoId,
}, { actorUsuarioId: session.user.id });
```

**Destinatario**: Empleado afectado (solo si el documento tiene `empleadoId`)
**Título**: `"Documento eliminado: [tipo]"`
**Mensaje**: `"El documento '[nombre]' ha sido eliminado de tu expediente por el departamento de RR.HH."`
**Icono**: FileText
**Prioridad**: Normal

**Nota**: Solo notifica si el documento pertenece a un empleado específico. Documentos sin `empleadoId` (documentos de empresa) NO generan notificación.

---

## ✨ Mejoras en Descripciones

### Apellidos Completos en Solicitudes

**Archivos modificados**:
- `app/(dashboard)/hr/dashboard/page.tsx`
- `app/(dashboard)/manager/dashboard/page.tsx`
- `components/shared/solicitudes-widget.tsx`

**Antes**: `"María solicita vacaciones"`
**Ahora**: `"María García solicita vacaciones (15 dic - 22 dic)"`

**Cambios**:
- Añadidos **apellidos completos** del empleado
- Añadido **periodo de fechas** en solicitudes de ausencias

---

### Fechas en Solicitudes de Ausencias

**Archivos modificados**:
- `app/(dashboard)/hr/dashboard/page.tsx`
- `app/(dashboard)/manager/dashboard/page.tsx`

**Antes**: `"Vacaciones"`
**Ahora**: `"Vacaciones (15 dic - 22 dic)"`

**Implementación**:
```typescript
const fechaInicio = new Date(aus.fechaInicio);
const fechaFin = new Date(aus.fechaFin);
const periodo = `${fechaInicio.toLocaleDateString('es-ES', {
  day: 'numeric',
  month: 'short'
})} - ${fechaFin.toLocaleDateString('es-ES', {
  day: 'numeric',
  month: 'short'
})}`;

descripcion: `${aus.tipo} (${periodo})`
```

---

### Eliminado Término "Autoaprobado"

**Archivo modificado**: `lib/notificaciones.ts`

**Antes**: `"Enfermedad autoaprobada para María García..."`
**Ahora**: `"Ausencia registrada para María García del 15 dic al 22 dic."`

**Motivo**: El término "autoaprobado" es confuso. Ahora se usa lenguaje más claro que indica simplemente que la ausencia fue registrada (porque no requiere aprobación).

---

### Reducción de Redundancia Título/Descripción

**Ejemplos de cambios**:

| Tipo | Antes | Ahora |
|------|-------|-------|
| `ausencia_solicitada` | **Título**: "María García solicita Vacaciones (15 dic - 22 dic)"<br>**Mensaje**: "María García solicita 5 días de Vacaciones..." | **Título**: "Nueva solicitud: Vacaciones"<br>**Mensaje**: "María García solicita 5 días de Vacaciones del 15 dic - 22 dic." |
| `ausencia_aprobada` | **Título**: "Tu Vacaciones fue aprobada"<br>**Mensaje**: "Tu ausencia (15 dic - 22 dic) está confirmada..." | **Título**: "Vacaciones aprobada"<br>**Mensaje**: "Tu ausencia del 15 dic - 22 dic ha sido aprobada." |
| `solicitud_creada` | **Título**: "María García solicita cambio de datos personales"<br>**Mensaje**: "Revisa los cambios propuestos..." | **Título**: "Nueva solicitud de cambio de datos personales"<br>**Mensaje**: "María García ha enviado una solicitud de cambio de datos personales." |
| `documento_solicitado` | **Título**: "Documento solicitado"<br>**Mensaje**: "Se te ha solicitado el documento: DNI..." | **Título**: "Documento requerido: DNI"<br>**Mensaje**: "Por favor, sube el documento solicitado..." |

---

### Mejora en Fichaje Modificado

**Archivo modificado**: `app/api/fichajes/[id]/route.ts:263-285`

**Antes**: Solo notificaba cuando se creaban o eliminaban eventos
**Ahora**: También notifica cuando HR/Manager **edita la hora** de un evento existente

**Implementación**:
```typescript
// Notificar al empleado del cambio
await crearNotificacionFichajeModificado(prisma, {
  fichajeId: fichaje.id,
  empresaId: session.user.empresaId,
  empleadoId: fichaje.empleadoId,
  modificadoPorNombre: session.user.nombre || 'RR.HH.',
  accion: 'editado',
  fechaFichaje: fichaje.fecha,
  detalles: validatedData.motivoEdicion ? `Motivo: ${validatedData.motivoEdicion}` : undefined,
}, { actorUsuarioId: session.user.id });
```

---

## 🎨 Iconos y Labels Actualizados

**Archivo**: `lib/notificaciones/helpers.ts`

### Nuevos Iconos Específicos
```typescript
fichaje_aprobado: CheckCircle,      // ✓
fichaje_rechazado: XCircle,         // ✗
complemento_asignado: DollarSign,   // $
documento_eliminado: FileText,      // 📄
```

### Nuevos Labels
```typescript
fichaje_modificado: 'Fichaje modificado',
fichaje_aprobado: 'Fichaje aprobado',
fichaje_rechazado: 'Fichaje rechazado',
complemento_asignado: 'Complemento asignado',
documento_eliminado: 'Documento eliminado',
```

---

## 📊 Estadísticas Actualizadas

| Métrica | Antes (v2.2.0) | Ahora (v2.3.0) | Cambio |
|---------|----------------|----------------|--------|
| **Total de tipos** | 33 | 37 | +4 |
| **Fichajes** | 3 | 6 | +3 |
| **Nóminas** | 3 | 4 | +1 |
| **Documentos** | 4 | 5 | +1 |
| **Prioridad Alta** | 4 | 6 | +2 |

---

## 🧪 Testing Realizado

### Casos de Prueba

#### 1. Fichaje Aprobado
- ✅ HR aprueba fichaje → Empleado recibe notificación
- ✅ HR NO recibe auto-notificación
- ✅ Icono CheckCircle correcto
- ✅ Fecha formateada correctamente

#### 2. Fichaje Rechazado
- ✅ HR rechaza fichaje con motivo → Empleado recibe notificación con motivo
- ✅ HR rechaza fichaje sin motivo → Empleado recibe notificación sin motivo
- ✅ Prioridad ALTA aplicada correctamente

#### 3. Complemento Asignado
- ✅ HR asigna complemento → Empleado y Manager reciben notificación
- ✅ Importe se muestra correctamente (con 2 decimales)
- ✅ Si no hay Manager, solo notifica al empleado
- ✅ HR NO recibe auto-notificación

#### 4. Documento Eliminado
- ✅ HR elimina documento de empleado → Empleado recibe notificación
- ✅ HR elimina documento sin empleadoId → NO notifica
- ✅ HR NO recibe auto-notificación

#### 5. Descripciones Mejoradas
- ✅ Solicitudes muestran apellidos completos
- ✅ Solicitudes de ausencias muestran periodo (ej: "15 dic - 22 dic")
- ✅ NO se usa término "autoaprobado"
- ✅ Títulos y mensajes no son redundantes

---

## 📁 Archivos Modificados

### Nuevas Funciones de Notificación
1. `lib/notificaciones.ts`
   - `crearNotificacionFichajeAprobado()` - líneas 738-768
   - `crearNotificacionFichajeRechazado()` - líneas 770-802
   - `crearNotificacionComplementoAsignado()` - líneas 1938-2001
   - `crearNotificacionDocumentoEliminado()` - líneas 1587-1617
   - Actualizado `TipoNotificacion` type

### APIs Modificadas
2. `app/api/fichajes/[id]/route.ts`
   - Añadida notificación al aprobar fichaje (líneas 173-187)
   - Añadida notificación al rechazar fichaje (líneas 198-213)
   - Mejorada notificación al editar fichaje (líneas 263-285)

3. `app/api/empleados/[id]/complementos/route.ts`
   - Añadida notificación al asignar complemento (líneas 202-217)
   - Añadido select de nombre y apellidos (líneas 121-126)

4. `app/api/documentos/[id]/route.ts`
   - Añadida notificación al eliminar documento (líneas 205-221)
   - Añadido select de campos necesarios (líneas 154-163)

### UI - Mejoras en Descripciones
5. `app/(dashboard)/hr/dashboard/page.tsx`
   - Añadidas fechas en descripciones de solicitudes (líneas 93-113)

6. `app/(dashboard)/manager/dashboard/page.tsx`
   - Añadidas fechas en descripciones de solicitudes (líneas 93-113)

7. `components/shared/solicitudes-widget.tsx`
   - Añadidos apellidos completos (líneas ~190)

### Helpers y Utilidades
8. `lib/notificaciones/helpers.ts`
   - Añadidos iconos para nuevos tipos
   - Añadidos labels para nuevos tipos

---

## 🚀 Impacto en Usuarios

### Para Empleados
✅ **Mayor transparencia**: Ahora saben cuando sus fichajes son aprobados/rechazados
✅ **Mejor información**: Ven complementos asignados con importes
✅ **Control de documentos**: Se les notifica cuando se eliminan documentos

### Para Managers
✅ **Visibilidad de complementos**: Se les notifica cuando se asignan complementos a su equipo
✅ **Mejor información**: Solicitudes muestran más contexto (apellidos, fechas)

### Para HR
✅ **Menos confusión**: Eliminado término "autoaprobado"
✅ **Mejor UX**: No reciben auto-notificaciones de sus propias acciones

---

## ⚠️ Consideraciones Técnicas

### Retrocompatibilidad
- ✅ Todos los cambios son **backwards compatible**
- ✅ Notificaciones antiguas siguen funcionando
- ✅ No se requieren migraciones de base de datos

### Performance
- ✅ Sin impacto en rendimiento (solo añade 4 tipos más)
- ✅ Notificaciones se crean de forma asíncrona (con try/catch)
- ✅ Filtrado de destinatarios optimizado

### Seguridad
- ✅ Validación de `empresaId` en todas las consultas
- ✅ Exclusión automática de auto-notificaciones (`actorUsuarioId`)
- ✅ Solo notifica a empleados con permisos apropiados

---

## 📖 Documentación Actualizada

- ✅ `docs/notificaciones/README.md` - Actualizado con v2.3.0
- ✅ `docs/notificaciones/CHANGELOG-2025-11-29.md` - Este documento
- ✅ Estadísticas actualizadas (37 tipos)
- ✅ Tabla completa de tipos actualizada
- ✅ Tabla "Quién Recibe Cada Tipo" actualizada

---

## 🎯 Próximos Pasos (Futuro)

### Sugerencias para Fase 3
- Notificaciones de **contratos por vencer**
- Notificaciones de **documentos por caducar**
- Recordatorios de **evaluaciones pendientes**

Ver: `docs/notificaciones/sugerencias-futuras.md`

---

**Implementado por**: Claude Code
**Revisado**: 2025-11-29
**Estado**: ✅ Producción Ready
