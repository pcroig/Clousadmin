# 🔔 Sistema de Notificaciones - Documentación

## Resumen

Sistema centralizado de notificaciones para la plataforma de gestión de recursos humanos. Proporciona notificaciones en tiempo real para eventos críticos y gestión de flujos de aprobación.

## 📦 Estructura

```
lib/
└── notificaciones.ts          # Servicio centralizado de notificaciones

docs/notificaciones/
├── README.md                   # Este archivo
└── sugerencias-futuras.md     # Fases 3 y 4 (por implementar)
```

## ✅ Estado Actual de Implementación

### Fase 1 - Notificaciones Críticas (✅ COMPLETADO)

#### Ausencias
- ✅ **ausencia_solicitada** - `/app/api/ausencias/route.ts:250`
  - Notifica a HR Admin y Manager cuando un empleado solicita una ausencia
  - Prioridad: Alta

- ✅ **ausencia_aprobada** - `/app/api/ausencias/[id]/route.ts:212`
  - Notifica al empleado cuando se aprueba su ausencia
  - Prioridad: Normal

- ✅ **ausencia_rechazada** - `/app/api/ausencias/[id]/route.ts:222`
  - Notifica al empleado cuando se rechaza su ausencia, incluye motivo
  - Prioridad: Normal

- ✅ **ausencia_cancelada** - `/app/api/ausencias/[id]/route.ts:477`
  - Notifica a HR Admin y Manager cuando un empleado cancela su ausencia
  - Prioridad: Normal

#### Fichajes
- ✅ **fichaje_autocompletado** - `/lib/ia/clasificador-fichajes.ts:352`
  - Notifica al empleado cuando el sistema completa automáticamente su fichaje
  - Prioridad: Normal

- ✅ **fichaje_requiere_revision** - `/lib/ia/clasificador-fichajes.ts:435`
  - Notifica a HR Admin cuando un fichaje necesita revisión manual
  - Prioridad: Alta

- ✅ **fichaje_resuelto** - `/app/api/fichajes/revision/route.ts:290`
  - Notifica al empleado cuando se resuelve su fichaje pendiente
  - Prioridad: Normal

**Total Fase 1**: 7 notificaciones implementadas

### Fase 2 - Alta Prioridad (✅ COMPLETADO)

#### Equipos y Gestión
- ✅ **cambio_manager** - `/app/api/empleados/[id]/route.ts:241`
  - Notifica al empleado, nuevo manager y anterior manager
  - Prioridad: Alta

- ✅ **asignado_equipo** - `/app/api/empleados/[id]/route.ts:266`
  - Notifica al empleado y manager cuando es asignado a un equipo
  - Prioridad: Normal

#### Solicitudes
- ✅ **solicitud_creada** - `/app/api/solicitudes/route.ts:117`
  - Notifica a HR Admin cuando se crea una solicitud de cambio
  - Soporta tipos: `cambio_datos`, `fichaje_correccion`, `ausencia_modificacion`, `documento`
  - Prioridad: Alta

**Total Fase 2**: 3 notificaciones implementadas

## 📊 Estadísticas

- **Total Implementado**: 10 tipos de notificaciones
- **Archivos Modificados**: 6 APIs
- **Prioridades**:
  - Crítica: 0
  - Alta: 4
  - Normal: 6
  - Baja: 0

## 🎯 Tipos de Notificación

### Estructura de Metadatos

Cada notificación incluye:
- `tipo`: Tipo de notificación (ej. `ausencia_solicitada`)
- `titulo`: Título breve
- `mensaje`: Descripción detallada
- `prioridad`: `baja` | `normal` | `alta` | `critica`
- `metadata`: Objeto JSON con información específica
- `leida`: Boolean, estado de lectura
- `empresaId`: ID de la empresa
- `usuarioId`: ID del destinatario

### Metadata por Tipo

```typescript
// Ejemplo: ausencia_solicitada
{
  ausenciaId: string,
  tipo: string,
  fechaInicio: Date,
  fechaFin: Date,
  diasSolicitados: number,
  empleadoId: string,
  empleadoNombre: string,
  accionUrl: '/hr/horario/ausencias'
}

// Ejemplo: fichaje_autocompletado
{
  fichajeId: string,
  fecha: Date,
  salidaSugerida: Date,
  razon: string,
  accionUrl: '/empleado/horario/fichajes'
}

// Ejemplo: cambio_manager
{
  empleadoId: string,
  empleadoNombre: string,
  nuevoManagerId: string,
  nuevoManagerNombre: string,
  anteriorManagerId?: string,
  anteriorManagerNombre?: string,
  accionUrl: '/hr/organizacion/personas/{empleadoId}'
}
```

## 🔧 Uso del Servicio

### Importar Funciones

```typescript
import {
  // Ausencias
  crearNotificacionAusenciaSolicitada,
  crearNotificacionAusenciaAprobada,
  crearNotificacionAusenciaRechazada,
  crearNotificacionAusenciaCancelada,

  // Fichajes
  crearNotificacionFichajeAutocompletado,
  crearNotificacionFichajeRequiereRevision,
  crearNotificacionFichajeResuelto,

  // Equipos
  crearNotificacionCambioManager,
  crearNotificacionAsignadoEquipo,

  // Solicitudes
  crearNotificacionSolicitudCreada,
} from '@/lib/notificaciones';
```

