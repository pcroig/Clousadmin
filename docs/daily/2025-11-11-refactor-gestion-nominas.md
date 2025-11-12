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

