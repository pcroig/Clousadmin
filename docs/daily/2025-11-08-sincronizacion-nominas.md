# 8 Noviembre 2025 · Sincronización Nóminas y Alertas

## Resumen
- Implementada librería `lib/calculos/sync-estados-nominas.ts` para sincronizar estados entre `EventoNomina` y `Nomina`.
- Refactorizadas las rutas de exportación, importación y publicación para delegar la lógica estado/estadísticas en las nuevas funciones.
- Expuestas alertas activas en la API de eventos y visualizadas con badges por severidad en `/hr/payroll`.
- Potenciado el detalle de nóminas individuales con un bloque de alertas priorizadas y CTA opcional.
- Ampliada `/api/nominas/analytics` con percentiles salariales, distribución por rangos dinámicos, desglose por puesto y top complementos.
- Mejorada la UX de la página de eventos: tooltips informativos, barra de progreso y explicaciones por acción.

## Impacto
- Evita desincronizaciones históricas entre `EventoNomina.estado` y estados individuales.
- HR obtiene visibilidad inmediata de incidencias en cada evento y nómina.
- Analytics de compensación más ricos para reporting (percentiles, rangos, puestos, complementos).
- Documentación actualizada en `docs/funcionalidades/gestion-nominas.md` y `docs/funcionalidades/analytics.md`.

## Pendiente / Seguimiento
- Monitorizar en QA la creación de eventos para verificar que la sincronización automática se comporta como esperado con datos reales.
- Valorar pruebas unitarias específicas para `sync-estados-nominas` (no incluidas en esta iteración).

