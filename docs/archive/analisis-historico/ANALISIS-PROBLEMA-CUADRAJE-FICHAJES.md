# Análisis Senior Dev: Problema de Cuadraje de Fichajes

**Fecha**: 5 de diciembre de 2025
**Analista**: Senior Developer Review
**Severidad**: 🔴 CRÍTICO - Afecta a todas las empresas nuevas

---

## 🎯 RESUMEN EJECUTIVO

### Problema Reportado
1. **Principal**: Al crear una empresa nueva, aparecen cuadrajes de fichajes para días ANTERIORES a la fecha de registro
2. **Secundario 1**: Los cuadrajes no muestran eventos propuestos automáticamente
3. **Secundario 2**: En la tabla de fichajes solo aparecen algunos cuadrajes, no todos

### Impacto
- ✅ **Funcionalidad**: El sistema funciona técnicamente
- ❌ **UX**: Genera confusión y desconfianza en usuarios nuevos
- ❌ **Datos**: Crea fichajes "fantasma" para días previos al registro
- ❌ **Coherencia**: Viola la lógica de negocio (no puede haber fichajes antes de existir la empresa)

---

## 🔍 CAUSA RAÍZ IDENTIFICADA

### Problema Principal: Lazy Recovery sin validación de fecha empresa

**Ubicación**: `app/api/fichajes/revision/route.ts` líneas 87-112

```typescript
// CÓDIGO ACTUAL (PROBLEMÁTICO)
const lazyDaysFromEnv = Number(process.env.FICHAJES_LAZY_DIAS ?? DEFAULT_LAZY_RECOVERY_DAYS);
const diasARecuperar =
  Number.isFinite(lazyDaysFromEnv) && lazyDaysFromEnv > 0
    ? Math.min(lazyDaysFromEnv, MAX_LAZY_RECOVERY_DAYS)
    : DEFAULT_LAZY_RECOVERY_DAYS;

console.log(
  `[API Revisión GET] Lazy recovery de fichajes para los últimos ${diasARecuperar} día(s) vencido(s) (excluyendo hoy) en empresa ${session.user.empresaId}`
);

// ⚠️ PROBLEMA: Procesa los últimos 3-14 días SIN verificar si la empresa existía
for (let offset = 1; offset <= diasARecuperar; offset++) {
  const fechaObjetivo = new Date(hoy);
  fechaObjetivo.setDate(fechaObjetivo.getDate() - offset);

  try {
    await procesarFichajesDia(session.user.empresaId, fechaObjetivo, { notificar: false });
  } catch (error) {
    console.error(
      '[API Revisión GET] Error procesando fallback de fichajes para el día',
      fechaObjetivo.toISOString().split('T')[0],
      error
    );
  }
}
```

### Por qué ocurre

1. **Flujo de registro**:
   - Usuario se registra el 5 de diciembre 2025
   - Se crea `empresas.createdAt = 2025-12-05`
   - Se crea primer empleado (HR Admin)

2. **Primera visita a "Cuadrar Fichajes"**:
   - HR Admin accede a `/hr/horario/fichajes` 
   - Frontend llama GET `/api/fichajes/revision`
   - API ejecuta lazy recovery para últimos 3 días: 2, 3 y 4 de diciembre
   - **BUG**: La empresa no existía esos días, pero se crean fichajes pendientes

3. **Función `procesarFichajesDia`** (`lib/calculos/fichajes.ts` líneas 1051-1156):
   ```typescript
   export async function procesarFichajesDia(
     empresaId: string,
     fecha: Date,
     options: ProcesarFichajesDiaOptions = {}
   ): Promise<ProcesarFichajesDiaResult> {
     const fechaSinHora = normalizarFecha(fecha);
     const empleadosDisponibles = await obtenerEmpleadosDisponibles(empresaId, fechaSinHora);
     
     for (const empleado of empleadosDisponibles) {
       // Crea fichaje pendiente si no existe
       if (!fichaje) {
         fichaje = await prisma.fichajes.create({
           data: {
             empresaId,
             empleadoId: empleado.id,
             jornadaId: empleado.jornada?.id ?? null,
             fecha: fechaSinHora,
             estado: PrismaEstadoFichaje.pendiente, // ⚠️ Crea fichaje pendiente
           }
         });
       }
     }
   }
   ```

4. **Función `obtenerEmpleadosDisponibles`** (`lib/calculos/fichajes.ts` líneas 851-973):
   - NO valida si la empresa existía en esa fecha
   - NO valida si el empleado existía en esa fecha (usa `empleados.fechaAlta`)
   - Devuelve empleados activos HOY que deberían haber trabajado ENTONCES

