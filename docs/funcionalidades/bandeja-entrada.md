# Bandeja de Entrada

**Fecha de creación:** 01/11/2025
**Última actualización:** 27/01/2025
**Estado:** ✅ Completado y Reforzado

> 🔐 **SEGURIDAD:** Se han resuelto 2 problemas críticos de seguridad y consistencia de datos. Ver sección "Correcciones Críticas" abajo.

## Descripción General

Sistema de bandeja de entrada multi-rol que permite gestionar solicitudes, visualizar elementos auto-completados y recibir notificaciones. Incluye funcionalidad de marcar notificaciones como leídas.

---

## Casos de Uso

### HR Admin
- Ver y gestionar solicitudes pendientes de empleados (ausencias y cambios de datos)
- Alternar entre solicitudes pendientes y resueltas (aprobadas/rechazadas)
- Visualizar elementos auto-completados con estadísticas
- Recibir y gestionar notificaciones
- Marcar notificaciones como leídas individualmente o todas a la vez

### Empleado
- Ver notificaciones sobre el estado de sus solicitudes
- Distinguir notificaciones nuevas (no leídas) con badge "new"
- Marcar notificaciones como leídas al hacer click
- Marcar todas las notificaciones como leídas con un botón

---

## Implementación Técnica

### Modelo de Datos

#### Notificación (Prisma)
```prisma
model Notificacion {
  id        String   @id @default(uuid())
  empresaId String
  usuarioId String

  tipo    String @db.VarChar(50) // 'info', 'success', 'warning', 'error', etc.
  titulo  String @db.VarChar(255)
  mensaje String @db.Text
  metadata Json? // Datos adicionales (ausenciaId, fichajeId, etc.)

  leida Boolean @default(false) // ✨ Campo para tracking de lectura

  createdAt DateTime @default(now())

  empresa Empresa @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  usuario Usuario @relation(fields: [usuarioId], references: [id], onDelete: Cascade)

  @@index([usuarioId, leida]) // Optimizado para queries de no leídas
  @@index([empresaId])
  @@index([createdAt])
  @@map("notificaciones")
}
```

**Migración:** `20251101113217_add_notificaciones`

## 📡 API ENDPOINTS

