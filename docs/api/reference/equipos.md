# Referencia API - Equipos

**Última actualización:** 10 de diciembre de 2025
**Estado:** Referencia de endpoints. Ver funcionalidad detallada en [`docs/funcionalidades/equipos.md`](../../funcionalidades/equipos.md).

---

## Endpoints

| Endpoint | Método | Descripción | Permisos |
|----------|--------|-------------|----------|
| `/api/equipos` | GET | Listar equipos con paginación | HR Admin |
| `/api/equipos` | POST | Crear nuevo equipo | HR Admin |
| `/api/equipos/[id]` | GET | Obtener equipo por ID | HR Admin |
| `/api/equipos/[id]` | PATCH | Actualizar equipo | HR Admin |
| `/api/equipos/[id]` | DELETE | Eliminar equipo | HR Admin |
| `/api/equipos/[id]/members` | POST | Añadir miembro al equipo | HR Admin |
| `/api/equipos/[id]/members` | DELETE | Eliminar miembro del equipo | HR Admin |
| `/api/equipos/[id]/manager` | PATCH | Cambiar responsable del equipo | HR Admin |
| `/api/equipos/[id]/available-members` | GET | Listar empleados disponibles | HR Admin |
| `/api/organizacion/equipos/[id]/politica` | GET | Obtener política de ausencias | HR Admin |
| `/api/organizacion/equipos/[id]/politica` | PUT | Actualizar política de ausencias | HR Admin |

---

## Query Parameters (GET /api/equipos)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | integer | Número de página (default: 1) |
| `limit` | integer | Items por página (default: 20) |

---

## Estructura de Respuesta

### GET /api/equipos

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Equipo de Desarrollo",
      "descripcion": "Equipo encargado del desarrollo",
      "activo": true,
      "tipo": "proyecto",
      "manager": {
        "id": "uuid",
        "nombre": "Juan",
        "apellidos": "Pérez",
        "nombreCompleto": "Juan Pérez"
      },
      "managerId": "uuid",
      "miembros": [
        {
          "id": "uuid",
          "nombre": "María",
          "apellidos": "García",
          "nombreCompleto": "María García",
          "fotoUrl": "https://...",
          "fechaIncorporacion": "2025-01-01T00:00:00.000Z"
        }
      ],
      "sede": {
        "id": "uuid",
        "nombre": "Oficina Central",
        "ciudad": "Madrid"
      },
      "numeroMiembros": 5,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-06-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

## POST /api/equipos

**Body:**
```json
{
  "nombre": "Equipo de Desarrollo",
  "descripcion": "Equipo de desarrollo de software",
  "tipo": "proyecto",
  "sedeId": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "nombre": "Equipo de Desarrollo",
  "descripcion": "Equipo de desarrollo de software",
  "activo": true,
  "tipo": "proyecto",
  "managerId": null,
  "sedeId": "uuid",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

---

## POST /api/equipos/[id]/members

**Body:**
```json
{
  "empleadoId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Miembro añadido correctamente"
}
```

---

## PATCH /api/equipos/[id]/manager

**Body:**
```json
{
  "managerId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "manager": {
    "id": "uuid",
    "nombre": "Juan",
    "apellidos": "Pérez"
  }
}
```

---

## Sistema de Permisos

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Ver equipos | ❌ | ✅ (su equipo) | ✅ (todos) |
| Crear equipos | ❌ | ❌ | ✅ |
| Editar equipos | ❌ | ❌ | ✅ |
| Eliminar equipos | ❌ | ❌ | ✅ |
| Gestionar miembros | ❌ | ❌ | ✅ |
| Asignar manager | ❌ | ❌ | ✅ |
| Configurar política ausencias | ❌ | ❌ | ✅ |

---

## Recursos Relacionados

**Backend:**
- `app/api/equipos/route.ts` - Lista y creación
- `app/api/equipos/[id]/route.ts` - CRUD individual
- `app/api/equipos/[id]/members/route.ts` - Gestión de miembros
- `app/api/equipos/[id]/manager/route.ts` - Gestión de manager
- `lib/equipos/` - Lógica de negocio

**Frontend:**
- `app/(dashboard)/hr/organizacion/equipos/` - Vista HR
- `components/organizacion/equipos/` - Componentes de equipos

**Documentación:**
- [Funcionalidad Equipos](../../funcionalidades/equipos.md) - Workflows y lógica de negocio
- [Política de Ausencias](../../funcionalidades/ausencias.md#política-por-equipo) - Configuración por equipo
