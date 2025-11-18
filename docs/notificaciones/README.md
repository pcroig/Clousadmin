# 🔔 Sistema de Notificaciones - Documentación

## Resumen

Sistema centralizado de notificaciones para la plataforma de gestión de recursos humanos. Proporciona notificaciones en tiempo real para eventos críticos y gestión de flujos de aprobación, organizadas en **5 categorías** con iconos y acciones específicas.

## 📦 Estructura

```
lib/
├── notificaciones.ts           # Servicio centralizado de notificaciones
└── notificaciones/
    └── helpers.ts              # Helpers para iconos y UI

components/shared/
└── notificaciones-widget.tsx   # Widget de notificaciones

docs/notificaciones/
├── README.md                   # Este archivo
└── sugerencias-futuras.md     # Fases 3 y 4 (por implementar)
```

---

## 🎯 Categorías de Notificaciones

Las notificaciones se organizan en **5 categorías principales**, cada una con su propio icono:

### 1. **Ausencias** 📅
- **Icono**: `Calendar`
- **Incluye**:
  - Solicitudes, aprobaciones, rechazos de ausencias
  - Campañas de vacaciones
  - **Especial**: Selección de días preferidos

### 2. **Fichajes** ⏰
- **Icono**: `Clock`
- **Incluye**:
  - Fichajes autocompletados
  - Fichajes que requieren revisión
  - Fichajes resueltos

### 3. **Nóminas** 💰
- **Icono**: `DollarSign`
- **Incluye**:
  - Nóminas disponibles
  - Errores en nóminas
  - **Especial**: Complementos pendientes (managers)

### 4. **Fichas** 📄
- **Icono**: `FileText`
- **Incluye**:
  - Documentos (solicitar/subir/rechazar)
  - **Especial**: Firmas digitales pendientes
  - Cambios de puesto/jornada
  - Alta de nuevos empleados

### 5. **Generales** 🔔
- **Icono**: `Bell`
- **Incluye**:
  - Cambios de manager/equipo
  - Solicitudes genéricas
  - Denuncias
  - Onboarding completado

> **Nota**: Todos los iconos usan el color terciario definido en el sistema de diseño (`text-tertiary`)

---

## 🎯 Tipos Especiales (con Acciones)

Algunos tipos requieren **acciones específicas** del usuario:

| Tipo | Acción | Flag | CTA |
|------|--------|------|-----|
| `firma_pendiente` | Firma digital | `requiresSignature: true` | "Firmar documento" |
| `campana_vacaciones_creada` | Selección de días | `requiresSelection: true` | "Seleccionar días preferidos" |
| `campana_vacaciones_cuadrada` | Revisar propuesta | `requiresModal: true` | "Revisar propuesta" |
| `complementos_pendientes` | Completar complementos | `requiresModal: true` | "Completar complementos" |
| `documento_solicitado` | Subir documento | - | "Subir documento" |

---

## ✅ Estado Actual de Implementación

### Fase 1 - Notificaciones Críticas (✅ COMPLETADO)

| Tipo | Categoría | Destinatarios | Prioridad | Ubicación |
|------|-----------|---------------|-----------|-----------|
| `ausencia_solicitada` | Ausencias | HR Admin + Manager | Alta | `/app/api/ausencias/route.ts` |
| `ausencia_aprobada` | Ausencias | Empleado | Normal | `/app/api/ausencias/[id]/route.ts` |
| `ausencia_rechazada` | Ausencias | Empleado | Normal | `/app/api/ausencias/[id]/route.ts` |
| `ausencia_cancelada` | Ausencias | HR Admin + Manager | Normal | `/app/api/ausencias/[id]/route.ts` |
| `fichaje_autocompletado` | Fichajes | Empleado | Normal | `/lib/ia/clasificador-fichajes.ts` |
| `fichaje_requiere_revision` | Fichajes | HR Admin | Alta | `/lib/ia/clasificador-fichajes.ts` |
| `fichaje_resuelto` | Fichajes | Empleado | Normal | `/app/api/fichajes/revision/route.ts` |

### Fase 2 - Alta Prioridad (✅ COMPLETADO)