### Escenario real

```
Empresa creada: 2025-12-05 10:00:00
HR Admin (empleado 1): fechaAlta = 2025-12-05

Primera visita a "Cuadrar Fichajes": 2025-12-05 11:00:00

Lazy recovery ejecuta:
├─ Día 2025-12-04 → procesarFichajesDia()
│  └─ obtenerEmpleadosDisponibles() → [empleado 1]  ❌ ERROR
│  └─ Crea fichaje pendiente para 2025-12-04        ❌ ERROR
│
├─ Día 2025-12-03 → procesarFichajesDia()
│  └─ obtenerEmpleadosDisponibles() → [empleado 1]  ❌ ERROR
│  └─ Crea fichaje pendiente para 2025-12-03        ❌ ERROR
│
└─ Día 2025-12-02 → procesarFichajesDia()
   └─ obtenerEmpleadosDisponibles() → [empleado 1]  ❌ ERROR
   └─ Crea fichaje pendiente para 2025-12-02        ❌ ERROR

Resultado: 3 fichajes fantasma para días previos al registro
```

---

## 🐛 PROBLEMAS RELACIONADOS

### Problema 2: Eventos propuestos no se muestran

**Ubicación**: `app/api/fichajes/revision/route.ts` líneas 406-408

```typescript
// PUNTO 6: Filtrar eventos propuestos para devolver solo los que FALTAN (no los ya registrados)
const eventosPropuestosFiltrados = eventosPropuestos.filter(
  ep => !tiposEventosRegistrados.includes(ep.tipo)
);
```

**Análisis**:
- La lógica de filtrado es CORRECTA para fichajes con eventos parciales
- Pero para fichajes COMPLETAMENTE VACÍOS (sin eventos registrados):
  - `tiposEventosRegistrados = []`
  - `eventosPropuestos = [{entrada}, {salida}, ...]`
  - `eventosPropuestosFiltrados = [{entrada}, {salida}, ...]` ✅ DEBERÍA FUNCIONAR

**Conclusión**: Este NO debería ser un bug. Los eventos propuestos SÍ se devuelven en fichajes vacíos.

**Posible causa alternativa**:
1. El empleado NO tiene jornada asignada → `eventosPropuestos = []`
2. La jornada NO tiene configuración para ese día → `confDia = undefined`
3. Error en la generación de eventos (líneas 302-381)

**Acción requerida**: Verificar logs del frontend al mostrar cuadrajes

### Problema 3: Tabla no muestra todos los cuadrajes

**Hipótesis**:
1. **Filtrado de ausencias**: Los cuadrajes se filtran si tienen ausencia de día completo (líneas 270-275)
2. **Paginación**: La tabla puede tener límite de resultados no visible
3. **Caché**: Problemas de sincronización con estado del cliente

**Ubicación a revisar**: `app/(dashboard)/hr/horario/fichajes/fichajes-client.tsx`

---

## 💡 SOLUCIÓN PROPUESTA

### Fix 1: Validar fecha de empresa en lazy recovery (CRÍTICO)

**Archivo**: `app/api/fichajes/revision/route.ts`

