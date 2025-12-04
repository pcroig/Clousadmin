# Referencia API - Equipos

**Última actualización:** 4 de diciembre de 2025  
**Estado:** ✅ Actualizado y completo  
**Versión API:** 2.0.0

---

## 📋 Resumen

API completa para gestión de equipos en la organización. Permite crear, actualizar, eliminar equipos, gestionar miembros y responsables, y configurar políticas de ausencias por equipo.

**Autenticación requerida:** HR Admin (`UsuarioRol.hr_admin`)

---

## 🔗 Endpoints

| Endpoint | Método | Descripción | Auth |
|----------|--------|-------------|------|
| `/api/equipos` | GET | Listar equipos (paginado) | HR |
| `/api/equipos` | POST | Crear nuevo equipo | HR |
| `/api/equipos/{id}` | PATCH | Actualizar equipo | HR |
| `/api/equipos/{id}` | DELETE | Eliminar equipo | HR |
| `/api/equipos/{id}/members` | POST | Añadir miembro al equipo | HR |
| `/api/equipos/{id}/members` | DELETE | Eliminar miembro del equipo | HR |
| `/api/equipos/{id}/manager` | PATCH | Cambiar responsable del equipo | HR |
| `/api/equipos/{id}/available-members` | GET | Listar empleados disponibles (no miembros) | HR |
| `/api/organizacion/equipos/{id}/politica` | GET | Obtener política de ausencias del equipo | HR |
| `/api/organizacion/equipos/{id}/politica` | PUT | Crear/actualizar política de ausencias | HR |

---

## 📥 Estructura de Respuestas

### Respuesta Paginada (GET /api/equipos)

```typescript
{
  success: true,
  data: Equipo[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### Respuesta de Equipo Individual

```typescript
{
  id: string;
  empresaId: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  tipo: 'proyecto' | 'squad' | 'temporal';
  sedeId: string | null;
  manager: {
    id: string;
    nombre: string;
    apellidos: string;
    nombreCompleto: string;
  } | null;
  managerId: string | null;
  miembros: Array<{
    id: string;
    nombre: string;
    apellidos: string;
    nombreCompleto: string;
    fotoUrl: string | null;
    fechaIncorporacion: Date;
  }>;
  sede: {
    id: string;
    nombre: string;
    ciudad: string | null;
  } | null;
  numeroMiembros: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔍 Endpoints Detallados

### GET /api/equipos

Lista todos los equipos de la empresa con paginación.

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 20)

**Ejemplo de Request:**
```bash
GET /api/equipos?page=1&limit=20
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "eq_123",
      "nombre": "Equipo de Desarrollo",
      "descripcion": "Equipo encargado del desarrollo de software",
      "manager": {
        "id": "emp_456",
        "nombre": "Juan",
        "apellidos": "Pérez",
        "nombreCompleto": "Juan Pérez"
      },
      "numeroMiembros": 5,
      "sede": {
        "id": "sede_789",
        "nombre": "Oficina Central",
        "ciudad": "Madrid"
      }
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

**Nota importante:** La respuesta está envuelta en un objeto con `data` y `pagination`. Los componentes frontend deben acceder a `response.data` en lugar de esperar un array directo.

---

### POST /api/equipos

Crea un nuevo equipo.

**Request Body:**
```typescript
{
  nombre: string;           // Requerido, 1-100 caracteres
  descripcion?: string;     // Opcional, max 500 caracteres
  sedeId?: string | null;   // Opcional, UUID válido
}
```

**Validaciones:**
- `nombre`: Requerido, no puede estar vacío, máximo 100 caracteres
- `nombre`: Debe ser único dentro de la empresa
- `descripcion`: Opcional, máximo 500 caracteres
- `sedeId`: Si se proporciona, debe existir y pertenecer a la empresa

**Ejemplo de Request:**
```json
{
  "nombre": "Equipo de Marketing",
  "descripcion": "Equipo encargado de estrategias de marketing digital",
  "sedeId": "sede_789"
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "id": "eq_123",
    "nombre": "Equipo de Marketing",
    "descripcion": "Equipo encargado de estrategias de marketing digital",
    "manager": null,
    "miembros": [],
    "numeroMiembros": 0,
    "sede": {
      "id": "sede_789",
      "nombre": "Oficina Central",
      "ciudad": "Madrid"
    }
  }
}
```

**Errores posibles:**
- `400`: Nombre requerido o ya existe
- `400`: Sede no encontrada
- `401`: No autorizado

---

### PATCH /api/equipos/{id}

Actualiza un equipo existente.

**Request Body:**
```typescript
{
  nombre?: string;          // Opcional, 1-100 caracteres
  descripcion?: string | null;  // Opcional, max 500 caracteres
  sedeId?: string | null;   // Opcional, UUID válido
}
```

**Validaciones:**
- Todos los campos son opcionales
- Si se actualiza `nombre`, debe ser único dentro de la empresa
- Si se actualiza `sedeId`, debe existir y pertenecer a la empresa

**Ejemplo de Request:**
```json
{
  "nombre": "Equipo de Marketing Digital",
  "descripcion": "Actualizado: Estrategias de marketing digital y redes sociales"
}
```

**Errores posibles:**
- `404`: Equipo no encontrado
- `400`: Nombre duplicado
- `400`: Sede no encontrada
- `401`: No autorizado

---

### DELETE /api/equipos/{id}

Elimina un equipo. **Cascada:** Elimina automáticamente todas las relaciones `empleado_equipos`.

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Equipo eliminado correctamente"
  }
}
```

