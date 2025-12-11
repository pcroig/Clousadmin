# Documentación de API de Clousadmin

Bienvenido a la documentación oficial de la API REST de Clousadmin.

> **Versión actual:** 1.0.0
> **Última actualización:** 10 de diciembre de 2025
> **Base URL:** `https://api.clousadmin.com`
> **Autenticación:** JWT Bearer Token

> **Nota**: Para detalles de refactorización de APIs (2025-01-27), ver [`API_REFACTORING.md`](../API_REFACTORING.md)

---

## Inicio Rápido

### 1. Obtener un Token

```bash
curl -X POST https://api.clousadmin.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@empresa.com",
    "password": "tu-contraseña"
  }'
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "tu-email@empresa.com",
    "nombre": "Tu Nombre",
    "role": "hr_admin"
  }
}
```

### 2. Usar el Token

Incluye el token en el header `Authorization` de todas tus peticiones:

```bash
curl -X GET https://api.clousadmin.com/api/empleados \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Explorar la API

- **[Swagger UI](/api-docs)** - Interfaz interactiva para probar endpoints
- **[Especificación OpenAPI](../openapi/openapi.yaml)** - Especificación completa en formato YAML
- **[Postman Collection](../openapi/postman/clousadmin-collection.json)** - Importa y prueba en Postman

---

## Índice de Documentación

### Guías

| Documento | Descripción |
|-----------|-------------|
| [Autenticación](./authentication.md) | Cómo autenticarse, roles, permisos y renovación de tokens |
| [Manejo de Errores](./errors.md) | Códigos de estado, formato de errores y mejores prácticas |
| [Paginación](./pagination.md) | Cómo funciona la paginación en endpoints de listado |
| [Rate Limiting](./rate-limiting.md) | Límites de peticiones y cómo manejarlos |

### Referencia de API

Documentación de endpoints por módulo. Para detalles de funcionalidad y lógica de negocio, ver [`/docs/funcionalidades`](../funcionalidades/).

| Módulo | Endpoints | Descripción | Funcionalidad |
|--------|-----------|-------------|---------------|
| [Autenticación](./reference/auth.md) | 6 | Login, OAuth, recuperación de contraseña | [Ver funcionalidad](../funcionalidades/autenticacion.md) |
| [Empleados](./reference/empleados.md) | 13+ | Endpoints de empleados | [Ver funcionalidad](../funcionalidades/empleados.md) |
| [Equipos](./reference/equipos.md) | 11 | Endpoints de equipos | [Ver funcionalidad](../funcionalidades/equipos.md) |
| [Ausencias](./reference/ausencias.md) | 6+ | Endpoints de ausencias | [Ver funcionalidad](../funcionalidades/ausencias.md) |
| [Fichajes](./reference/fichajes.md) | 13+ | Endpoints de fichajes | [Ver funcionalidad](../funcionalidades/fichajes.md) |
| [Nóminas](./reference/nominas.md) | 24+ | Endpoints de nóminas | [Ver funcionalidad](../funcionalidades/gestion-nominas.md) |
| [Documentos](./reference/documentos.md) | 10+ | Endpoints de documentos | [Ver funcionalidad](../funcionalidades/documentos.md) |
| [Webhooks](./reference/webhooks.md) | 2 | Stripe y Google Calendar | - |

### Recursos Adicionales

| Recurso | Descripción |
|---------|-------------|
| [Changelog](./API_CHANGELOG.md) | Historial de cambios de la API |
| [Guías de Uso](./guides/) | Flujos comunes y casos de uso |
| [Ejemplos de Código](./examples/) | Ejemplos en diferentes lenguajes |

---

## Características Principales

### Autenticación y Seguridad

- **JWT Bearer Tokens** - Tokens seguros con expiración de 24h
- **Roles y Permisos** - 4 niveles: empleado, manager, hr_admin, admin
- **HTTPS obligatorio** - Todas las peticiones deben usar HTTPS
- **Rate Limiting** - 1000 req/hora, 100 req/minuto

### Multi-tenancy

- Todas las peticiones están filtradas automáticamente por empresa
- Un token JWT solo da acceso a datos de su empresa
- Aislamiento completo entre empresas

### Paginación

- Todos los endpoints de listado soportan paginación
- Parámetros: `page` (default: 1), `limit` (default: 10, max: 100)
- Respuesta incluye: `total`, `page`, `limit`, `totalPages`

### Validación

- Validación robusta con Zod schemas
- Mensajes de error descriptivos
- Errores de validación incluyen campo y descripción

### Manejo de Errores Consistente

- Códigos de estado HTTP estándar
- Formato de error uniforme: `{ error, message, details }`
- Respuestas descriptivas para debugging

---

## Módulos de API

### Gestión de Personal

#### Empleados
Gestión completa del ciclo de vida de empleados desde onboarding hasta offboarding.

**Endpoints principales:**
- `GET /api/empleados` - Listar con filtros
- `POST /api/empleados` - Crear empleado
- `PATCH /api/empleados/{id}` - Actualizar datos
- `DELETE /api/empleados/{id}` - Dar de baja

[Ver referencia API →](./reference/empleados.md) | [Ver funcionalidad →](../funcionalidades/empleados.md)

---

#### Equipos
Organización de empleados en equipos con managers asignados.

**Endpoints principales:**
- `GET /api/equipos` - Listar equipos
- `POST /api/equipos` - Crear equipo
- `POST /api/equipos/{id}/members` - Añadir miembros

[Ver referencia API →](./reference/equipos.md) | [Ver funcionalidad →](../funcionalidades/equipos.md)

---

### Tiempo y Ausencias

#### Ausencias
Sistema completo de solicitud, aprobación y gestión de ausencias (vacaciones, permisos, bajas).

**Endpoints principales:**
- `POST /api/ausencias` - Solicitar ausencia
- `PATCH /api/ausencias/{id}` - Aprobar/rechazar
- `GET /api/ausencias/saldo/{empleadoId}` - Consultar saldo

**Características:**
- Validación de saldo disponible
- Detección de ausencias solapadas
- Aprobación por manager o HR
- Sincronización con Google Calendar

[Ver documentación completa →](./reference/ausencias.md)

---

#### Fichajes
Control horario con registro de entradas, salidas y pausas.

**Endpoints principales:**
- `POST /api/fichajes` - Registrar fichaje
- `GET /api/fichajes/balance/{empleadoId}` - Balance de horas
- `POST /api/fichajes/correccion` - Solicitar corrección

**Características:**
- Geolocalización opcional
- Cálculo automático de horas trabajadas
- Balance de horas extras
- Bolsa de horas compensables

[Ver documentación completa →](./reference/fichajes.md)

---

### Nóminas y Compensación

#### Nóminas
Generación, gestión y descarga de nóminas mensuales.

**Endpoints principales:**
- `GET /api/nominas` - Listar nóminas
- `POST /api/nominas` - Crear nómina
- `GET /api/nominas/{id}/download` - Descargar PDF

**Características:**
- Cálculo automático de deducciones
- Complementos salariales
- Generación de PDF
- Alertas de incidencias
- Analytics de nóminas

[Ver documentación completa →](./reference/nominas.md)

---

### Documentos

#### Gestión Documental
Upload, organización y generación de documentos.

**Endpoints principales:**
- `POST /api/documentos` - Subir documento
- `GET /api/documentos` - Listar documentos
- `POST /api/documentos/extract-ia` - Extracción con IA

#### Plantillas
Generación automática de documentos desde plantillas.

**Endpoints principales:**
- `POST /api/plantillas` - Crear plantilla
- `POST /api/plantillas/{id}/generar` - Generar documento

[Ver documentación completa →](./reference/documentos.md)

---

### Integraciones

#### Webhooks
Recibe notificaciones de Stripe (pagos) y Google Calendar (cambios en eventos).

**Endpoints:**
- `POST /api/webhooks/stripe` - Webhook de Stripe
- `POST /api/integrations/calendar/webhook` - Webhook de Google Calendar

**Eventos manejados:**
- Stripe: productos, precios, suscripciones, pagos
- Google Calendar: creación, actualización, eliminación de eventos

[Ver documentación completa →](./reference/webhooks.md)

---

## Ejemplos de Código

### JavaScript / TypeScript

```typescript
// Cliente simple de API
class ClousadminAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://api.clousadmin.com${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }

  async getEmpleados(page = 1) {
    return this.request(`/api/empleados?page=${page}`);
  }

  async createAusencia(data: any) {
    return this.request('/api/ausencias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Uso
const api = new ClousadminAPI('tu-token');
const empleados = await api.getEmpleados(1);
console.log(empleados);
```

---

### Python

```python
import requests

class ClousadminAPI:
    def __init__(self, token: str):
        self.token = token
        self.base_url = "https://api.clousadmin.com"

    def request(self, endpoint: str, method: str = "GET", **kwargs):
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

        response = requests.request(
            method,
            f"{self.base_url}{endpoint}",
            headers=headers,
            **kwargs
        )

        response.raise_for_status()
        return response.json()

    def get_empleados(self, page: int = 1):
        return self.request(f"/api/empleados?page={page}")

    def create_ausencia(self, data: dict):
        return self.request("/api/ausencias", method="POST", json=data)

# Uso
api = ClousadminAPI("tu-token")
empleados = api.get_empleados(1)
print(empleados)
```

---

### cURL

```bash
# Variables
TOKEN="tu-token-jwt"
BASE_URL="https://api.clousadmin.com"

# Listar empleados
curl -X GET "${BASE_URL}/api/empleados?page=1" \
  -H "Authorization: Bearer ${TOKEN}"

# Crear ausencia
curl -X POST "${BASE_URL}/api/ausencias" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "vacaciones",
    "fechaInicio": "2025-07-01",
    "fechaFin": "2025-07-15",
    "motivo": "Vacaciones de verano"
  }'
```

---

## Herramientas y Testing

### Swagger UI (Interactivo)

Prueba todos los endpoints directamente desde el navegador:

👉 **[Abrir Swagger UI](/api-docs)**

Características:
- Interfaz visual interactiva
- Autenticación integrada
- Ejemplos de request/response
- Testing en tiempo real

---

### Postman Collection

Importa nuestra colección completa en Postman:

1. Descarga: [clousadmin-collection.json](../openapi/postman/clousadmin-collection.json)
2. Abre Postman > Import > Selecciona el archivo
3. Configura la variable `token` con tu JWT
4. ¡Listo para probar!

**Variables de entorno incluidas:**
- `baseUrl` - URL base de la API
- `token` - Tu token JWT (se guarda automáticamente al hacer login)
- `empleadoId`, `ausenciaId`, `nominaId` - IDs de ejemplo

---

### Stripe CLI

Para testing de webhooks de Stripe en local:

```bash
# Instalar
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks a local
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger evento de prueba
stripe trigger customer.subscription.created
```

---

## Rate Limiting

### Límites

| Ventana | Límite | Scope |
|---------|--------|-------|
| 1 minuto | 100 requests | Por token |
| 1 hora | 1000 requests | Por token |

### Headers de Respuesta

Cada respuesta incluye información sobre tu límite:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1732560000
```

### Cuando Excedes el Límite

**Respuesta 429:**
```json
{
  "error": "Too many requests",
  "message": "Has excedido el límite de peticiones",
  "retryAfter": 60
}
```

**Solución:**
- Implementa backoff exponencial
- Respeta el header `Retry-After`
- Cachea respuestas cuando sea posible

[Ver documentación completa de Rate Limiting →](./rate-limiting.md)

---

## Versionado

### Versión Actual

La API actualmente no usa versionado en la URL. Todas las peticiones van directamente a los endpoints sin prefijo de versión.

**Ejemplo actual:**
```
GET https://api.clousadmin.com/api/empleados
```

### Roadmap de Versionado

En la versión 2.0 (Q4 2025), se implementará versionado por path:

**Futuro:**
```
GET https://api.clousadmin.com/v1/api/empleados
GET https://api.clousadmin.com/v2/api/empleados
```

### Breaking Changes

Los cambios que rompen compatibilidad se anuncian con:
- Mínimo 2 versiones de anticipación
- Documentación de migración
- Deprecation warnings en logs

[Ver Changelog completo →](./API_CHANGELOG.md)

---

## Soporte y Contacto

### Documentación

- **Swagger UI**: [/api-docs](/api-docs)
- **OpenAPI Spec**: [openapi.yaml](../openapi/openapi.yaml)
- **Guías**: [docs/api/guides/](./guides/)

### Reportar Problemas

- **Email**: soporte@clousadmin.com
- **GitHub**: [github.com/clousadmin/api/issues](https://github.com/clousadmin/api/issues)
- **Slack**: [clousadmin.slack.com](https://clousadmin.slack.com)

### Status de Servicios

Consulta el estado de la API en tiempo real:
- **Status Page**: [status.clousadmin.com](https://status.clousadmin.com)

---

## Changelog

### v1.0.0 (Actual) - 27 enero 2025

Refactorización completa de 174 endpoints con:
- Autenticación JWT centralizada
- Validación con Zod
- Respuestas estandarizadas
- Documentación OpenAPI completa

[Ver changelog completo →](./API_CHANGELOG.md)

---

## Licencia

Esta API es propietaria de Clousadmin. El uso de esta API está sujeto a los términos de servicio de Clousadmin.

---

**Última actualización:** 10 de diciembre de 2025
**Versión de documentación:** 1.0.0

---

## Organización de la Documentación

- **`/docs/api/reference/`** - Referencia técnica de endpoints (requests, responses, parámetros)
- **`/docs/funcionalidades/`** - Lógica de negocio, workflows, validaciones y casos de uso