```typescript
// DESPUÉS DE LA LÍNEA 76
console.log('[API Revisión GET] EmpresaId:', session.user.empresaId);

// NUEVO: Obtener fecha de creación de la empresa
const empresa = await prisma.empresas.findUnique({
  where: { id: session.user.empresaId },
  select: { createdAt: true },
});

if (!empresa) {
  return NextResponse.json(
    { error: 'Empresa no encontrada' },
    { status: 404 }
  );
}

const searchParams = request.nextUrl.searchParams;
const fechaInicioParam = searchParams.get('fechaInicio');
const fechaFinParam = searchParams.get('fechaFin');
const equipoId = searchParams.get('equipoId');
const search = searchParams.get('search');

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

// NUEVO: Fecha de creación normalizada
const fechaCreacionEmpresa = new Date(empresa.createdAt);
fechaCreacionEmpresa.setHours(0, 0, 0, 0);

const lazyDaysFromEnv = Number(process.env.FICHAJES_LAZY_DIAS ?? DEFAULT_LAZY_RECOVERY_DAYS);
const diasARecuperar =
  Number.isFinite(lazyDaysFromEnv) && lazyDaysFromEnv > 0
    ? Math.min(lazyDaysFromEnv, MAX_LAZY_RECOVERY_DAYS)
    : DEFAULT_LAZY_RECOVERY_DAYS;

console.log(
  `[API Revisión GET] Lazy recovery de fichajes para los últimos ${diasARecuperar} día(s) vencido(s) (excluyendo hoy) en empresa ${session.user.empresaId}`
);

// CORRECCIÓN: Lazy recovery solo para días VENCIDOS y POSTERIORES a la creación de la empresa
for (let offset = 1; offset <= diasARecuperar; offset++) {
  const fechaObjetivo = new Date(hoy);
  fechaObjetivo.setDate(fechaObjetivo.getDate() - offset);

  // 🔥 FIX: No procesar días anteriores a la creación de la empresa
  if (fechaObjetivo < fechaCreacionEmpresa) {
    console.log(
      `[API Revisión GET] Saltando día ${fechaObjetivo.toISOString().split('T')[0]} (anterior a creación empresa ${fechaCreacionEmpresa.toISOString().split('T')[0]})`
    );
    continue;
  }

  try {
    await procesarFichajesDia(session.user.empresaId, fechaObjetivo, { notificar: false });
  } catch (error) {
    console.error(
      '[API Revisión GET] Error procesando fallback de fichajes para el día',
      fechaObjetivo.toISOString().split('T')[0],
      error
    );
  }
}
```

### Fix 2: Validar empleados por fecha de alta (CRÍTICO)

**Archivo**: `lib/calculos/fichajes.ts` función `calcularEmpleadosDisponibles`

```typescript
// DESPUÉS DE LA LÍNEA 873 (dentro de calcularEmpleadosDisponibles)
const [empleados, diasLaborables, festivos, ausenciasDiaCompleto] = await Promise.all([
  prisma.empleados.findMany({
    where: {
      empresaId,
      activo: true,
      // 🔥 FIX: Solo empleados que ya estaban dados de alta en esa fecha
      fechaAlta: {
        lte: fecha,
      },
    },
    select: {
      id: true,
      empresaId: true,
      nombre: true,
      apellidos: true,
      fotoUrl: true,
      fechaAlta: true, // Necesario para validación adicional
      jornada: {
        select: {
          id: true,
          activa: true,
          config: true,
        },
      },
    },
  }),
  // ... resto del código
]);
```

### Fix 3: Logging mejorado para debugging

**Archivo**: `app/api/fichajes/revision/route.ts`

```typescript
// DESPUÉS DE formatear fichajes (línea 427)
console.log('[API Revisión] Fichajes formateados:', fichajes.length);

// NUEVO: Log detallado de fichajes sin eventos propuestos
const fichajesSinEventosPropuestos = fichajes.filter(f => f.eventosPropuestos.length === 0);
if (fichajesSinEventosPropuestos.length > 0) {
  console.warn(
    `[API Revisión] ${fichajesSinEventosPropuestos.length} fichajes sin eventos propuestos:`,
    fichajesSinEventosPropuestos.map(f => ({
      empleado: f.empleadoNombre,
      fecha: f.fecha,
      tieneJornada: !!f.empleado?.jornada,
      jornadaActiva: f.empleado?.jornada?.activa,
    }))
  );
}

return NextResponse.json({ fichajes }, { status: 200 });
```

---

## 🧪 PLAN DE TESTING

### Test 1: Empresa nueva (caso crítico)
```typescript
// Escenario: Empresa creada HOY
1. Registrar empresa nueva
2. Crear empleado (HR Admin) con jornada asignada
3. Acceder inmediatamente a "Cuadrar Fichajes"
4. ✅ Verificar: NO deben aparecer cuadrajes para días anteriores
5. ✅ Verificar: Si aparecen cuadrajes, deben ser solo de HOY o posteriores
```

### Test 2: Empresa antigua con empleados nuevos
```typescript
// Escenario: Empresa creada hace 1 mes, empleado nuevo HOY
1. Empresa existente (createdAt = hace 30 días)
2. Crear empleado nuevo con fechaAlta = HOY
3. Acceder a "Cuadrar Fichajes"
4. ✅ Verificar: NO deben aparecer cuadrajes para el nuevo empleado en días anteriores a su alta
5. ✅ Verificar: SÍ deben aparecer cuadrajes para empleados antiguos (si corresponde)
```

### Test 3: Eventos propuestos
```typescript
// Escenario: Cuadraje con jornada configurada
1. Empleado con jornada FIJA (entrada: 09:00, salida: 18:00)
2. Día laboral sin fichajes registrados
3. Procesar día con procesarFichajesDia()
4. Llamar GET /api/fichajes/revision
5. ✅ Verificar: eventosPropuestos contiene [{entrada: 09:00}, {salida: 18:00}]
6. ✅ Verificar: eventosFaltantes = ['entrada', 'salida']
```