| Tipo | Categoría | Destinatarios | Prioridad | Ubicación |
|------|-----------|---------------|-----------|-----------|
| `cambio_manager` | Generales | Empleado + Managers | Alta | `/app/api/empleados/[id]/route.ts` |
| `asignado_equipo` | Generales | Empleado + Manager | Normal | `/app/api/empleados/[id]/route.ts` |
| `solicitud_creada` | Generales | HR Admin | Alta | `/app/api/solicitudes/route.ts` |

### Fase 2.5 - Tipos Especiales (✅ COMPLETADO)

| Tipo | Categoría | Acción Especial | Flag |
|------|-----------|-----------------|------|
| `campana_vacaciones_creada` | Ausencias | Selección de días | `requiresSelection: true` |
| `campana_vacaciones_cuadrada` | Ausencias | Revisar propuesta | `requiresModal: true` |
| `complementos_pendientes` | Nóminas | Completar complementos | `requiresModal: true` |
| `firma_pendiente` | Fichas | Firma digital | `requiresSignature: true` |
| `firma_completada` | Fichas | - | - |
| `onboarding_completado` | Generales | - | - |

## 📊 Estadísticas

- **Total Implementado**: 15 tipos de notificaciones
- **Categorías**: 5 (Ausencias, Fichajes, Nóminas, Fichas, Generales)
- **Tipos Especiales**: 3 (con acciones requeridas)
- **Prioridades**:
  - Alta: 4 tipos
  - Normal: 11 tipos

---

## 📚 Lista Completa de Tipos

| Tipo | Categoría | Acción Especial | Icono |
|------|-----------|-----------------|-------|
| `ausencia_solicitada` | Ausencias | ❌ | `Calendar` |
| `ausencia_aprobada` | Ausencias | ❌ | `CheckCircle` |
| `ausencia_rechazada` | Ausencias | ❌ | `XCircle` |
| `ausencia_cancelada` | Ausencias | ❌ | `Calendar` |
| `campana_vacaciones_creada` | Ausencias | ✅ Selección | `Calendar` |
| `campana_vacaciones_cuadrada` | Ausencias | ✅ Modal | `Calendar` |
| `campana_vacaciones_completada` | Ausencias | ❌ | `Calendar` |
| `fichaje_autocompletado` | Fichajes | ❌ | `Clock` |
| `fichaje_requiere_revision` | Fichajes | ❌ | `Clock` |
| `fichaje_resuelto` | Fichajes | ❌ | `Clock` |
| `nomina_disponible` | Nóminas | ❌ | `DollarSign` |
| `nomina_error` | Nóminas | ❌ | `AlertCircle` |
| `complementos_pendientes` | Nóminas | ✅ Modal | `DollarSign` |
| `documento_solicitado` | Fichas | ✅ Subir | `FileText` |
| `documento_subido` | Fichas | ❌ | `FileText` |
| `documento_rechazado` | Fichas | ❌ | `FileText` |
| `firma_pendiente` | Fichas | ✅ Firma | `FileSignature` |
| `firma_completada` | Fichas | ❌ | `FileSignature` |
| `empleado_creado` | Fichas | ❌ | `FileText` |
| `cambio_puesto` | Fichas | ❌ | `FileText` |
| `jornada_asignada` | Fichas | ❌ | `FileText` |
| `cambio_manager` | Generales | ❌ | `Bell` |
| `asignado_equipo` | Generales | ❌ | `Users` |
| `nuevo_empleado_equipo` | Generales | ❌ | `Users` |
| `solicitud_creada` | Generales | ❌ | `Bell` |
| `solicitud_aprobada` | Generales | ❌ | `Bell` |
| `solicitud_rechazada` | Generales | ❌ | `Bell` |
| `denuncia_recibida` | Generales | ❌ | `AlertCircle` |
| `denuncia_actualizada` | Generales | ❌ | `AlertCircle` |
| `onboarding_completado` | Generales | ❌ | `Bell` |

---

## 🔧 Estructura de Metadata

Todas las notificaciones incluyen metadata flexible según el contexto:

