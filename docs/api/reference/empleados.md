# API de Empleados

## Índice
- [Descripción General](#descripción-general)
- [Endpoints](#endpoints)
- [Schemas](#schemas)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Casos de Uso Comunes](#casos-de-uso-comunes)

---

## Descripción General

El módulo de empleados permite gestionar el ciclo completo de empleados: creación, actualización, consulta y baja.

**Características:**
- CRUD completo de empleados
- Gestión de avatar
- Historial de cambios
- Export a Excel
- Firma digital
- Integración con onboarding

**Permisos:**
- `empleado`: Solo puede ver y actualizar su propio perfil
- `manager`: Puede ver empleados de su equipo
- `hr_admin`: Acceso completo a todos los empleados
- `admin`: Acceso completo + configuración

---

## Endpoints

### GET /api/empleados

Lista empleados con paginación y filtros.

**Autenticación:** Requerida (Bearer token)

**Roles:** manager, hr_admin, admin

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| page | integer | No | Número de página (default: 1) |
| limit | integer | No | Items por página (default: 10, max: 100) |
| search | string | No | Buscar por nombre, apellidos o email |
| equipoId | uuid | No | Filtrar por equipo |
| puestoId | uuid | No | Filtrar por puesto |
| sedeId | uuid | No | Filtrar por sede |
| activo | boolean | No | Filtrar por estado (true=activos, false=bajas) |

**Ejemplo de Request:**

```bash
curl -X GET 'https://api.clousadmin.com/api/empleados?page=1&limit=10&search=García&activo=true' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Ejemplo de Response (200 OK):**

```json
{
  "empleados": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "nombre": "María",
      "apellidos": "García López",
      "email": "maria.garcia@empresa.com",
      "telefono": "+34612345678",
      "dni": "12345678A",
      "fechaNacimiento": "1990-05-15",
      "fechaIngreso": "2023-01-01",
      "fechaBaja": null,
      "activo": true,
      "puestoId": "660e8400-e29b-41d4-a716-446655440001",
      "equipoId": "770e8400-e29b-41d4-a716-446655440002",
      "sedeId": "880e8400-e29b-41d4-a716-446655440003",
      "empresaId": "990e8400-e29b-41d4-a716-446655440004",
      "avatar": "https://clousadmin.com/uploads/avatars/maria.jpg",
      "createdAt": "2023-01-01T09:00:00.000Z",
      "updatedAt": "2025-06-01T10:30:00.000Z"
    },
    {
      "id": "551e8400-e29b-41d4-a716-446655440000",
      "nombre": "Juan",
      "apellidos": "García Martínez",
      "email": "juan.garcia@empresa.com",
      "telefono": "+34612345679",
      "dni": "12345678B",
      "fechaNacimiento": "1988-08-20",
      "fechaIngreso": "2022-06-15",
      "fechaBaja": null,
      "activo": true,
      "puestoId": "660e8400-e29b-41d4-a716-446655440001",
      "equipoId": "770e8400-e29b-41d4-a716-446655440002",
      "sedeId": "880e8400-e29b-41d4-a716-446655440003",
      "empresaId": "990e8400-e29b-41d4-a716-446655440004",
      "avatar": null,
      "createdAt": "2022-06-15T09:00:00.000Z",
      "updatedAt": "2025-05-20T14:15:00.000Z"
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

**Errores:**
- `401 Unauthorized`: Token inválido o expirado
- `403 Forbidden`: Sin permisos (rol empleado sin manager/hr_admin)

---

### GET /api/empleados/{id}

Obtiene los detalles completos de un empleado específico.

**Autenticación:** Requerida

**Roles:**
- `empleado`: Solo su propio perfil (/api/empleados/me)
- `manager`: Empleados de su equipo
- `hr_admin` y `admin`: Cualquier empleado

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| id | uuid | ID del empleado (o "me" para el usuario actual) |

**Ejemplo de Request:**

```bash
# Obtener mi propio perfil
curl -X GET 'https://api.clousadmin.com/api/empleados/me' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Obtener perfil de otro empleado (requiere permisos)
curl -X GET 'https://api.clousadmin.com/api/empleados/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Ejemplo de Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "María",
  "apellidos": "García López",
  "email": "maria.garcia@empresa.com",
  "telefono": "+34612345678",
  "dni": "12345678A",
  "fechaNacimiento": "1990-05-15",
  "fechaIngreso": "2023-01-01",
  "fechaBaja": null,
  "activo": true,
  "puestoId": "660e8400-e29b-41d4-a716-446655440001",
  "equipoId": "770e8400-e29b-41d4-a716-446655440002",
  "sedeId": "880e8400-e29b-41d4-a716-446655440003",
  "empresaId": "990e8400-e29b-41d4-a716-446655440004",
  "avatar": "https://clousadmin.com/uploads/avatars/maria.jpg",
  "puesto": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "nombre": "Desarrollador Frontend",
    "departamento": "Tecnología"
  },
  "equipo": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "nombre": "Equipo Web",
    "managerId": "551e8400-e29b-41d4-a716-446655440000",
    "manager": {
      "nombre": "Pedro",
      "apellidos": "Sánchez"
    }
  },
  "sede": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "nombre": "Oficina Madrid Centro",
    "direccion": "Calle Gran Vía, 123"
  },
  "jornada": {
    "id": "990e8400-e29b-41d4-a716-446655440005",
    "nombre": "Jornada completa (40h)",
    "horasSemanales": 40
  },
  "salarioBrutoAnual": 35000,
  "numeroPagas": 14,
  "diasVacacionesAnuales": 22,
  "createdAt": "2023-01-01T09:00:00.000Z",
  "updatedAt": "2025-06-01T10:30:00.000Z"
}
```

**Errores:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sin permisos para ver este empleado
- `404 Not Found`: Empleado no existe

---

### POST /api/empleados

Crea un nuevo empleado.

**Autenticación:** Requerida

**Roles:** hr_admin, admin

**Request Body:**

```json
{
  "nombre": "Juan",
  "apellidos": "Pérez Martínez",
  "email": "juan.perez@empresa.com",
  "telefono": "+34612345678",
  "dni": "12345678A",
  "fechaNacimiento": "1990-05-15",
  "fechaIngreso": "2025-07-01",
  "puestoId": "660e8400-e29b-41d4-a716-446655440001",
  "equipoId": "770e8400-e29b-41d4-a716-446655440002",
  "sedeId": "880e8400-e29b-41d4-a716-446655440003",
  "jornadaId": "990e8400-e29b-41d4-a716-446655440005",
  "salarioBrutoAnual": 35000,
  "numeroPagas": 14,
  "diasVacacionesAnuales": 22
}
```

**Campos Requeridos:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| nombre | string | Nombre del empleado |
| apellidos | string | Apellidos del empleado |
| email | string | Email corporativo (único) |
| dni | string | DNI o documento de identidad (único) |
| fechaIngreso | date (YYYY-MM-DD) | Fecha de alta en la empresa |

**Campos Opcionales:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| telefono | string | Teléfono de contacto |
| fechaNacimiento | date | Fecha de nacimiento |
| puestoId | uuid | ID del puesto de trabajo |
| equipoId | uuid | ID del equipo |
| sedeId | uuid | ID de la sede física |
| jornadaId | uuid | ID de la jornada laboral |
| salarioBrutoAnual | number | Salario bruto anual en euros |
| numeroPagas | integer | Número de pagas (12 o 14 típicamente) |
| diasVacacionesAnuales | integer | Días de vacaciones al año (default: 22) |

**Ejemplo de Request:**

```bash
curl -X POST 'https://api.clousadmin.com/api/empleados' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "nombre": "Juan",
    "apellidos": "Pérez Martínez",
    "email": "juan.perez@empresa.com",
    "dni": "12345678A",
    "fechaIngreso": "2025-07-01",
    "puestoId": "660e8400-e29b-41d4-a716-446655440001",
    "salarioBrutoAnual": 35000,
    "numeroPagas": 14,
    "diasVacacionesAnuales": 22
  }'
```

**Ejemplo de Response (201 Created):**

```json
{
  "id": "552e8400-e29b-41d4-a716-446655440000",
  "nombre": "Juan",
  "apellidos": "Pérez Martínez",
  "email": "juan.perez@empresa.com",
  "telefono": null,
  "dni": "12345678A",
  "fechaNacimiento": null,
  "fechaIngreso": "2025-07-01",
  "fechaBaja": null,
  "activo": true,
  "puestoId": "660e8400-e29b-41d4-a716-446655440001",
  "equipoId": null,
  "sedeId": null,
  "empresaId": "990e8400-e29b-41d4-a716-446655440004",
  "avatar": null,
  "createdAt": "2025-06-15T10:30:00.000Z",
  "updatedAt": "2025-06-15T10:30:00.000Z"
}
```

**Errores:**
- `400 Bad Request`: Validación fallida (campos requeridos faltantes o formato inválido)
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sin permisos (solo hr_admin y admin)
- `409 Conflict`: Email o DNI ya existe

**Ejemplo de Error de Validación (400):**

```json
{
  "error": "Validation error",
  "message": "Los datos proporcionados no son válidos",
  "details": {
    "email": "Email inválido",
    "dni": "DNI requerido",
    "fechaIngreso": "Fecha inválida, formato esperado: YYYY-MM-DD"
  }
}
```

**Ejemplo de Error de Duplicado (409):**

```json
{
  "error": "Email ya existe",
  "message": "Ya existe un empleado con el email juan.perez@empresa.com"
}
```

---

### PATCH /api/empleados/{id}

Actualiza los datos de un empleado existente.

**Autenticación:** Requerida

**Roles:**
- `empleado`: Solo puede actualizar campos limitados de su propio perfil (teléfono, avatar)
- `hr_admin` y `admin`: Pueden actualizar cualquier campo de cualquier empleado

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| id | uuid | ID del empleado |

**Request Body:**

Todos los campos son opcionales. Solo incluye los campos que quieres actualizar.

```json
{
  "nombre": "Juan Carlos",
  "apellidos": "Pérez Martínez",
  "telefono": "+34612345679",
  "fechaNacimiento": "1990-05-15",
  "puestoId": "661e8400-e29b-41d4-a716-446655440001",
  "equipoId": "771e8400-e29b-41d4-a716-446655440002",
  "sedeId": "881e8400-e29b-41d4-a716-446655440003",
  "jornadaId": "991e8400-e29b-41d4-a716-446655440005",
  "salarioBrutoAnual": 38000,
  "numeroPagas": 14,
  "diasVacacionesAnuales": 23
}
```

**Ejemplo de Request:**

```bash
# Empleado actualizando su teléfono
curl -X PATCH 'https://api.clousadmin.com/api/empleados/me' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "telefono": "+34612345679"
  }'

# HR actualizando puesto y salario
curl -X PATCH 'https://api.clousadmin.com/api/empleados/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "puestoId": "661e8400-e29b-41d4-a716-446655440001",
    "salarioBrutoAnual": 38000
  }'
```

**Ejemplo de Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "nombre": "Juan Carlos",
  "apellidos": "Pérez Martínez",
  "email": "juan.perez@empresa.com",
  "telefono": "+34612345679",
  "dni": "12345678A",
  "fechaNacimiento": "1990-05-15",
  "fechaIngreso": "2025-07-01",
  "fechaBaja": null,
  "activo": true,
  "puestoId": "661e8400-e29b-41d4-a716-446655440001",
  "equipoId": "771e8400-e29b-41d4-a716-446655440002",
  "sedeId": "881e8400-e29b-41d4-a716-446655440003",
  "empresaId": "990e8400-e29b-41d4-a716-446655440004",
  "avatar": null,
  "createdAt": "2025-06-15T10:30:00.000Z",
  "updatedAt": "2025-06-20T15:45:00.000Z"
}
```

**Errores:**
- `400 Bad Request`: Validación fallida
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sin permisos
- `404 Not Found`: Empleado no existe

---

### DELETE /api/empleados/{id}

Da de baja a un empleado (soft delete).

**Autenticación:** Requerida

**Roles:** hr_admin, admin

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| id | uuid | ID del empleado |

**Query Parameters (opcional):**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| fechaBaja | date (YYYY-MM-DD) | Fecha efectiva de baja (default: hoy) |
| motivo | string | Motivo de la baja |

**Ejemplo de Request:**

```bash
curl -X DELETE 'https://api.clousadmin.com/api/empleados/550e8400-e29b-41d4-a716-446655440000?fechaBaja=2025-06-30&motivo=Fin%20de%20contrato' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Ejemplo de Response (200 OK):**

```json
{
  "message": "Empleado dado de baja exitosamente",
  "empleado": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nombre": "Juan",
    "apellidos": "Pérez",
    "fechaBaja": "2025-06-30",
    "activo": false
  }
}
```

**Errores:**
- `401 Unauthorized`: Token inválido
- `403 Forbidden`: Sin permisos
- `404 Not Found`: Empleado no existe
- `422 Unprocessable Entity`: No se puede dar de baja por dependencias (nóminas pendientes, ausencias futuras, etc.)

**Ejemplo de Error 422:**

```json
{
  "error": "Empleado con nóminas pendientes",
  "message": "No puedes dar de baja a un empleado con nóminas pendientes de pago",
  "details": {
    "nominasPendientes": 2
  }
}
```

---

## Schemas

### Empleado (Básico)

```typescript
interface Empleado {
  id: string;               // UUID
  nombre: string;
  apellidos: string;
  email: string;            // Único
  telefono: string | null;
  dni: string;              // Único
  fechaNacimiento: string | null;  // ISO 8601 date
  fechaIngreso: string;     // ISO 8601 date
  fechaBaja: string | null; // ISO 8601 date
  activo: boolean;
  puestoId: string | null;  // UUID
  equipoId: string | null;  // UUID
  sedeId: string | null;    // UUID
  empresaId: string;        // UUID
  avatar: string | null;    // URL
  createdAt: string;        // ISO 8601 datetime
  updatedAt: string;        // ISO 8601 datetime
}
```

### Empleado (Detalle)

```typescript
interface EmpleadoDetalle extends Empleado {
  puesto: {
    id: string;
    nombre: string;
    departamento: string;
  } | null;
  equipo: {
    id: string;
    nombre: string;
    managerId: string;
    manager: {
      nombre: string;
      apellidos: string;
    };
  } | null;
  sede: {
    id: string;
    nombre: string;
    direccion: string;
  } | null;
  jornada: {
    id: string;
    nombre: string;
    horasSemanales: number;
  } | null;
  salarioBrutoAnual: number | null;
  numeroPagas: number | null;
  diasVacacionesAnuales: number | null;
}
```

---

## Ejemplos de Uso

### TypeScript / React

```typescript
interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  activo: boolean;
  // ... otros campos
}

// Obtener lista de empleados
async function getEmpleados(page: number = 1, search?: string) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: '10',
    ...(search && { search }),
  });

  const response = await fetch(
    `https://api.clousadmin.com/api/empleados?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) throw new Error('Error al obtener empleados');

  return response.json();
}

// Crear empleado
async function createEmpleado(data: Partial<Empleado>) {
  const response = await fetch('https://api.clousadmin.com/api/empleados', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Actualizar empleado
async function updateEmpleado(id: string, data: Partial<Empleado>) {
  const response = await fetch(
    `https://api.clousadmin.com/api/empleados/${id}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) throw new Error('Error al actualizar empleado');

  return response.json();
}

// Hook React
function useEmpleados(search?: string) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEmpleados(1, search)
      .then(data => {
        setEmpleados(data.empleados);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [search]);

  return { empleados, loading, error };
}
```

---

## Casos de Uso Comunes

### 1. Listar empleados activos con búsqueda

```bash
curl -X GET 'https://api.clousadmin.com/api/empleados?activo=true&search=García&limit=20' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 2. Crear empleado y asignar a equipo

```bash
curl -X POST 'https://api.clousadmin.com/api/empleados' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "nombre": "Ana",
    "apellidos": "Martínez Ruiz",
    "email": "ana.martinez@empresa.com",
    "dni": "87654321B",
    "fechaIngreso": "2025-07-01",
    "equipoId": "770e8400-e29b-41d4-a716-446655440002",
    "puestoId": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

### 3. Actualizar salario de empleado

```bash
curl -X PATCH 'https://api.clousadmin.com/api/empleados/550e8400-e29b-41d4-a716-446655440000' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "salarioBrutoAnual": 42000
  }'
```

### 4. Dar de baja empleado

```bash
curl -X DELETE 'https://api.clousadmin.com/api/empleados/550e8400-e29b-41d4-a716-446655440000?fechaBaja=2025-06-30' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

### 5. Obtener mi perfil completo

```bash
curl -X GET 'https://api.clousadmin.com/api/empleados/me' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## Próximos Pasos

- [Documentación de Ausencias](./ausencias.md)
- [Documentación de Fichajes](./fichajes.md)
- [Ver todos los endpoints](../README.md)
- [Explorar API interactivamente](/api-docs)
