# Referencia API - Autenticación

**Última actualización:** 27 de enero de 2025  
**Estado:** Documentación resumida. Para detalles funcionales, revisar [`docs/funcionalidades/autenticacion.md`](../../funcionalidades/autenticacion.md).

---

## Endpoints Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login con email y contraseña |
| `/api/auth/google` | POST | Login con token de Google OAuth |
| `/api/auth/recovery/request` | POST | Solicitar recuperación de contraseña |
| `/api/auth/recovery/reset` | POST | Resetear contraseña con token |

---

## Recursos Relacionados

- [`docs/api/authentication.md`](../authentication.md) – Guía completa de flujo.
- `lib/auth.ts` – Helpers de JWT y sesión.