### Test 4: Lazy recovery boundary
```typescript
// Escenario: Empresa creada hace 2 días, lazy recovery de 3 días
// empresaCreatedAt = 2025-12-03
// hoy = 2025-12-05
// lazy recovery intenta: [2025-12-04, 2025-12-03, 2025-12-02]

1. Empresa con createdAt = hace 2 días
2. Empleado con fechaAlta = hace 2 días
3. Acceder a "Cuadrar Fichajes"
4. ✅ Verificar: Se procesan solo días >= empresaCreatedAt
5. ✅ Verificar: NO se crea fichaje para 2025-12-02
6. ✅ Verificar: SÍ se crean fichajes para 2025-12-03 y 2025-12-04 (si son laborales)
```

---

## 📊 MÉTRICAS DE VALIDACIÓN

### Antes del fix (comportamiento actual)
```
Empresa nueva:
- Fichajes creados: 3+ (días anteriores al registro)
- Fecha más antigua: hoy - FICHAJES_LAZY_DIAS
- ❌ Coherencia de datos: VIOLADA
```

### Después del fix (comportamiento esperado)
```
Empresa nueva (día 1):
- Fichajes creados: 0 (no hay días laborales pasados)
- Fecha más antigua: empresaCreatedAt
- ✅ Coherencia de datos: VALIDADA

Empresa antigua:
- Fichajes creados: N (solo para empleados con fechaAlta <= fecha)
- Fecha más antigua: MAX(empresaCreatedAt, empleado.fechaAlta, hoy - FICHAJES_LAZY_DIAS)
- ✅ Coherencia de datos: VALIDADA
```

---

## 🚀 PRIORIZACIÓN

### 🔴 CRÍTICO (implementar YA)
1. **Fix 1**: Validar `empresas.createdAt` en lazy recovery
2. **Fix 2**: Validar `empleados.fechaAlta` en obtenerEmpleadosDisponibles

### 🟡 IMPORTANTE (implementar esta semana)
3. **Fix 3**: Logging mejorado para debugging
4. **Test 1-4**: Suite de tests de regresión

### 🟢 MEJORA (backlog)
5. Script de limpieza: Eliminar fichajes fantasma existentes en BD
6. Documentación: Actualizar `docs/funcionalidades/fichajes.md`

---

## 📝 IMPACTO EN CÓDIGO

### Archivos afectados
1. `app/api/fichajes/revision/route.ts` (modificación)
2. `lib/calculos/fichajes.ts` (modificación)

### Riesgo de regresión
- ⬇️ **BAJO**: Los cambios son validaciones adicionales, no cambian lógica existente
- ✅ **Backward compatible**: No afecta a empresas/empleados existentes correctamente configurados
- ✅ **Idempotente**: Ejecutar múltiples veces no causa efectos secundarios

### Testing requerido
- ✅ Tests unitarios: `obtenerEmpleadosDisponibles`
- ✅ Tests integración: GET `/api/fichajes/revision` con diferentes escenarios
- ✅ Tests e2e: Flujo completo de signup → cuadrar fichajes

---

## 🎓 LECCIONES APRENDIDAS

### Principios violados
1. **Temporal consistency**: No se validó coherencia temporal (empresa/empleado debe existir en fecha)
2. **Boundary conditions**: No se consideró el caso límite de empresa recién creada
3. **Data integrity**: Se permitió crear registros para fechas imposibles

### Mejores prácticas a aplicar
1. ✅ Siempre validar fechas de referencia (createdAt, fechaAlta) en queries temporales
2. ✅ Añadir logs detallados en operaciones batch/automatizadas
3. ✅ Incluir casos límite (día 1, empresa nueva) en tests

### Prevención futura
1. Code review checklist: "¿Se validan fechas de existencia de entidades?"
2. Test template: "Escenario día 1: entidad recién creada"
3. Monitoring: Alertar si se crean fichajes para fechas < empresaCreatedAt

---

## 📞 SIGUIENTE PASO

**¿Proceder con la implementación de los fixes?**

Si confirmas, implementaré:
1. ✅ Fix 1 y 2 (validaciones críticas)
2. ✅ Fix 3 (logging)
3. ✅ Tests de validación
4. ✅ Script de limpieza de datos corruptos (opcional)