### Ejemplo de Uso

```typescript
// En un API route
import { prisma } from '@/lib/prisma';
import { crearNotificacionAusenciaSolicitada } from '@/lib/notificaciones';

// Después de crear una ausencia
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

## 🎨 UI - Componentes de Notificaciones

### Dónde se Muestran

Las notificaciones se muestran en:
1. **Header/Navbar**: Icono de campana con contador
2. **Panel de Notificaciones**: Dropdown con lista de notificaciones
3. **Página de Notificaciones**: Vista completa `/notificaciones`

### Acciones Disponibles

Cada notificación puede incluir:
- ✅ **Marcar como leída**
- 🔗 **Link a acción** (ej. ver ausencia, revisar fichaje)
- 🗑️ **Eliminar** (soft delete)

## 📋 Nuevos Tipos de Solicitudes

El sistema ahora soporta los siguientes tipos de solicitudes de cambio:

### 1. `cambio_datos`
Solicitud de cambio de datos personales (ya existía)

### 2. `fichaje_correccion` (NUEVO)
Solicitud de corrección de fichajes
- **Uso**: Empleado solicita corregir un error en su fichaje
- **Aprobador**: Manager o HR Admin
- **Campos**: `{ fichajeId, nuevoEntrada, nuevoSalida, motivo }`

### 3. `ausencia_modificacion` (NUEVO)
Solicitud de modificación de ausencia existente
- **Uso**: Empleado solicita modificar fechas o tipo de ausencia ya aprobada
- **Aprobador**: Manager o HR Admin
- **Campos**: `{ ausenciaId, nuevoFechaInicio, nuevoFechaFin, motivo }`

### 4. `documento` (NUEVO)
Solicitud relacionada con documentos
- **Uso**: Empleado solicita ayuda con documento pendiente o disputa sobre documento
- **Aprobador**: HR Admin
- **Campos**: `{ documentoId, tipoSolicitud, descripcion }`

## 🚀 Próximos Pasos

Ver `/docs/notificaciones/sugerencias-futuras.md` para:
- **Fase 3**: Notificaciones proactivas (documentos, contratos, onboarding)
- **Fase 4**: Notificaciones de métricas (vacaciones, evaluaciones, formación)

### Fase 3 - Prioridades Inmediatas

1. **Cron Job - Documentos por Caducar**
   - Ejecutar diariamente
   - Notificar 7 días antes de caducidad
   - Ver implementación en `sugerencias-futuras.md`

2. **Cron Job - Contratos por Vencer**
   - Ejecutar semanalmente
   - Notificar 30 días antes de fin de contrato
   - Ver implementación en `sugerencias-futuras.md`

3. **Onboarding - Bienvenida**
   - Al crear nuevo empleado
   - Incluir checklist de documentos pendientes

## 🔒 Seguridad y Permisos

### Quién Recibe Cada Notificación

| Notificación | Empleado | Manager | HR Admin |
|-------------|----------|---------|----------|
| ausencia_solicitada | ❌ | ✅ | ✅ |
| ausencia_aprobada | ✅ | ❌ | ❌ |
| ausencia_rechazada | ✅ | ❌ | ❌ |
| ausencia_cancelada | ❌ | ✅ | ✅ |
| fichaje_autocompletado | ✅ | ❌ | ❌ |
| fichaje_requiere_revision | ❌ | ❌ | ✅ |
| fichaje_resuelto | ✅ | ❌ | ❌ |
| cambio_manager | ✅ | ✅ (ambos) | ✅ |
| asignado_equipo | ✅ | ✅ | ❌ |
| solicitud_creada | ❌ | ❌ | ✅ |

### Privacidad

- Las notificaciones solo se envían a usuarios con permisos apropiados
- Los managers solo reciben notificaciones de sus equipos
- Los empleados solo reciben notificaciones que les conciernen directamente

## 🧪 Testing

### Datos de Prueba

El seed de la base de datos (`prisma/seed.ts`) incluye notificaciones de ejemplo para testing.

### Verificar Implementación

```bash
# 1. Crear una ausencia como empleado
POST /api/ausencias

# 2. Verificar notificación creada
GET /api/notificaciones
# Debe mostrar notificación tipo 'ausencia_solicitada' para HR/Manager

# 3. Aprobar ausencia como HR
PATCH /api/ausencias/{id}
{ "accion": "aprobar" }

# 4. Verificar notificación de aprobación
GET /api/notificaciones
# Debe mostrar notificación tipo 'ausencia_aprobada' para empleado
```

## 📚 Referencias

- **Servicio de Notificaciones**: `/lib/notificaciones.ts`
- **Schema Prisma**: `/prisma/schema.prisma` - Model `Notificacion`
- **API Notificaciones**: `/app/api/notificaciones/route.ts`
- **Sugerencias Futuras**: `/docs/notificaciones/sugerencias-futuras.md`

## 🤝 Contribuir

Al añadir nuevas notificaciones:
1. Añadir tipo a `TipoNotificacion` en `/lib/notificaciones.ts`
2. Crear función `crearNotificacion{Nombre}` siguiendo el patrón existente
3. Integrar en el API correspondiente
4. Actualizar esta documentación
5. Añadir datos de prueba en seed si es necesario