**Nota:** Si el equipo tiene un manager asignado, el campo `managerId` se mantiene en `equipos` pero la relación se elimina de `empleado_equipos`.

**Errores posibles:**
- `404`: Equipo no encontrado
- `401`: No autorizado

---

### POST /api/equipos/{id}/members

Añade un empleado al equipo.

**Request Body:**
```typescript
{
  empleadoId: string;  // UUID válido, requerido
}
```

**Validaciones:**
- `empleadoId`: Debe ser un UUID válido
- El empleado debe existir y estar activo en la empresa
- El empleado no debe ser ya miembro del equipo

**Ejemplo de Request:**
```json
{
  "empleadoId": "emp_456"
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "id": "eq_123",
    "nombre": "Equipo de Desarrollo",
    "miembros": [
      {
        "id": "emp_456",
        "nombre": "María",
        "apellidos": "García",
        "nombreCompleto": "María García",
        "fotoUrl": "https://...",
        "fechaIncorporacion": "2025-12-04T10:00:00Z"
      }
    ],
    "numeroMiembros": 1
  }
}
```

**Errores posibles:**
- `400`: empleadoId requerido
- `400`: El empleado ya es miembro del equipo
- `404`: Equipo no encontrado
- `404`: Empleado no encontrado
- `401`: No autorizado

---

### DELETE /api/equipos/{id}/members

Elimina un empleado del equipo.

**Query Parameters:**
- `empleadoId` (requerido): UUID del empleado a eliminar

**Ejemplo de Request:**
```bash
DELETE /api/equipos/eq_123/members?empleadoId=emp_456
```

**Comportamiento especial:**
- Si el empleado eliminado es el manager del equipo, `managerId` se establece automáticamente a `null`

**Errores posibles:**
- `400`: empleadoId requerido
- `400`: El empleado no es miembro del equipo
- `404`: Equipo no encontrado
- `401`: No autorizado

---

### PATCH /api/equipos/{id}/manager

Cambia el responsable del equipo.

**Request Body:**
```typescript
{
  managerId: string | null;  // UUID válido o null
}
```

**Validaciones:**
- Si se proporciona `managerId`, el empleado **debe ser miembro del equipo**
- `managerId` puede ser `null` para quitar el responsable

**Ejemplo de Request:**
```json
{
  "managerId": "emp_456"
}
```

**Ejemplo de Request (quitar manager):**
```json
{
  "managerId": null
}
```

**Errores posibles:**
- `400`: El responsable debe ser miembro del equipo
- `404`: Equipo no encontrado
- `401`: No autorizado

---

### GET /api/equipos/{id}/available-members

Lista todos los empleados activos de la empresa que **no son miembros** del equipo.

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "emp_789",
      "nombre": "Pedro",
      "apellidos": "López",
      "fotoUrl": "https://...",
      "puesto": "Desarrollador Senior"
    }
  ]
}
```

**Orden:** Por apellidos y nombre (ascendente)

**Errores posibles:**
- `404`: Equipo no encontrado
- `401`: No autorizado

---

### GET /api/organizacion/equipos/{id}/politica

Obtiene la política de ausencias del equipo.

**Ejemplo de Response:**
```json
{
  "success": true,
  "data": {
    "equipoId": "eq_123",
    "maxSolapamientoPct": 50,
    "requiereAntelacionDias": 5,
    "isDefault": false
  }
}
```

**Valores por defecto** (si no existe política):
- `maxSolapamientoPct`: 50
- `requiereAntelacionDias`: 5
- `isDefault`: true

---

### PUT /api/organizacion/equipos/{id}/politica

Crea o actualiza la política de ausencias del equipo.

**Request Body:**
```typescript
{
  maxSolapamientoPct: number;      // 0-100, entero
  requiereAntelacionDias: number;   // 0-365, entero
}
```

**Validaciones:**
- `maxSolapamientoPct`: Entero entre 0 y 100
- `requiereAntelacionDias`: Entero entre 0 y 365

**Ejemplo de Request:**
```json
{
  "maxSolapamientoPct": 75,
  "requiereAntelacionDias": 7
}
```

**Errores posibles:**
- `400`: Datos inválidos (fuera de rango)
- `404`: Equipo no encontrado
- `401`: No autorizado

---

## 🛠️ Helpers y Utilidades

### Archivos de Implementación

**Helpers centralizados:**
- `lib/equipos/helpers.ts` - Funciones reutilizables y tipos

**Schemas de validación:**
- `lib/validaciones/equipos-schemas.ts` - Schemas Zod para validación

**Endpoints:**
- `app/api/equipos/route.ts` - GET, POST
- `app/api/equipos/[id]/route.ts` - PATCH, DELETE
- `app/api/equipos/[id]/members/route.ts` - POST, DELETE
- `app/api/equipos/[id]/manager/route.ts` - PATCH
- `app/api/equipos/[id]/available-members/route.ts` - GET
- `app/api/organizacion/equipos/[id]/politica/route.ts` - GET, PUT

### Funciones Helper Disponibles

```typescript
// Validar que equipo pertenece a empresa
validateTeamBelongsToCompany(equipoId: string, empresaId: string): Promise<boolean>

