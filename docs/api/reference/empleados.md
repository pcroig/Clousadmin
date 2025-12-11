# Referencia API - Empleados

**Última actualización:** 10 de diciembre de 2025
**Estado:** Referencia de endpoints. Ver funcionalidad detallada en [`docs/funcionalidades/empleados.md`](../../funcionalidades/empleados.md).

---

## Endpoints

| Endpoint | Método | Descripción | Permisos |
|----------|--------|-------------|----------|
| `/api/empleados` | GET | Listar empleados con filtros y paginación | Manager, HR Admin |
| `/api/empleados` | POST | Crear nuevo empleado | HR Admin |
| `/api/empleados/[id]` | GET | Obtener empleado por ID | Manager (su equipo), HR Admin |
| `/api/empleados/[id]` | PATCH | Actualizar datos de empleado | HR Admin |
| `/api/empleados/[id]` | DELETE | Dar de baja empleado | HR Admin |
| `/api/empleados/me` | GET | Obtener perfil propio | Todos |
| `/api/empleados/me` | PATCH | Actualizar perfil propio | Todos |
| `/api/empleados/[id]/avatar` | POST | Subir avatar | HR Admin, Empleado (propio) |
| `/api/empleados/[id]/avatar` | DELETE | Eliminar avatar | HR Admin, Empleado (propio) |
| `/api/empleados/[id]/renovar-saldo` | POST | Renovar saldo de horas | HR Admin |
| `/api/empleados/[id]/renovar-saldo` | GET | Obtener fecha última renovación | HR Admin |
| `/api/empleados/export` | GET | Exportar lista a Excel | HR Admin |
| `/api/empleados/me/fichajes/export` | GET | Exportar fichajes propios a Excel | Empleado |

---

## Query Parameters (GET /api/empleados)

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | integer | Número de página (default: 1) |
| `limit` | integer | Items por página (default: 10, max: 100) |
| `search` | string | Buscar por nombre, apellidos o email |
| `equipoId` | uuid | Filtrar por equipo |
| `puestoId` | uuid | Filtrar por puesto |
| `sedeId` | uuid | Filtrar por sede |
| `activo` | boolean | Filtrar por estado (true=activos, false=bajas) |

---

## Estructura de Respuesta

### GET /api/empleados

```json
{
  "empleados": [
    {
      "id": "uuid",
      "nombre": "María",
      "apellidos": "García López",
      "email": "maria.garcia@empresa.com",
      "telefono": "+34612345678",
      "dni": "12345678A",
      "fechaNacimiento": "1990-05-15",
      "fechaIngreso": "2023-01-01",
      "fechaBaja": null,
      "activo": true,
      "puestoId": "uuid",
      "equipos": [
        {
          "id": "uuid",
          "nombre": "Desarrollo"
        }
      ],
      "sedeId": "uuid",
      "empresaId": "uuid",
      "fotoUrl": "https://...",
      "createdAt": "2023-01-01T09:00:00.000Z",
      "updatedAt": "2025-06-01T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

## POST /api/empleados

**Body:**
```json
{
  "nombre": "Juan",
  "apellidos": "Pérez Martínez",
  "email": "juan.perez@empresa.com",
  "dni": "12345678A",
  "telefono": "+34612345678",
  "fechaNacimiento": "1990-01-15",
  "fechaIngreso": "2025-01-01",
  "puestoId": "uuid",
  "sedeId": "uuid",
  "jornadaId": "uuid",
  "tipoContrato": "indefinido",
  "salarioBrutoAnual": 30000
}
```

**Response:**
```json
{
  "id": "uuid",
  "nombre": "Juan",
  "apellidos": "Pérez Martínez",
  ...
}
```

---

## Sistema de Permisos

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Ver propios datos | ✅ | ✅ | ✅ |
| Ver empleados de equipo | ❌ | ✅ | ✅ |
| Ver todos los empleados | ❌ | ❌ | ✅ |
| Crear empleados | ❌ | ❌ | ✅ |
| Editar empleados | ❌ | ❌ | ✅ |
| Dar de baja | ❌ | ❌ | ✅ |
| Actualizar avatar propio | ✅ | ✅ | ✅ |
| Renovar saldo horas | ❌ | ❌ | ✅ |
| Exportar a Excel | ❌ | ❌ | ✅ |

---

## Recursos Relacionados

**Backend:**
- `app/api/empleados/route.ts` - Lista y creación
- `app/api/empleados/[id]/route.ts` - CRUD individual
- `app/api/empleados/me/route.ts` - Perfil propio
- `lib/empleados/` - Lógica de negocio

**Frontend:**
- `app/(dashboard)/hr/organizacion/personas/` - Vista HR
- `app/(dashboard)/empleado/mi-espacio/` - Vista empleado
- `components/organizacion/` - Componentes de empleados

**Documentación:**
- [Funcionalidad Empleados](../../funcionalidades/empleados.md) - Workflows y lógica de negocio
- [Onboarding](../../funcionalidades/onboarding-empleado.md) - Proceso de alta
- [Importación Excel](../../funcionalidades/importacion-empleados-excel.md) - Carga masiva
