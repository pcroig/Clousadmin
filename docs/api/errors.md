# Manejo de Errores en Clousadmin API

## Índice
- [Formato de Respuestas de Error](#formato-de-respuestas-de-error)
- [Códigos de Estado HTTP](#códigos-de-estado-http)
- [Tipos de Errores](#tipos-de-errores)
- [Errores por Categoría](#errores-por-categoría)
- [Mejores Prácticas](#mejores-prácticas)
- [Ejemplos de Manejo](#ejemplos-de-manejo)

---

## Formato de Respuestas de Error

Todas las respuestas de error siguen un formato consistente:

```json
{
  "error": "Tipo de error",
  "message": "Descripción legible del error",
  "details": {
    "campo": "descripción del problema"
  }
}
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `error` | string | Tipo de error (ej: "Validation error", "Unauthorized") |
| `message` | string | Mensaje descriptivo para desarrolladores y usuarios |
| `details` | object | *Opcional*. Detalles adicionales sobre el error |

---

## Códigos de Estado HTTP

### 2xx - Éxito

| Código | Nombre | Descripción | Uso |
|--------|--------|-------------|-----|
| 200 | OK | Petición exitosa | GET, PATCH, DELETE exitosos |
| 201 | Created | Recurso creado | POST exitoso |

### 4xx - Errores del Cliente

| Código | Nombre | Descripción | Cuándo se usa |
|--------|--------|-------------|---------------|
| 400 | Bad Request | Petición mal formada o validación fallida | Datos inválidos, formato incorrecto |
| 401 | Unauthorized | No autenticado | Token ausente, inválido o expirado |
| 403 | Forbidden | Sin permisos suficientes | Intentar acceder a recurso sin permisos |
| 404 | Not Found | Recurso no encontrado | ID inexistente |
| 409 | Conflict | Conflicto con estado actual | Email duplicado, ausencias solapadas |
| 422 | Unprocessable Entity | Error de lógica de negocio | Saldo insuficiente, reglas de negocio |
| 429 | Too Many Requests | Rate limit excedido | Demasiadas peticiones |

### 5xx - Errores del Servidor

| Código | Nombre | Descripción | Cuándo se usa |
|--------|--------|-------------|---------------|
| 500 | Internal Server Error | Error inesperado del servidor | Bugs, excepciones no capturadas |
| 503 | Service Unavailable | Servicio temporalmente no disponible | Mantenimiento, sobrecarga |

---

## Tipos de Errores

### 1. Errores de Validación (400)

Se producen cuando los datos enviados no cumplen las validaciones.

**Ejemplo:**
```json
// Request
POST /api/empleados
{
  "nombre": "",
  "email": "invalido",
  "fechaIngreso": "no-es-una-fecha"
}

// Response 400
{
  "error": "Validation error",
  "message": "Los datos proporcionados no son válidos",
  "details": {
    "nombre": "El nombre es requerido",
    "email": "Email inválido",
    "fechaIngreso": "Fecha inválida, formato esperado: YYYY-MM-DD"
  }
}
```

**Causas comunes:**
- Campos requeridos faltantes
- Formato de email inválido
- Fechas mal formadas
- Valores fuera de rango
- Tipos de datos incorrectos

---

### 2. Errores de Autenticación (401)

Se producen cuando las credenciales son inválidas o el token no es válido.

**Ejemplos:**

#### Login fallido
```json
// Request
POST /api/auth/login
{
  "email": "usuario@empresa.com",
  "password": "contraseña_incorrecta"
}

// Response 401
{
  "error": "Credenciales inválidas",
  "message": "El email o la contraseña son incorrectos"
}
```

#### Token inválido
```json
{
  "error": "Unauthorized",
  "message": "Token JWT inválido o expirado"
}
```

#### Token faltante
```json
{
  "error": "Unauthorized",
  "message": "Token de autorización no proporcionado"
}
```

**Causas comunes:**
- Credenciales incorrectas
- Token expirado (> 24h)
- Token mal formado
- Header Authorization faltante
- Token revocado

---

### 3. Errores de Autorización (403)

Se producen cuando el usuario autenticado no tiene permisos suficientes.

**Ejemplo:**
```json
// Empleado intenta crear otro empleado
POST /api/empleados

// Response 403
{
  "error": "Forbidden",
  "message": "No tienes permisos para realizar esta acción"
}
```

**Casos comunes:**

| Acción | Rol requerido | Error si eres |
|--------|---------------|---------------|
| Crear empleado | hr_admin | empleado o manager |
| Ver nóminas de otros | hr_admin o manager (su equipo) | empleado |
| Gestionar facturación | admin | cualquier otro rol |
| Aprobar ausencias | manager o hr_admin | empleado |

---

### 4. Errores de Recurso No Encontrado (404)

Se producen cuando intentas acceder a un recurso que no existe.

**Ejemplo:**
```json
// Request
GET /api/empleados/99999999-9999-9999-9999-999999999999

// Response 404
{
  "error": "Not found",
  "message": "El empleado solicitado no existe"
}
```

**Causas comunes:**
- ID incorrecto o inexistente
- Recurso fue eliminado
- Recurso pertenece a otra empresa (multi-tenancy)

---

### 5. Errores de Conflicto (409)

Se producen cuando hay un conflicto con el estado actual de los recursos.

**Ejemplos:**

#### Email duplicado
```json
// Request
POST /api/empleados
{
  "email": "juan@empresa.com",
  ...
}

// Response 409
{
  "error": "Email ya existe",
  "message": "Ya existe un empleado con el email juan@empresa.com"
}
```

#### Ausencias solapadas
```json
// Request
POST /api/ausencias
{
  "fechaInicio": "2025-07-05",
  "fechaFin": "2025-07-10",
  ...
}

// Response 409
{
  "error": "Ausencias solapadas",
  "message": "Ya existe una ausencia en el período solicitado",
  "details": {
    "ausenciaExistente": {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "fechaInicio": "2025-07-01",
      "fechaFin": "2025-07-15",
      "tipo": "vacaciones"
    }
  }
}
```

**Causas comunes:**
- Email o DNI duplicado
- Ausencias solapadas
- Fichaje duplicado en mismo momento
- Recurso en uso que no puede eliminarse

---

### 6. Errores de Lógica de Negocio (422)

Se producen cuando la petición es válida pero no puede procesarse por reglas de negocio.

**Ejemplos:**

#### Saldo de vacaciones insuficiente
```json
// Request
POST /api/ausencias
{
  "tipo": "vacaciones",
  "fechaInicio": "2025-07-01",
  "fechaFin": "2025-07-15" // 11 días
}

// Response 422
{
  "error": "Saldo insuficiente",
  "message": "El empleado solo tiene 5 días de vacaciones disponibles pero solicita 11",
  "details": {
    "saldoDisponible": 5,
    "diasSolicitados": 11
  }
}
```

#### Ausencia ya aprobada no se puede modificar
```json
// Request
PATCH /api/ausencias/123

// Response 422
{
  "error": "Ausencia no modificable",
  "message": "No puedes modificar una ausencia que ya ha sido aprobada"
}
```

#### No se puede dar de baja empleado con nóminas pendientes
```json
// Request
DELETE /api/empleados/123

// Response 422
{
  "error": "Empleado con nóminas pendientes",
  "message": "No puedes dar de baja a un empleado con nóminas pendientes de pago",
  "details": {
    "nominasPendientes": 2
  }
}
```

**Causas comunes:**
- Saldo insuficiente
- Estado no permite operación
- Dependencias que bloquean operación
- Violación de reglas de negocio específicas

---

### 7. Errores de Rate Limiting (429)

Se producen cuando se excede el límite de peticiones.

**Ejemplo:**
```json
{
  "error": "Too many requests",
  "message": "Has excedido el límite de peticiones. Intenta nuevamente en 60 segundos",
  "details": {
    "retryAfter": 60,
    "limit": 100,
    "window": "1 minuto"
  }
}
```

**Headers incluidos:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1732560000
Retry-After: 60
```

---

### 8. Errores del Servidor (500)

Se producen cuando hay un error inesperado en el servidor.

**Ejemplo:**
```json
{
  "error": "Internal server error",
  "message": "Ha ocurrido un error inesperado. El equipo ha sido notificado"
}
```

**Qué hacer:**
1. Reintenta la petición después de unos segundos
2. Si persiste, contacta a soporte
3. Incluye el timestamp y endpoint en tu reporte

---

## Errores por Categoría

### Autenticación y Autorización

| Error | Código | Solución |
|-------|--------|----------|
| Token faltante | 401 | Incluye header `Authorization: Bearer {token}` |
| Token inválido | 401 | Verifica que el token no esté corrupto o truncado |
| Token expirado | 401 | Haz login nuevamente |
| Sin permisos | 403 | Contacta a HR admin para cambiar tu rol |

### Validación de Datos

| Error | Código | Solución |
|-------|--------|----------|
| Campo requerido faltante | 400 | Incluye todos los campos marcados como requeridos |
| Email inválido | 400 | Usa formato válido: usuario@dominio.com |
| Fecha inválida | 400 | Usa formato ISO 8601: YYYY-MM-DD |
| Valor fuera de rango | 400 | Consulta límites en documentación del endpoint |

### Recursos

| Error | Código | Solución |
|-------|--------|----------|
| Recurso no encontrado | 404 | Verifica que el ID sea correcto |
| Email duplicado | 409 | Usa un email diferente |
| DNI duplicado | 409 | Verifica que el DNI sea correcto |

### Lógica de Negocio

| Error | Código | Solución |
|-------|--------|----------|
| Saldo insuficiente | 422 | Reduce días solicitados o espera a nuevo período |
| Ausencias solapadas | 422 | Cancela ausencia existente o cambia fechas |
| Estado no permite operación | 422 | Verifica estado del recurso |

---

## Mejores Prácticas

### 1. Siempre Verifica el Código de Estado

```javascript
// ❌ Malo
const data = await fetch(url).then(r => r.json());

// ✅ Bueno
const response = await fetch(url);
if (!response.ok) {
  const error = await response.json();
  throw new Error(error.message);
}
const data = await response.json();
```

### 2. Maneja Cada Tipo de Error Apropiadamente

```javascript
async function createEmpleado(data) {
  try {
    const response = await fetch('/api/empleados', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();

      switch (response.status) {
        case 400:
          // Error de validación - mostrar al usuario
          showValidationErrors(error.details);
          break;
        case 401:
          // No autenticado - redirigir a login
          redirectToLogin();
          break;
        case 403:
          // Sin permisos - mostrar mensaje
          showError('No tienes permisos para esta acción');
          break;
        case 409:
          // Conflicto - mostrar mensaje específico
          showError(error.message);
          break;
        case 429:
          // Rate limit - esperar y reintentar
          await wait(error.details.retryAfter * 1000);
          return createEmpleado(data); // Reintentar
        case 500:
          // Error del servidor - notificar soporte
          showError('Error del servidor. Intenta más tarde');
          logToSentry(error);
          break;
        default:
          showError('Error inesperado');
      }

      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error('Error creando empleado:', error);
    throw error;
  }
}
```

### 3. Implementa Retry con Backoff Exponencial

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // No reintentar errores 4xx (excepto 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw await response.json();
      }

      // Reintentar 429 y 5xx
      if (response.status === 429 || response.status >= 500) {
        const waitTime = response.headers.get('Retry-After')
          ? parseInt(response.headers.get('Retry-After')) * 1000
          : Math.pow(2, i) * 1000; // Backoff exponencial

        console.log(`Reintentando en ${waitTime}ms...`);
        await wait(waitTime);
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 4. Valida en el Cliente Antes de Enviar

```javascript
// Validar antes de hacer la petición
function validateEmpleado(data) {
  const errors = {};

  if (!data.nombre?.trim()) {
    errors.nombre = 'El nombre es requerido';
  }

  if (!data.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    errors.email = 'Email inválido';
  }

  if (!data.fechaIngreso?.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.fechaIngreso = 'Fecha inválida (YYYY-MM-DD)';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

// Uso
const errors = validateEmpleado(formData);
if (errors) {
  showValidationErrors(errors);
  return;
}

// Solo hacer petición si validación local pasa
await createEmpleado(formData);
```

### 5. Loggea Errores Apropiadamente

```javascript
function logError(error, context) {
  const errorInfo = {
    message: error.message,
    code: error.code,
    status: error.status,
    timestamp: new Date().toISOString(),
    context,
    user: getCurrentUser(),
  };

  // Enviar a servicio de logging (Sentry, Datadog, etc.)
  if (window.Sentry) {
    Sentry.captureException(error, {
      extra: errorInfo
    });
  }

  // Log en consola en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error('Error capturado:', errorInfo);
  }
}
```

---

## Ejemplos de Manejo

### React / TypeScript

```typescript
import { useState } from 'react';

interface ApiError {
  error: string;
  message: string;
  details?: Record<string, string>;
}

function useApiRequest<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function request(
    endpoint: string,
    options?: RequestInit
  ): Promise<T | null> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const apiError: ApiError = await response.json();
        setError(apiError);
        return null;
      }

      const data: T = await response.json();
      return data;
    } catch (err) {
      setError({
        error: 'Network error',
        message: 'No se pudo conectar con el servidor',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { request, loading, error };
}

// Uso en componente
function EmpleadosPage() {
  const { request, loading, error } = useApiRequest<Empleado[]>();

  async function loadEmpleados() {
    const empleados = await request('/api/empleados');
    if (empleados) {
      setEmpleados(empleados);
    }
  }

  return (
    <div>
      {loading && <Spinner />}
      {error && (
        <ErrorAlert
          title={error.error}
          message={error.message}
          details={error.details}
        />
      )}
      {/* ... resto del componente */}
    </div>
  );
}
```

---

### Python

```python
import requests
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class ApiError:
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    status_code: int = 0

class ClousadminAPIError(Exception):
    def __init__(self, api_error: ApiError):
        self.api_error = api_error
        super().__init__(api_error.message)

def handle_response(response: requests.Response) -> Dict[str, Any]:
    """Maneja respuesta de API y lanza excepciones apropiadas"""
    if response.ok:
        return response.json()

    try:
        error_data = response.json()
    except ValueError:
        error_data = {
            "error": "Unknown error",
            "message": response.text or "Error desconocido"
        }

    api_error = ApiError(
        error=error_data.get("error", "Unknown error"),
        message=error_data.get("message", "Error desconocido"),
        details=error_data.get("details"),
        status_code=response.status_code
    )

    raise ClousadminAPIError(api_error)

# Uso
try:
    response = requests.post(
        "https://api.clousadmin.com/api/empleados",
        json=empleado_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    empleado = handle_response(response)
    print(f"Empleado creado: {empleado['id']}")

except ClousadminAPIError as e:
    if e.api_error.status_code == 400:
        # Error de validación
        print("Errores de validación:")
        for field, error in e.api_error.details.items():
            print(f"  {field}: {error}")

    elif e.api_error.status_code == 401:
        # No autenticado
        print("Sesión expirada, inicia sesión nuevamente")
        # Redirigir a login

    elif e.api_error.status_code == 409:
        # Conflicto (ej: email duplicado)
        print(f"Conflicto: {e.api_error.message}")

    else:
        # Otro error
        print(f"Error: {e.api_error.message}")
```

---

## Recursos Adicionales

- [Documentación de Autenticación](./authentication.md)
- [Referencia de API](./reference/README.md)
- [Explorar con Swagger UI](/api-docs)
- [Postman Collection](../openapi/postman/clousadmin.json)
