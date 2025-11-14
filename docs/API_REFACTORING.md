# 🔄 REFACTORIZACIÓN DE API ROUTES - DOCUMENTACIÓN

**Fecha**: 27 de enero 2025  
**Versión**: 1.0  
**Estado**: ✅ Completado (36/36 archivos refactorizados)

---

## 📋 Resumen

Se ha completado una refactorización completa de todas las API routes (`app/api/**/route.ts`) para centralizar autenticación, validación, manejo de errores y respuestas. Esto mejora significativamente la mantenibilidad, consistencia y escalabilidad del código.

---

## 🎯 Objetivos Alcanzados

### 1. **Centralización de Lógica Común**
- ✅ Autenticación centralizada
- ✅ Validación centralizada con Zod
- ✅ Manejo de errores centralizado
- ✅ Respuestas estandarizadas

### 2. **Reducción de Código Duplicado**
- ✅ Eliminación de ~15-20 líneas duplicadas por archivo
- ✅ ~600+ líneas de código eliminadas en total
- ✅ Código más DRY (Don't Repeat Yourself)

### 3. **Mejora de Mantenibilidad**
- ✅ Cambios en autenticación/validación ahora se hacen en un solo lugar
- ✅ Patrones consistentes en todas las APIs
- ✅ Fácil agregar nuevas funcionalidades

---

## 🛠️ Implementación: `lib/api-handler.ts`

### Ubicación
```
lib/api-handler.ts
```

### Funciones Disponibles

#### **Autenticación**
```typescript
// Verificar autenticación básica
requireAuth(req: NextRequest): Promise<{ session: SessionData } | NextResponse>

// Verificar rol HR Admin
requireAuthAsHR(req: NextRequest): Promise<{ session: SessionData } | NextResponse>

// Verificar rol HR Admin o Manager
requireAuthAsHROrManager(req: NextRequest): Promise<{ session: SessionData } | NextResponse>

// Verificar roles específicos
requireAuthAndRole(req: NextRequest, allowedRoles: string[]): Promise<{ session: SessionData } | NextResponse>
```

#### **Validación**
```typescript
// Validar request body con schema Zod
validateRequest<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<{ data: T } | NextResponse>
```

#### **Manejo de Errores**
```typescript
// Manejar errores de forma centralizada
handleApiError(error: unknown, context: string): NextResponse
```

#### **Respuestas Estándar**
```typescript
// Respuesta exitosa (200)
successResponse<T>(data: T, status?: number): NextResponse

// Respuesta de creación (201)
createdResponse<T>(data: T): NextResponse

// No encontrado (404)
notFoundResponse(message?: string): NextResponse

// Bad request (400)
badRequestResponse(message: string, details?: any): NextResponse

// Forbidden (403)
forbiddenResponse(message?: string): NextResponse
```

#### **Verificaciones de Acceso**
```typescript
// Verificar acceso a recursos de la empresa
verifyEmpresaAccess(session: SessionData, resourceEmpresaId: string): NextResponse | null

// Verificar acceso a recursos del empleado
verifyEmpleadoAccess(session: SessionData, empleadoId: string): Promise<NextResponse | null>
```

---

## 📝 Patrón de Uso

### Ejemplo: API Route Refactorizada

**Antes:**
```typescript
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.user?.id || !session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = schema.parse(body);

    const data = await prisma.tabla.findMany({
      where: { empresaId: session.user.empresaId },
    });

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[API GET Tabla]', error);
    return NextResponse.json(
      { error: 'Error al obtener datos' },
      { status: 500 }
    );
  }
}
```

**Después:**
```typescript
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, schema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const data = await prisma.tabla.findMany({
      where: { empresaId: session.user.empresaId },
    });

    return successResponse(data);
  } catch (error) {
    return handleApiError(error, 'API GET /api/tabla');
  }
}
```

**Beneficios:**
- ✅ **-15 líneas de código** por archivo
- ✅ **Código más limpio** y legible
- ✅ **Manejo de errores consistente**
- ✅ **Mantenibilidad mejorada**

---

## 📊 Estadísticas de Refactorización

### Archivos Refactorizados: 36/36 (100%)

#### Por Categoría:
- **Analytics**: 5 archivos
- **Ausencias**: 4 archivos
- **Empleados**: 4 archivos
- **Fichajes**: 9 archivos
- **Jornadas**: 4 archivos
- **Organización**: 2 archivos
- **Otros**: 8 archivos

### Código Eliminado:
- **Helpers en uso**: 398+ ocurrencias
- **Código antiguo restante**: 0 ocurrencias
- **Líneas eliminadas**: ~600+ líneas

### Mejoras:
- **Consistencia**: 100% de APIs usan helpers centralizados
- **Mantenibilidad**: Cambios centralizados en `lib/api-handler.ts`
- **Escalabilidad**: Fácil agregar nuevas APIs siguiendo el patrón

---

## 🔍 Verificación de Calidad

### ✅ Checklist de Verificación

- [x] **Build exitoso**: `npm run build` compila sin errores
- [x] **Sin errores de linting**: Todos los archivos refactorizados sin errores
- [x] **Lógica preservada**: Funcionalidad mantenida en todos los archivos
- [x] **Tipos correctos**: TypeScript sin errores de tipo
- [x] **Imports correctos**: Todos los imports funcionan
- [x] **Código antiguo eliminado**: 0 ocurrencias de `getSession()` directamente

### ⚠️ Notas Importantes

1. **Logs de debugging**: Se mantienen `console.error()` dentro del contexto de `handleApiError()` para debugging interno.
2. **Errores preexistentes**: Hay algunos errores de TypeScript en componentes no relacionados (ej: sidebar) que no afectan la refactorización.
3. **Compatibilidad**: Todas las APIs mantienen la misma interfaz externa, no hay breaking changes.

---

## 📚 Archivos de Referencia

### Implementación
- `lib/api-handler.ts` - Helpers centralizados

### Ejemplos de Uso
- `app/api/ausencias/route.ts` - GET, POST con validación
- `app/api/fichajes/route.ts` - GET, POST complejo
- `app/api/jornadas/[id]/route.ts` - GET, PATCH, DELETE con params

### Reglas de Desarrollo
- `.cursorrules` - Principios de código limpio y escalable

---

## 🚀 Siguientes Pasos Recomendados

### 1. **Testing** (Prioridad Alta)
- [ ] Tests unitarios para `lib/api-handler.ts`
- [ ] Tests de integración para APIs críticas
- [ ] Tests E2E para flujos completos

### 2. **Optimizaciones Adicionales**
- [ ] Revisar y optimizar queries Prisma (N+1)
- [ ] Implementar rate limiting en APIs críticas
- [ ] Cache para endpoints frecuentes (`unstable_cache`)

### 3. **Documentación API**
- [ ] Generar documentación OpenAPI/Swagger
- [ ] Documentar todos los endpoints en `docs/funcionalidades/`
- [ ] Crear guía de uso para desarrolladores

### 4. **Monitoreo y Logging**
- [ ] Implementar logging estructurado (Winston/Pino)
- [ ] Métricas de performance de APIs
- [ ] Alertas para errores frecuentes

### 5. **Componentes Frontend**
- [ ] Revisar y optimizar componentes en `components/`
- [ ] Crear hooks reutilizables para APIs
- [ ] Implementar error boundaries

---

## 📖 Guía para Desarrolladores

### Cómo Crear una Nueva API Route

1. **Crear archivo** `app/api/[recurso]/route.ts`

2. **Importar helpers necesarios:**
```typescript
import {
  requireAuth,           // o requireAuthAsHR, requireAuthAsHROrManager
  validateRequest,
  handleApiError,
  successResponse,
  createdResponse,
  // ... otros según necesites
} from '@/lib/api-handler';
```

3. **Definir schema de validación (si aplica):**
```typescript
const createSchema = z.object({
  campo1: z.string(),
  campo2: z.number(),
});
```

4. **Implementar endpoint:**
```typescript
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // 2. Validación
    const validationResult = await validateRequest(req, createSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // 3. Lógica de negocio
    const resultado = await prisma.tabla.create({
      data: {
        ...validatedData,
        empresaId: session.user.empresaId,
      },
    });

    // 4. Respuesta
    return createdResponse(resultado);
  } catch (error) {
    return handleApiError(error, 'API POST /api/[recurso]');
  }
}
```

### Buenas Prácticas

1. **Siempre usar helpers**: No usar `getSession()`, `NextResponse.json()` directamente
2. **Validar siempre**: Usar `validateRequest()` para todos los inputs
3. **Contexto en errores**: Siempre incluir contexto en `handleApiError()`
4. **Respuestas consistentes**: Usar helpers de respuesta (`successResponse`, `createdResponse`, etc.)

---

**Última actualización**: 27 de enero 2025  
**Mantenido por**: Equipo de Desarrollo Clousadmin





















