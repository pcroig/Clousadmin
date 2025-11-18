# ✅ Mejora Ausencias v3.2.2 - Unificación de Motivo/Descripción

**Fecha**: 18 Noviembre 2025  
**Estado**: Completado  
**Motivación**: Reducir duplicidad de campos y simplificar flujos de validación y UI

---

## 🎯 Objetivos

1. Evitar la duplicidad entre los campos `motivo` y `descripcion` en la entidad `Ausencia`
2. Mantener un único campo semántico (`motivo`) que cubra tanto motivo como detalles adicionales
3. Garantizar que el campo único siga siendo obligatorio para el tipo `otro` y opcional para el resto
4. Actualizar todas las dependencias (API, UI, integraciones, documentación) y migrar datos existentes

---

## 🔧 Cambios Técnicos

### Prisma / Base de Datos
- `model Ausencia`: se elimina la columna `descripcion`
- Nuevo comentario en `motivo`: `// Motivo o descripción (obligatorio para tipo 'otro')`
- Migración `20251118140000_remove_ausencia_descripcion`
  - Copia `descripcion` → `motivo` cuando este último está vacío
  - Elimina definitivamente la columna `descripcion`

### API & Validaciones
- `lib/validaciones/schemas.ts`: solo existe el campo `motivo` (opcional salvo tipo `otro`)
- `app/api/ausencias/route.ts`: payloads y persistencia usan únicamente `motivo`
- `app/api/ausencias/[id]/route.ts`: edición y validaciones centralizadas en el mismo campo

### UI
- `components/empleado/solicitar-ausencia-modal.tsx`: campo único “Motivo o detalles”
- `app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx`: formulario de edición HR con textarea única
- Etiquetas condicionadas para indicar obligatoriedad cuando `tipo === 'otro'`

### Integraciones
- `lib/integrations/types.ts`: eventos de calendario muestran `Motivo/Detalles` si existen

### Documentación
- `docs/funcionalidades/ausencias.md`: Versión `3.2.2`, se documenta la unificación del campo
- Ejemplos de payload actualizados
- `docs/historial/MEJORAS_CALENDARIO_2025-11-12.md`: referencia al campo único

---

## 🧪 Consideraciones de Testing
- Crear/editar ausencias de tipo `otro` debe requerir el campo
- Resto de tipos: campo opcional
- Migración: registros antiguos con `descripcion` deben aparecer ahora en `motivo`
- UI: tanto empleado como HR muestran un único campo consistente
- Calendar sync: descripción del evento debe reflejar `motivo`

---

## ✅ Resultados Esperados
- Menor complejidad en formularios y validaciones
- Evitar campos redundantes en la capa de datos
- Experiencia uniforme para usuarios y HR
- Preparado para futuras mejoras (p. ej., plantillas IA sobre un único texto)

---

**Autor**: AI Assistant  
**Aprobación**: Pendiente  
**Notas**: Ejecutar la migración contra todos los entornos antes de desplegar.

