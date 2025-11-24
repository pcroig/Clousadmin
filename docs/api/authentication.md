# Autenticación en Clousadmin API

## Índice
- [Resumen](#resumen)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Obtener un Token JWT](#obtener-un-token-jwt)
- [Usar el Token](#usar-el-token)
- [Renovación de Tokens](#renovación-de-tokens)
- [Roles y Permisos](#roles-y-permisos)
- [Ejemplos de Código](#ejemplos-de-código)
- [Troubleshooting](#troubleshooting)

---

## Resumen

La API de Clousadmin utiliza **JSON Web Tokens (JWT)** para autenticación. Todos los endpoints protegidos requieren un token válido en el header `Authorization`.

**Características del token:**
- Formato: Bearer token
- Duración: 24 horas
- Algoritmo: HS256
- Incluye: userId, empresaId, role

---

## Flujo de Autenticación

```mermaid
sequenceDiagram
    participant C as Cliente
    participant API as Clousadmin API
    participant DB as Base de Datos

    C->>API: POST /api/auth/login
    Note over C,API: { email, password }

    API->>DB: Verificar credenciales
    DB-->>API: Usuario válido

    API->>API: Generar JWT
    API-->>C: 200 OK
    Note over API,C: { token, user }

    C->>API: GET /api/empleados
    Note over C,API: Authorization: Bearer {token}

    API->>API: Validar JWT
    API->>DB: Obtener datos
    DB-->>API: Datos
    API-->>C: 200 OK + Datos
```

---

## Obtener un Token JWT

### 1. Login con Email y Contraseña

**Endpoint:** `POST /api/auth/login`

**Request:**
```bash
curl -X POST https://api.clousadmin.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@empresa.com",
    "password": "Password123!"
  }'
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbXByZXNhSWQiOiI3NzBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJyb2xlIjoiaHJfYWRtaW4iLCJpYXQiOjE3MzI0NzM2MDAsImV4cCI6MTczMjU2MDAwMH0.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@empresa.com",
    "nombre": "María",
    "apellidos": "García López",
    "role": "hr_admin",
    "empresaId": "770e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Errores posibles:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | Validation error | Email o password faltantes o formato inválido |
| 401 | Credenciales inválidas | Email o password incorrectos |
| 429 | Too many requests | Demasiados intentos de login (rate limiting) |

---

### 2. Login con Google OAuth

**Endpoint:** `POST /api/auth/google`

**Request:**
```bash
curl -X POST https://api.clousadmin.com/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "GOOGLE_OAUTH_CREDENTIAL_TOKEN"
  }'
```

**Response:** Igual que login normal (token + user)

**Requisitos:**
- Usuario debe estar previamente registrado con ese email de Google
- Email debe estar verificado en Google

---

## Usar el Token

Una vez obtenido el token, inclúyelo en el header `Authorization` de todas las peticiones:

```bash
curl -X GET https://api.clousadmin.com/api/empleados \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Header completo:**
```
Authorization: Bearer {tu_token_jwt}
```

**Importante:**
- El prefijo `Bearer ` es obligatorio (con espacio después)
- El token NO debe tener comillas
- El token es case-sensitive

---

## Renovación de Tokens

### Expiración

Los tokens JWT expiran después de **24 horas** desde su emisión.

### Cómo Renovar

Actualmente, para renovar un token debes volver a hacer login:

1. Detecta token expirado (error 401 con mensaje "Token expirado")
2. Llama a `/api/auth/login` nuevamente
3. Obtén nuevo token
4. Actualiza el token en tu aplicación

### Ejemplo de Detección de Expiración

```javascript
async function apiCall(endpoint) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      const error = await response.json();
      if (error.message?.includes('expirado')) {
        // Token expirado, renovar
        await renewToken();
        // Reintentar petición
        return apiCall(endpoint);
      }
    }

    return response.json();
  } catch (error) {
    console.error('Error en API call:', error);
  }
}

async function renewToken() {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  token = data.token; // Actualizar token global
  localStorage.setItem('token', token);
}
```

**Nota:** En futuras versiones se implementará refresh token para renovación sin credenciales.

---

## Roles y Permisos

La API soporta 4 roles con diferentes niveles de acceso:

### Jerarquía de Roles

```
admin
  └─ hr_admin
      └─ manager
          └─ empleado
```

### Descripción de Roles

| Role | Descripción | Permisos |
|------|-------------|----------|
| **empleado** | Empleado estándar | - Ver sus propios datos<br>- Solicitar ausencias<br>- Fichar entrada/salida<br>- Ver sus nóminas |
| **manager** | Gestor de equipo | Permisos de empleado +<br>- Ver empleados de su equipo<br>- Aprobar/rechazar ausencias de su equipo<br>- Ver fichajes de su equipo |
| **hr_admin** | Administrador de RRHH | Permisos de manager +<br>- Ver todos los empleados<br>- Crear/editar/eliminar empleados<br>- Gestionar nóminas<br>- Acceso completo a ausencias y fichajes<br>- Gestionar equipos y puestos |
| **admin** | Super administrador | Todos los permisos +<br>- Gestionar configuración de empresa<br>- Gestionar facturación<br>- Acceso a analytics<br>- Gestionar integraciones |

### Endpoints por Rol

#### Empleado (empleado)
```
GET    /api/empleados/me              # Mi perfil
PATCH  /api/empleados/me              # Actualizar mi perfil
POST   /api/ausencias                 # Solicitar ausencia
GET    /api/ausencias?empleadoId=me   # Mis ausencias
POST   /api/fichajes                  # Fichar
GET    /api/nominas?empleadoId=me     # Mis nóminas
```

#### Manager (manager)
```
# Todos los de empleado +
GET    /api/empleados?equipoId={miEquipoId}  # Empleados de mi equipo
PATCH  /api/ausencias/{id}                    # Aprobar/rechazar ausencias
GET    /api/fichajes?equipoId={miEquipoId}   # Fichajes de mi equipo
```

#### HR Admin (hr_admin)
```
# Todos los anteriores +
POST   /api/empleados                # Crear empleado
PATCH  /api/empleados/{id}           # Editar cualquier empleado
DELETE /api/empleados/{id}           # Dar de baja
POST   /api/nominas                  # Crear nóminas
GET    /api/analytics/*              # Analytics
```

#### Admin (admin)
```
# Todos los anteriores +
PATCH  /api/empresa                  # Configuración empresa
POST   /api/billing/checkout         # Gestionar facturación
POST   /api/integrations/*           # Gestionar integraciones
```

### Verificación de Permisos

La API verifica automáticamente los permisos en cada petición. Si no tienes permisos suficientes, recibirás:

**Response 403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "No tienes permisos para realizar esta acción"
}
```

---

## Ejemplos de Código

### JavaScript / TypeScript

#### Configurar Cliente HTTP

```typescript
// api-client.ts
const API_BASE_URL = 'https://api.clousadmin.com';

class ClousadminAPI {
  private token: string | null = null;

  constructor() {
    // Cargar token del localStorage
    this.token = localStorage.getItem('token');
  }

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    this.token = data.token;
    localStorage.setItem('token', data.token);
    return data;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    if (!this.token) {
      throw new Error('No autenticado. Llama a login() primero.');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expirado o inválido
      this.token = null;
      localStorage.removeItem('token');
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error en la petición');
    }

    return response.json();
  }

  async getEmpleados(params?: { page?: number; limit?: number }) {
    const queryParams = new URLSearchParams(
      params as Record<string, string>
    ).toString();
    return this.request(`/api/empleados?${queryParams}`);
  }

  async createAusencia(data: {
    tipo: string;
    fechaInicio: string;
    fechaFin: string;
    motivo?: string;
  }) {
    return this.request('/api/ausencias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Uso:
const api = new ClousadminAPI();

// Login
await api.login('usuario@empresa.com', 'password');

// Hacer peticiones
const empleados = await api.getEmpleados({ page: 1, limit: 10 });
const ausencia = await api.createAusencia({
  tipo: 'vacaciones',
  fechaInicio: '2025-07-01',
  fechaFin: '2025-07-15',
});
```

---

### Python

```python
import requests
from typing import Optional, Dict, Any

class ClousadminAPI:
    def __init__(self, base_url: str = "https://api.clousadmin.com"):
        self.base_url = base_url
        self.token: Optional[str] = None

    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Iniciar sesión y obtener token JWT"""
        response = requests.post(
            f"{self.base_url}/api/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()

        data = response.json()
        self.token = data["token"]
        return data

    def _request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Hacer petición HTTP con autenticación"""
        if not self.token:
            raise Exception("No autenticado. Llama a login() primero.")

        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.token}"
        headers["Content-Type"] = "application/json"

        response = requests.request(
            method,
            f"{self.base_url}{endpoint}",
            headers=headers,
            **kwargs
        )

        if response.status_code == 401:
            self.token = None
            raise Exception("Sesión expirada. Inicia sesión nuevamente.")

        response.raise_for_status()
        return response.json()

    def get_empleados(self, page: int = 1, limit: int = 10):
        """Obtener lista de empleados"""
        return self._request(
            "GET",
            f"/api/empleados?page={page}&limit={limit}"
        )

    def create_ausencia(self, data: Dict[str, Any]):
        """Crear solicitud de ausencia"""
        return self._request(
            "POST",
            "/api/ausencias",
            json=data
        )

# Uso:
api = ClousadminAPI()

# Login
api.login("usuario@empresa.com", "password")

# Hacer peticiones
empleados = api.get_empleados(page=1, limit=10)
ausencia = api.create_ausencia({
    "tipo": "vacaciones",
    "fechaInicio": "2025-07-01",
    "fechaFin": "2025-07-15",
    "motivo": "Vacaciones de verano"
})
```

---

### cURL

```bash
#!/bin/bash

# Variables
API_URL="https://api.clousadmin.com"
EMAIL="usuario@empresa.com"
PASSWORD="password"

# 1. Login y guardar token
TOKEN=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
  | jq -r '.token')

echo "Token obtenido: ${TOKEN}"

# 2. Hacer petición autenticada
curl -X GET "${API_URL}/api/empleados?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# 3. Crear ausencia
curl -X POST "${API_URL}/api/ausencias" \
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

## Troubleshooting

### Error: "Token JWT inválido"

**Causa:** El token está mal formado o corrupto.

**Solución:**
1. Verifica que el token no esté truncado
2. Verifica que no tenga espacios extra o saltos de línea
3. Obtén un nuevo token haciendo login

---

### Error: "Token expirado"

**Causa:** El token tiene más de 24 horas.

**Solución:**
1. Haz login nuevamente para obtener un nuevo token
2. Implementa renovación automática en tu cliente

---

### Error: "Authorization header missing"

**Causa:** No enviaste el header Authorization.

**Solución:**
```bash
# ❌ Incorrecto
curl https://api.clousadmin.com/api/empleados

# ✅ Correcto
curl https://api.clousadmin.com/api/empleados \
  -H "Authorization: Bearer tu_token_aqui"
```

---

### Error: 403 Forbidden

**Causa:** Tu rol no tiene permisos para este endpoint.

**Solución:**
1. Verifica qué rol tiene tu usuario
2. Consulta la tabla de [Roles y Permisos](#roles-y-permisos)
3. Contacta con HR admin para cambiar tu rol si es necesario

---

### Error: 429 Too Many Requests

**Causa:** Has excedido el rate limit.

**Límites actuales:**
- 1000 requests por hora
- 100 requests por minuto

**Solución:**
1. Implementa backoff exponencial
2. Cachea respuestas cuando sea posible
3. Reduce la frecuencia de peticiones

---

## Rate Limiting

La API implementa límites de tasa para prevenir abuso:

| Límite | Valor | Ventana |
|--------|-------|---------|
| Por token | 1000 requests | 1 hora |
| Por token | 100 requests | 1 minuto |
| Login attempts | 5 intentos | 15 minutos |

**Headers de respuesta:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1732560000
```

Cuando excedes el límite:
```json
{
  "error": "Too many requests",
  "message": "Has excedido el límite de peticiones",
  "retryAfter": 60
}
```

---

## Seguridad

### Mejores Prácticas

1. **Nunca compartas tu token JWT**
   - No lo incluyas en URLs
   - No lo guardes en logs
   - No lo compartas por email/chat

2. **Usa HTTPS siempre**
   - Nunca uses HTTP en producción
   - Verifica certificados SSL

3. **Guarda tokens de forma segura**
   - En navegador: usa httpOnly cookies o localStorage con cuidado
   - En mobile: usa secure storage (Keychain, Keystore)
   - En servidor: usa variables de entorno

4. **Implementa logout**
   - Elimina el token al cerrar sesión
   - Llama a `/api/logout` para invalidar en servidor

5. **Rota contraseñas regularmente**
   - Cambia contraseñas cada 90 días
   - Usa contraseñas fuertes (min 8 caracteres, mayúsculas, números, símbolos)

---

## Próximos Pasos

- [Ver documentación completa de endpoints](./reference/README.md)
- [Consultar manejo de errores](./errors.md)
- [Ver ejemplos de flujos comunes](./guides/common-workflows.md)
- [Explorar API interactivamente con Swagger UI](/api-docs)