### Notificaciones

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/notificaciones` | GET | Lista todas las notificaciones del usuario autenticado. Soporta filtros: `leida`, `tipo` | ✅ |
| `/api/notificaciones/[id]/marcar-leida` | PATCH | Marca una notificación específica como leída | ✅ |
| `/api/notificaciones/marcar-todas-leidas` | POST | Marca todas las notificaciones no leídas del usuario como leídas. Retorna count actualizado | ✅ |

**Parámetros GET `/api/notificaciones`:**
- `leida`: `true` | `false` | `all` (default: `all`)
- `tipo`: Filtro por tipo de notificación (opcional)
- `limit`: Número máximo de resultados (opcional)

**Respuesta GET:**
```json
{
  "notificaciones": [
    {
      "id": "uuid",
      "tipo": "ausencia_aprobada",
      "titulo": "Ausencia aprobada",
      "mensaje": "Tu solicitud de ausencia ha sido aprobada",
      "leida": false,
      "metadata": { "ausenciaId": "uuid" },
      "createdAt": "2025-11-01T10:00:00Z"
    }
  ],
  "total": 10,
  "noLeidas": 3
}
```

**Ubicaciones:**
- `app/api/notificaciones/[id]/marcar-leida/route.ts`
- `app/api/notificaciones/marcar-todas-leidas/route.ts`
- `app/api/notificaciones/route.ts` (GET - debe existir para listar)

### Componentes

#### HR Bandeja de Entrada

**Ruta:** `/hr/bandeja-entrada`
**Archivo:** `/app/(dashboard)/hr/bandeja-entrada/page.tsx`

**Funcionalidad:**
- Fetches solicitudes pendientes y resueltas (ausencias + solicitudesCambio)
- Fetches elementos auto-completados con estadísticas
- Renderiza el componente `BandejaEntradaTabs`

##### BandejaEntradaTabs
**Archivo:** `/components/hr/bandeja-entrada-tabs.tsx`

**Tabs:**
1. **Solicitudes**
   - Toggle para alternar entre "Pendientes" y "Resueltas"
   - Botón "Autoaprobar" (solo visible con solicitudes pendientes)
   - Componente: `BandejaEntradaSolicitudes`

2. **Auto-completed** (antes "Solved")
   - Cards de estadísticas en la parte superior:
     - Fichajes actualizados
     - Ausencias revisadas
     - Nóminas revisadas
   - Tabla de elementos auto-completados en la parte inferior
   - Componente: `BandejaEntradaSolved`

3. **Notificaciones**
   - Lista de notificaciones con indicador de leída/no leída
   - Botón "Leer todas" (muestra count de no leídas)
   - Click en notificación la marca como leída
   - Componente: `BandejaEntradaNotificaciones`

##### BandejaEntradaSolicitudes
**Archivo:** `/components/hr/bandeja-entrada-solicitudes.tsx`

**Features:**
- Toggle buttons: "Pendientes" / "Resueltas"
- Cards con datos de solicitud y empleado
- Botones "Aprobar" / "Rechazar" (solo en pendientes)
- Badge de estado en solicitudes resueltas (Aprobada/Rechazada)
- Fecha límite para pendientes, fecha de resolución para resueltas

**Props:**
```typescript
interface BandejaEntradaSolicitudesProps {
  solicitudesPendientes: SolicitudItem[];
  solicitudesResueltas: SolicitudItem[];
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
}
```

##### BandejaEntradaSolved (Auto-completed)
**Archivo:** `/components/hr/bandeja-entrada-solved.tsx`

**Layout:**
1. Grid 3 columnas con cards de estadísticas
2. Tabla con columnas:
   - Tipo (con icono)
   - Descripción
   - Empleado
   - Acción (badge)
   - Fecha

**Props:**
```typescript
interface BandejaEntradaSolvedProps {
  stats: {
    fichajesActualizados: number;
    ausenciasRevisadas: number;
    nominasRevisadas: number;
  };
  items: SolvedItem[];
}
```

##### BandejaEntradaNotificaciones
**Archivo:** `/components/hr/bandeja-entrada-notificaciones.tsx`

**Features:**
- Notificaciones embebidas en el fondo con separadores (sin cards)
- Iconos sin fondo, tamaño `h-4 w-4`, color gris
- Fecha en formato corto relativo ("5min", "3h", "1d") alineada a la derecha
- Punto azul de no leída alineado junto a la fecha
- Click en la fila marca como leída y navega a `accionUrl` si existe
- Botón CTA solo para notificaciones especiales (pequeño, variante `default`)
- Integración con `openPreferenciasModalFromUrl` para campañas de vacaciones
- Botón "Leer todas" en header
- Integración con API endpoints

#### Empleado Bandeja de Entrada

**Ruta:** `/empleado/bandeja-entrada`
**Archivo:** `/app/(dashboard)/empleado/bandeja-entrada/bandeja-entrada-client.tsx`

**Features:**
- Solo muestra notificaciones (sin tabs)
- Filtros: Todas / Aprobadas / Pendientes / Rechazadas
- Badge "new" en notificaciones no leídas
- Botón "Leer todas" en header
- Cards clickeables que marcan como leídas
- Integración con API endpoints

**Estructura visual:**
```
Header: "Notificaciones"
[Filtros] --------------------------------- [Leer todas (X)]
[Lista de notificaciones embebidas con separadores]
  - Icono (sin fondo) | Título | Mensaje | [Fecha] [Punto no leída]
  - Botón CTA (solo si es notificación especial)
```

---

## Flujo de Datos

### Marcar Notificación como Leída

```
1. Usuario hace click en notificación
   ↓
2. handleMarcarLeida(id) se ejecuta
   ↓
3. PATCH /api/notificaciones/[id]/marcar-leida
   ↓
4. Backend verifica que notificación pertenezca al usuario
   ↓
5. Actualiza campo `leida` a true
   ↓
6. window.location.reload() para refrescar datos
```

### Marcar Todas como Leídas

```
1. Usuario hace click en "Leer todas"
   ↓
2. handleMarcarTodasLeidas() se ejecuta
   ↓
3. POST /api/notificaciones/marcar-todas-leidas
   ↓
4. Backend actualiza todas las notificaciones no leídas del usuario
   ↓
5. Retorna count de notificaciones actualizadas
   ↓
6. window.location.reload() para refrescar datos
```

### Toggle Solicitudes (HR)

```
1. Estado local `vista` controla vista actual ('pendientes' | 'resueltas')
   ↓
2. Click en toggle actualiza estado
   ↓