// Validar que empleado es miembro del equipo
validateEmployeeIsTeamMember(empleadoId: string, equipoId: string): Promise<boolean>

// Obtener IDs de miembros del equipo
getTeamMemberIds(equipoId: string): Promise<string[]>

// Formatear respuesta de equipo
formatEquipoResponse(team: EquipoWithRelations): EquipoFormatted
```

---

## 🔒 Seguridad

### Validaciones Implementadas

1. **Autenticación:** Todos los endpoints requieren sesión activa
2. **Autorización:** Solo HR Admin puede gestionar equipos
3. **Validación de empresa:** Todos los recursos validan `empresaId` de la sesión
4. **Validación de UUIDs:** Todos los IDs se validan con Zod schemas
5. **Validación de existencia:** Se verifica que recursos (equipos, empleados, sedes) existan antes de operar
6. **Validación de estado:** Solo empleados activos pueden añadirse a equipos

### Reglas de Negocio

- Un empleado puede estar en múltiples equipos (aunque actualmente la UI no lo soporta completamente)
- El manager de un equipo debe ser miembro del equipo
- Al eliminar un miembro que es manager, se quita automáticamente como manager
- Los nombres de equipos deben ser únicos dentro de la empresa
- Las sedes deben existir y pertenecer a la empresa

---

## 🔄 Compatibilidad y Migración

### Cambios en Estructura de Respuesta (v2.0.0)

**Antes:**
```typescript
// GET /api/equipos retornaba directamente un array
Equipo[]
```

**Ahora:**
```typescript
// GET /api/equipos retorna objeto paginado
{
  data: Equipo[],
  pagination: {...}
}
```

**Componentes actualizados:**
- ✅ `add-persona-onboarding-form.tsx`
- ✅ `sedes-form.tsx`
- ✅ `gestionar-onboarding-modal.tsx`
- ✅ `add-persona-manual-form.tsx`
- ✅ `equipos-client.tsx`

**Compatibilidad backward:** Los componentes incluyen fallbacks para soportar ambas estructuras.

---

## 📚 Recursos Relacionados

### Documentación Funcional
- [`docs/funcionalidades/jornadas.md`](../../funcionalidades/jornadas.md) - Asignación de jornadas por equipo
- [`docs/funcionalidades/ausencias.md`](../../funcionalidades/ausencias.md) - Políticas de ausencias por equipo
- [`docs/funcionalidades/analytics.md`](../../funcionalidades/analytics.md) - Analytics por equipo

### Integraciones
- **Ausencias:** Filtrado y políticas por equipo
- **Campañas de Vacaciones:** Selección de equipos específicos
- **Jornadas:** Asignación masiva por equipo
- **Analytics:** Métricas agregadas por equipo

---

## 🐛 Troubleshooting

### Error: "equipos.map is not a function"

**Causa:** El componente espera un array pero recibe un objeto con `data`.

**Solución:** Acceder a `response.data` en lugar de usar `response` directamente:

```typescript
// ❌ INCORRECTO
const equipos = await response.json();
equipos.map(...)

// ✅ CORRECTO
const result = await response.json();
const equipos = result.data || result.equipos || [];
equipos.map(...)
```

### Error: "Equipo no encontrado"

**Causas posibles:**
- El equipo no existe
- El equipo pertenece a otra empresa
- El ID no es un UUID válido

**Solución:** Verificar que el `equipoId` es correcto y pertenece a la empresa del usuario.

---

## 📝 Changelog

### v2.0.0 (4 de diciembre de 2025)

**Mejoras:**
- ✅ Refactorización completa de APIs con validación Zod
- ✅ Helpers centralizados en `lib/equipos/helpers.ts`
- ✅ Paginación en GET /api/equipos
- ✅ Validaciones robustas de seguridad
- ✅ Estructura de respuesta estandarizada
- ✅ Eliminación de código duplicado (~200 líneas)
- ✅ Type safety mejorado

**Breaking Changes:**
- GET /api/equipos ahora retorna objeto paginado en lugar de array directo

**Compatibilidad:**
- Componentes actualizados con fallbacks para soportar ambas estructuras

---

**Última revisión:** 4 de diciembre de 2025  
**Mantenido por:** Equipo de Desarrollo Clousadmin
