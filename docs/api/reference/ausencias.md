# Referencia API - Ausencias

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen de endpoints clave. Ver funcionalidad completa en [`docs/funcionalidades/ausencias.md`](../../funcionalidades/ausencias.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ausencias` | GET | Listado con filtros y paginación |
| `/api/ausencias` | POST | Solicitar una ausencia (empleado) o crear directamente (HR Admin) |
| `/api/ausencias/{id}` | PATCH | Aprobar, rechazar o actualizar |
| `/api/ausencias/saldo` | GET | Consultar saldo disponible (considera carry-over) |
| `/api/ausencias/saldo` | POST | Asignar saldo anual (empresa o equipos) |
| `/api/empresa/politica-ausencias` | PATCH | Configurar política de carry-over (limpiar vs extender) |

---

## Características

- Validación de solapamientos
- Control de saldo por tipo
- Sincronización con Google Calendar
- ~~Campañas de vacaciones~~ ⏸️ **DEPRECADA TEMPORALMENTE** (ver nota abajo)

## Respuesta GET /api/ausencias

La respuesta incluye información del empleado necesaria para hover cards:

```typescript
{
  data: [
    {
      id: string;
      empleadoId: string;
      tipo: string;
      estado: string;
      fechaInicio: string;
      fechaFin: string;
      empleado: {
        nombre: string;
        apellidos: string;
        puesto: string;
        email: string | null;
        fotoUrl: string | null;
        equipoNombre: string | null;  // Nombre del primer equipo
        equipo: { id: string; nombre: string } | null;  // Objeto completo del equipo
      };
      // ... otros campos
    }
  ],
  pagination: { /* ... */ }
}
```

**Nota**: `equipoNombre` se proporciona directamente como string para facilitar el uso en hover cards. El objeto `equipo` completo también está disponible si se necesita el ID.

---

## ⚠️ Nota sobre Campañas de Vacaciones

La funcionalidad de **Campañas de Vacaciones** está temporalmente deshabilitada para el primer lanzamiento (Diciembre 2025). Todos los endpoints bajo `/api/campanas-vacaciones/**` retornan `503 Service Unavailable` cuando la feature está deshabilitada.

Para reactivar, establecer `NEXT_PUBLIC_CAMPANAS_VACACIONES_ENABLED=true` en variables de entorno.

## Recursos Relacionados

- `app/api/ausencias/route.ts`
- `app/api/ausencias/[id]/route.ts`
- `lib/calculos/ausencias.ts`