```typescript
interface NotificacionMetadata {
  // Acción y prioridad
  prioridad?: 'baja' | 'normal' | 'alta' | 'critica';
  accionUrl?: string;
  accionTexto?: string;
  
  // Flags para acciones especiales
  requiresModal?: boolean;       // Abre modal al hacer clic
  requiresSignature?: boolean;   // Requiere firma digital
  requiresSelection?: boolean;   // Requiere selección
  
  // Datos específicos del contexto
  [key: string]: any; // Flexible para cada tipo
}
```

### Ejemplos de Metadata

```typescript
// Campaña de vacaciones (acción especial)
{
  campanaId: 'uuid',
  fechaInicio: '2025-07-01',
  fechaFin: '2025-08-31',
  prioridad: 'alta',
  accionUrl: '/empleado/dashboard?campana=uuid',
  accionTexto: 'Seleccionar días preferidos',
  requiresSelection: true
}

// Firma pendiente (acción especial)
{
  firmaId: 'uuid',
  documentoId: 'uuid',
  documentoNombre: 'Contrato Temporal',
  prioridad: 'alta',
  accionUrl: '/empleado/mi-espacio/documentos?tab=firmas',
  accionTexto: 'Firmar documento',
  requiresSignature: true
}

// Complementos pendientes (acción especial para managers)
{
  nominaId: 'uuid',
  mes: 5,
  año: 2025,
  empleadosCount: 3,
  prioridad: 'alta',
  accionUrl: '/manager/bandeja-entrada',
  accionTexto: 'Completar complementos',
  requiresModal: true
}
```

---

## 💻 Uso del Servicio

### 1. Crear Notificaciones (Backend)

```typescript
// Importar funciones necesarias
import { crearNotificacionAusenciaSolicitada } from '@/lib/notificaciones';
import prisma from '@/lib/prisma';

// En un API route o Server Action
await crearNotificacionAusenciaSolicitada(prisma, {
  ausenciaId: ausencia.id,
  empresaId: session.user.empresaId,
  empleadoId: session.user.empleadoId,
  empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
  tipo: 'vacaciones',
  fechaInicio: new Date('2025-07-01'),
  fechaFin: new Date('2025-07-15'),
  diasSolicitados: 10,
});
```

### 2. Mostrar Notificaciones (Frontend)

```tsx
// En un Server Component
import { NotificacionesWidget } from '@/components/shared/notificaciones-widget';
import prisma from '@/lib/prisma';

// Obtener notificaciones de la base de datos
const notificacionesRaw = await prisma.notificacion.findMany({
  where: {
    usuarioId: session.user.id,
    empresaId: session.user.empresaId,
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
});

// Mapear a formato del widget
const notificaciones = notificacionesRaw.map((n) => ({
  id: n.id,
  tipo: n.tipo as any,
  titulo: n.titulo,
  mensaje: n.mensaje,
  fecha: n.createdAt,
  leida: n.leida,
  metadata: n.metadata as any,
}));

// Renderizar widget
<NotificacionesWidget
  notificaciones={notificaciones}
  maxItems={5}
  href="/empleado/bandeja-entrada"
/>
```

### 3. Obtener Categoría e Icono

```typescript
import { obtenerCategoria } from '@/lib/notificaciones';
import { obtenerIconoPorTipo } from '@/lib/notificaciones/helpers';

const tipo = 'campana_vacaciones_creada';
const categoria = obtenerCategoria(tipo); // 'ausencias'
const IconComponent = obtenerIconoPorTipo(tipo); // Calendar

// Renderizar
<IconComponent className="w-5 h-5 text-tertiary" />
```

---

## 🎨 UI - Características Visuales

### Indicadores Visuales

- **No leídas**: Fondo azul claro + punto azul en la esquina
- **Acciones especiales**: CTA destacado con fondo azul y flecha (→)
- **Todos los iconos**: Color terciario del sistema (`text-tertiary`)

### Widget de Notificaciones

El componente `NotificacionesWidget` incluye:
- ✅ Iconos dinámicos según tipo/categoría
- ✅ Título y mensaje formateados
- ✅ Fecha en formato español
- ✅ CTA (Call-to-Action) si hay acción disponible
- ✅ Indicador visual de no leídas
- ✅ Estado vacío con mensaje amigable

