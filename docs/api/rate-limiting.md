# Rate Limiting en Clousadmin API

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen. Ver documento completo: [`docs/RATE_LIMITING.md`](../RATE_LIMITING.md).

---

## Límites por Defecto

| Tipo de petición | Límite | Ventana |
|------------------|--------|---------|
| Login (`POST /api/auth/login`) | 5 intentos | 10 segundos |
| Login (ventana larga) | 20 intentos | 1 hora |
| Endpoints de lectura (`GET`) | 100 req | 1 minuto |
| Endpoints de escritura (`POST/PATCH/DELETE`) | 50 req | 1 minuto |

---

## Headers Incluidos

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Implementación

- Helper centralizado: `lib/rate-limit.ts`
- Integrado en `lib/api-handler.ts`
- Configurable por endpoint

---

## Recursos Relacionados

- [`RATE_LIMITING.md`](../RATE_LIMITING.md) – Documento completo.
- [`API_REFACTORING.md`](../API_REFACTORING.md) – Patrones y helpers reutilizables.




