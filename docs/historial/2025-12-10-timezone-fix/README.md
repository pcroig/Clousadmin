# Documentación Deprecada - Fix de Timezones

**Fecha de deprecación**: 10 de diciembre de 2025
**Razón**: Contenido consolidado en documentación existente

---

## Archivos en esta carpeta

- `TIMEZONE_FIX.md` - Guía técnica detallada del fix (deprecado)
- `RESUMEN_FIX_TIMEZONE.md` - Resumen ejecutivo del fix (deprecado)

## Documentación actualizada

El contenido de estos archivos ha sido consolidado en:

- **[docs/funcionalidades/ausencias.md](../../funcionalidades/ausencias.md)** - Sección v3.6.0 con detalles del fix
- **[docs/DESIGN_PATTERNS.md](../../DESIGN_PATTERNS.md)** - Patrones de manejo de fechas

## Ubicación del código

- **Helper centralizado**: `lib/utils/dates.ts`
- **Tests unitarios**: `tests/unit/utils/dates.test.ts`
- **Tests integración**: `tests/integration/ausencias-timezone.test.ts`

---

**Nota**: Estos archivos se mantienen con fines históricos pero NO deben ser referenciados en nueva documentación. Consultar siempre la documentación oficial actualizada.