---

## 🔄 Añadir Nuevo Tipo de Notificación

Para añadir un nuevo tipo:

1. **Actualizar `TipoNotificacion` en `lib/notificaciones.ts`**:
```typescript
export type TipoNotificacion =
  // ...
  | 'mi_nuevo_tipo';
```

2. **Añadir a `obtenerCategoria()` si necesita categoría especial**:
```typescript
// En lib/notificaciones.ts
export function obtenerCategoria(tipo: TipoNotificacion): CategoriaNotificacion {
  if (tipo === 'mi_nuevo_tipo') {
    return 'mi_categoria';
  }
  // ...
}
```

3. **Crear función helper**:
```typescript
export async function crearNotificacionMiNuevoTipo(
  prisma: PrismaClient,
  params: { ... }
) {
  await crearNotificaciones(prisma, {
    empresaId,
    usuarioIds,
    tipo: 'mi_nuevo_tipo',
    titulo: '...',
    mensaje: '...',
    metadata: { ... },
  });
}
```

4. **(Opcional) Icono específico en `lib/notificaciones/helpers.ts`**:
```typescript
const iconosEspecificos: Partial<Record<TipoNotificacion, LucideIcon>> = {
  mi_nuevo_tipo: MiIcono,
  // ...
};
```

---

## 🚀 Próximos Pasos

### Fase 3 - Notificaciones Proactivas (Planificado)

Ver `/docs/notificaciones/sugerencias-futuras.md` para:
- **Documentos por caducar** (7 días antes)
- **Contratos por vencer** (30 días antes)
- **Onboarding** (bienvenida y checklist)

### Fase 4 - Notificaciones de Métricas (Planificado)

- **Vacaciones**: Recordatorio de días pendientes
- **Evaluaciones**: Recordatorio de evaluaciones pendientes
- **Formación**: Recordatorio de cursos obligatorios

---

## 🔒 Seguridad y Privacidad

### Control de Acceso

- ✅ Las notificaciones solo se envían a usuarios con permisos apropiados
- ✅ Los managers solo reciben notificaciones de sus equipos
- ✅ Los empleados solo reciben notificaciones que les conciernen directamente
- ✅ Validación de `empresaId` en todas las consultas (multi-tenant)

### Quién Recibe Cada Tipo

| Tipo | Empleado | Manager | HR Admin |
|------|----------|---------|----------|
| `ausencia_solicitada` | ❌ | ✅ | ✅ |
| `ausencia_aprobada/rechazada` | ✅ | ❌ | ❌ |
| `fichaje_autocompletado` | ✅ | ❌ | ❌ |
| `fichaje_requiere_revision` | ❌ | ❌ | ✅ |
| `complementos_pendientes` | ❌ | ✅ | ❌ |
| `firma_pendiente` | ✅ | ❌ | ❌ |
| `solicitud_creada` | ❌ | ❌ | ✅ |

---

## 📚 Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `lib/notificaciones.ts` | Servicio centralizado, todas las funciones de creación |
| `lib/notificaciones/helpers.ts` | Helpers para iconos y UI |
| `components/shared/notificaciones-widget.tsx` | Widget de notificaciones |
| `prisma/schema.prisma` | Modelo `Notificacion` en DB |
| `docs/notificaciones/sugerencias-futuras.md` | Fases 3 y 4 planificadas |

---

## ✨ Características del Sistema

### Escalabilidad
- ✅ Arquitectura modular y extensible
- ✅ Metadata flexible (JSON) para cada tipo
- ✅ Categorización automática por tipo
- ✅ Iconos y estilos centralizados

### Eficiencia
- ✅ Código limpio y reutilizable
- ✅ Helpers separados para lógica de UI
- ✅ Sin duplicación de código
- ✅ Funciones especializadas por tipo

### Mantenibilidad
- ✅ Documentación completa
- ✅ TypeScript con tipos estrictos
- ✅ Comentarios descriptivos en código
- ✅ Estructura clara y organizada

---

**Versión**: 2.0.0  
**Última actualización**: 2025-01-27
