# Rate Limiting - Configuración Redis

## Descripción

El sistema de rate limiting protege las APIs contra uso excesivo y ataques de fuerza bruta.

**Implementación**:
- **Producción**: Redis (sincronización multi-instancia)
- **Desarrollo/Test**: Map en memoria (más rápido, sin dependencias)

## Configuración

### Variables de Entorno

```bash
# Producción - Usar Redis
NODE_ENV=production
REDIS_URL=redis://localhost:6379
REDIS_TLS=false  # true para conexiones seguras

# Desarrollo - Forzar Redis (opcional, para testing)
FORCE_REDIS=true
```

### Límites Configurados

| Tipo | Ventana | Máximo | Uso |
|------|---------|--------|-----|
| `login` | 10 segundos | 5 intentos | Protección contra fuerza bruta inmediata |
| `loginHourly` | 1 hora | 20 intentos | Protección contra fuerza bruta sostenida |
| `api` | 1 minuto | 100 requests | APIs de lectura (GET) |
| `apiWrite` | 1 minuto | 50 requests | APIs de escritura (POST/PATCH/DELETE) |

## Uso en APIs

### Ejemplo: API de Login

```typescript
import { rateLimitLogin, getClientIP } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers);
  const rateLimitResult = await rateLimitLogin(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { 
        error: 'Demasiados intentos de login',
        retryAfter: rateLimitResult.retryAfter 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter),
        }
      }
    );
  }

  // Continuar con lógica de login...
}
```

### Ejemplo: API de Lectura

```typescript
import { rateLimitApi, getClientIP } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = getClientIP(req.headers);
  const rateLimitResult = await rateLimitApi(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit excedido' },
      { status: 429 }
    );
  }

  // Continuar con lógica de API...
}
```

### Ejemplo: API de Escritura

```typescript
import { rateLimitApiWrite, getClientIP } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req.headers);
  const rateLimitResult = await rateLimitApiWrite(ip);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Rate limit excedido' },
      { status: 429 }
    );
  }

  // Continuar con lógica de API...
}
```

## Funciones Auxiliares

### Reset Rate Limit

Útil para testing o para resetear después de verificación exitosa (email, 2FA):

```typescript
import { resetRateLimit } from '@/lib/rate-limit';

// Resetear límite de login después de verificación exitosa
await resetRateLimit(ip, 'login');
await resetRateLimit(ip, 'loginHourly');
```

### Obtener Estadísticas

Para debugging y monitoreo:

```typescript
import { getRateLimitStats } from '@/lib/rate-limit';

const stats = await getRateLimitStats(ip, 'api');
console.log(`Intentos: ${stats.attempts}/${stats.remaining}`);
console.log(`Reset en: ${stats.resetAt}`);
```

## Implementación Técnica

### Redis (Producción)

- Usa comandos atómicos (`INCR`, `EXPIRE`, `TTL`)
- Soporta múltiples instancias de la aplicación
- Persiste entre reinicios
- Limpieza automática con TTL

### Map (Desarrollo)

- Almacenamiento en memoria
- Más rápido para desarrollo
- No requiere Redis local
- Limpieza periódica cada 5 minutos

## Monitoreo

### Logs

El sistema loggea automáticamente:

- **Info**: Cuando se activa rate limiting
- **Error**: Cuando falla Redis (fail-open para evitar downtime)

### Métricas

Para producción, considera añadir métricas:

```typescript
// Ejemplo con Prometheus/DataDog
metrics.increment('rate_limit.exceeded', { type: 'api', ip });
metrics.gauge('rate_limit.remaining', rateLimitResult.remaining);
```

## Troubleshooting

### Redis no disponible en producción

**Síntoma**: Logs de `[Rate Limit Redis] Error, allowing request`

**Causa**: Redis no está disponible o hay un problema de conexión

**Solución**: Verificar:
1. Redis está corriendo: `redis-cli ping`
2. `REDIS_URL` es correcta
3. Firewall permite conexión
4. TLS configurado correctamente

**Comportamiento**: El sistema permite requests (fail-open) para evitar downtime

### Rate limiting no funciona en desarrollo

**Síntoma**: Puedo hacer requests ilimitados

**Causa**: `NODE_ENV !== 'production'` y `FORCE_REDIS !== 'true'`

**Solución**: El Map en memoria funciona correctamente pero se resetea con cada reinicio del servidor. Para testing de rate limiting en desarrollo:

```bash
FORCE_REDIS=true npm run dev
```

### Rate limiting muy estricto

**Síntoma**: Usuarios legítimos son bloqueados

**Solución**: Ajustar límites en `lib/rate-limit.ts`:

```typescript
const RATE_LIMITS = {
  api: {
    window: 60 * 1000,
    max: 200, // Aumentado de 100
  },
};
```

## Mejoras Futuras

- [ ] Whitelist de IPs confiables
- [ ] Límites personalizados por usuario/empresa
- [ ] Dashboard de monitoreo de rate limits
- [ ] Alertas automáticas cuando un IP es bloqueado repetidamente

---

**Última actualización**: 2025-11-17
**Responsable**: Equipo de desarrollo