3. Renderiza solicitudesPendientes o solicitudesResueltas según estado
```

---

## Estilos y Diseño

### Principios de Diseño
- **Paleta:** Principalmente gris/negro (excepción: botones Aprobar/Rechazar)
- **Iconos:** Lucide icons para consistencia, sin fondo, tamaño `h-4 w-4`
- **Spacing:** Tailwind spacing scale
- **Hover states:** Transiciones suaves (transition-colors, transition-shadow)
- **Layout:** Notificaciones embebidas en el fondo con separadores, sin cards

### Estados Visuales

#### Notificaciones No Leídas
- Punto azul (`bg-blue-500`) alineado a la derecha junto a la fecha
- Click en la fila marca como leída automáticamente

#### Notificaciones con Acción Especial
- Botón CTA pequeño (`size="sm"`) con variante `default`
- Solo visible si tiene `requiresModal`, `requiresSignature` o `requiresSelection`
- Texto de acción personalizado (ej: "Ver campaña", "Firmar documento")

#### Formato de Fecha
- Formato corto relativo: "5min", "3h", "1d", "2sem", "4mes", "1a"
- Alineado a la derecha, misma altura que el título
- Utiliza `formatRelativeTimeShort` de `lib/utils/formatRelativeTime.ts`

#### Campañas de Vacaciones
- Integración con `openPreferenciasModalFromUrl` para abrir modal automáticamente
- Detecta URLs de campañas y emite evento `vacaciones:preferencias:open`
- No navega a la URL si el modal se abre correctamente

#### Solicitudes Resueltas
- Badge de estado (Aprobada: green, Rechazada: red)
- Sin botones de acción

#### Toggle Active State
- Background gris oscuro (bg-gray-900)
- Texto blanco

---

## Mejoras Futuras

### Fase 2
- [ ] Actualización en tiempo real con WebSockets
- [ ] Filtros avanzados de notificaciones
- [ ] Búsqueda en solicitudes
- [ ] Exportar datos de auto-completados

### Fase 3
- [ ] Notificaciones push
- [ ] Configuración de preferencias de notificaciones
- [ ] Agrupación de notificaciones similares
- [ ] Historial completo de acciones

---

## Testing

### Casos a Probar

#### HR Bandeja de Entrada
1. ✅ Ver solicitudes pendientes
2. ✅ Alternar a solicitudes resueltas
3. ✅ Ver botón Autoaprobar solo con pendientes
4. ✅ Ver estadísticas de auto-completados
5. ✅ Ver tabla de elementos auto-completados
6. ✅ Ver notificaciones
7. ✅ Marcar notificación como leída (click)
8. ✅ Marcar todas las notificaciones como leídas

#### Empleado Bandeja de Entrada
1. ✅ Ver notificaciones con badge "new"
2. ✅ Filtrar por tipo de notificación
3. ✅ Marcar notificación como leída (click)
4. ✅ Marcar todas como leídas
5. ✅ Contar notificaciones no leídas correctamente

---

## 🔐 Correcciones Críticas Aplicadas

### Transacciones en Operaciones Multi-paso

**Problema resuelto:** Operaciones atómicas para evitar inconsistencias de datos.

**Archivos modificados:**
- `app/api/ausencias/[id]/route.ts` - Envuelto en `prisma.$transaction()`
- `app/api/solicitudes/[id]/route.ts` - Envuelto en `prisma.$transaction()`
- `app/api/solicitudes/autoaprobar/route.ts` - Transacciones por elemento

**Impacto:** Garantía de atomicidad en todas las operaciones de aprobación/rechazo.

### Validación de Campos Modificables

**Problema resuelto:** Whitelist estricta de campos permitidos para solicitudes de cambio.

**Campos permitidos:**
```typescript
const ALLOWED_EMPLOYEE_FIELDS = [
  'nombre', 'apellidos', 'telefono', 'direccion',
  'email', 'fechaNacimiento', 'numeroSeguridadSocial', 'cuentaBancaria'
];
```

**Impacto:** Prevención de modificaciones no autorizadas a campos sensibles (rol, salario, etc.).

### Logging de Operaciones

**Mejoras:**
- Logging explícito cuando no se puede crear notificación
- Registro de campos rechazados por seguridad
- Formato consistente con prefijos `[AUSENCIAS]`, `[SOLICITUDES]`

---

## Referencias

- **Prisma Schema:** `/prisma/schema.prisma`
- **Migration:** `/prisma/migrations/20251101113217_add_notificaciones/`
- **API Routes:** `/app/api/notificaciones/`
- **Components:** `/components/hr/bandeja-entrada-*.tsx`
- **Employee Component:** `/app/(dashboard)/empleado/bandeja-entrada/bandeja-entrada-client.tsx`

**Documentación técnica adicional:**
- Análisis de dependencias y arquitectura: Los detalles técnicos de dependencias están integrados en el código actual.
