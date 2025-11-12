## 2025-11-11 · Refactor gestión de nóminas

### Contexto
- Auditoría completa del módulo de nóminas tras cambios recientes.
- Objetivo: asegurar sincronización de estados, exponer alertas y ampliar analytics.

### Cambios principales
- ✅ Añadido utilitario `lib/calculos/sync-estados-nominas.ts` para centralizar transiciones de estado entre `EventoNomina` y `Nomina`.
- ✅ Refactor de endpoints críticos:
  - `POST /api/nominas/eventos/[id]/publicar`
  - `POST /api/nominas/eventos/[id]/importar`
  - `GET /api/nominas/eventos/[id]/exportar`
  - `GET /api/nominas/eventos`
- ✅ UI `/hr/payroll`:
  - Badges de alertas (críticas, advertencias, info).
  - Barra de progreso por estado + tooltips explicativos.
  - Tooltips en acciones (exportar, importar, publicar).
- ✅ Detalle de nómina `/hr/payroll/nominas/[id]`: sección de alertas con CTA de resolución.
- ✅ Analytics `/api/nominas/analytics`: nuevos reportes (percentiles salariales, rango 10k, análisis por puesto, top complementos).
- ✅ Nuevo endpoint `POST /api/nominas/eventos/[id]/generar-prenominas` + UI para generar/recalcular pre-nóminas desde la tarjeta del evento.
- ✅ Botonera contextual siempre visible (generar pre, marcar complementos listos, exportar, importar, publicar) con tooltips y estados habilitados.

### Documentación
- Actualizado `docs/funcionalidades/gestion-nominas.md` con:
  - Sincronización automática.
  - Alertas en eventos y nóminas.
  - Nuevos reportes analíticos.

### Notas
- Revisadas transiciones válidas (`pre_nomina → … → publicada`).
- Empty state mantiene CTA doble (Generar evento / Subir nóminas).
- Analytics optimizado para evitar N+1 (uso de `include` selectivo).

---

## 2025-11-27 · Completar funcionalidad de gestión de nóminas

### Cambios principales

#### UI Simplificada
- ✅ Eliminado botón "Marcar complementos listos" (no necesario)
- ✅ Añadido indicador visual de estado de complementos:
  - Verde: "Complementos revisados" cuando todos están asignados
  - Naranja: "X empleado(s) sin complementos asignados"
- ✅ Alertas clickeables que navegan a página de detalles con filtro activo
- ✅ Botón "Ver detalles" en cada evento para acceso rápido

#### Nueva Página de Detalles `/hr/payroll/eventos/[id]` ⭐
- ✅ Header completo con breadcrumb, estado y barra de progreso
- ✅ 6 cards de métricas agregadas (Total Nóminas, Empleados, Alertas, Complementos, Pendientes, Críticas)
- ✅ Botonera de acciones contextuales
- ✅ Sistema de tabs (Nóminas | Alertas)
- ✅ **Tab Nóminas:**
  - Filtros avanzados (búsqueda, estado, alertas, complementos)
  - Lista de nóminas con avatar, métricas e indicadores visuales
  - Drawer lateral con detalles completos de nómina individual
- ✅ **Tab Alertas:**
  - Agrupadas por tipo (Críticas, Advertencias, Informativas)
  - Acciones: Ver empleado, Resolver alerta
  - Contadores por tipo

#### Componentes Reutilizables
- ✅ `components/payroll/alerta-badge.tsx` - Badge visual de alertas
- ✅ `components/payroll/alerta-list.tsx` - Lista de alertas con acciones
- ✅ `components/payroll/upload-nominas-modal.tsx` - Modal completo de upload

#### Subida Directa de PDFs ⭐
- ✅ Modal completo con 3 estados (Upload → Review → Success)
- ✅ Drag & drop y selector de archivos
- ✅ Procesamiento con IA para matching automático
- ✅ Revisión de asignaciones antes de confirmar
- ✅ Integración con endpoints `/api/nominas/upload` y `/api/nominas/confirmar-upload`
- ✅ Flujo alternativo sin necesidad de generar evento previo

#### API Mejorada
- ✅ `GET /api/nominas/eventos/[id]` ahora incluye:
  - Foto del empleado (`fotoUrl`)
  - Alertas no resueltas de cada nómina
  - Estadísticas agregadas (totalNominas, nominasConAlertas, etc.)
  - Ordenamiento alfabético en DB

#### Performance
- ✅ Queries optimizadas (una sola query trae todo, evita N+1)
- ✅ Filtrado en DB (alertas por `resuelta: false`)
- ✅ Memoización de filtros y cálculos de alertas en client components
- ✅ Select selectivo en Prisma includes

### Archivos creados
- `app/(dashboard)/hr/payroll/eventos/[id]/page.tsx`
- `app/(dashboard)/hr/payroll/eventos/[id]/evento-details-client.tsx`
- `components/payroll/alerta-badge.tsx`
- `components/payroll/alerta-list.tsx`
- `components/payroll/upload-nominas-modal.tsx`

### Archivos modificados
- `app/(dashboard)/hr/payroll/payroll-client.tsx` - Simplificación UI e integración modal
- `app/api/nominas/eventos/[id]/route.ts` - API mejorada con más datos

### Documentación
- ✅ Actualizado `docs/funcionalidades/gestion-nominas.md` con:
  - Nueva página de detalles de evento
  - Sistema de alertas mejorado
  - Subida directa de PDFs
  - Componentes UI y arquitectura de archivos
  - Optimizaciones de performance

### Notas técnicas
- ✅ Uso consistente de `DetailsPanel` (patrón existente del proyecto)
- ✅ Sistema de tabs siguiendo patrón de `empleado-detail-client.tsx`
- ✅ Type-safe completo sin `any`
- ✅ Código limpio, eficiente y escalable
- ✅ Preparado para empresas hasta 300 empleados (paginación opcional para más)

