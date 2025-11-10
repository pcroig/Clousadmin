# Compensación de Horas Extra

## Descripción

Sistema para compensar horas extra trabajadas por los empleados, permitiendo convertirlas en días de vacaciones adicionales o pagarlas en nómina.

## Flujo de Trabajo

### 1. Cálculo del Balance

El balance de horas se calcula automáticamente a partir de los fichajes:

- **Balance Diario**: Horas trabajadas vs. horas esperadas (8h por defecto) del día
- **Balance Semanal**: Acumulado de la semana
- **Balance Mensual**: Acumulado del mes
- **Balance Acumulado**: Total acumulado desde inicio del año

### 2. Compensación desde HR

HR puede compensar horas extra directamente desde:

**Ruta**: `HR > Organización > Personas > [Empleado] > Fichajes`

**Botón**: "Compensar Horas" (solo visible si balance acumulado > 0)

#### Opciones de Compensación

1. **Ausencia/Vacaciones**
   - Conversión: 8 horas = 1 día
   - Se añaden días al saldo de vacaciones del empleado
   - Se crea una ausencia tipo "otro" con estado "auto_aprobada"
   - Se actualiza la tabla `empleadoSaldoAusencias`

2. **Nómina**
   - Las horas se registran para incluir en la próxima nómina
   - Estado: "aprobada"
   - Campo `tipoCompensacion`: "nomina"

### 3. Integración con Sistema de Ausencias

**Implementado**: ✅

Cuando se aprueba una compensación tipo "ausencia":

1. Se crea un registro en `ausencias` con:
   - `tipo`: "otro"
   - `estado`: "auto_aprobada"
   - `descuentaSaldo`: false (no descuenta, suma)
   - `diasSolicitados`: horas / 8 (conversión)
   - `descripcion`: "Compensación de X horas extra"

2. Se actualiza `empleadoSaldoAusencias`:
   - Se incrementa `diasTotales` con los días compensados
   - Si no existe saldo para el año actual, se crea

### 4. Integración con Sistema de Nóminas

**Estado**: ⚠️ Pendiente de implementar en módulo de nóminas

Las compensaciones tipo "nomina" quedan registradas en la tabla `compensaciones_horas_extra` con:

- `estado`: "aprobada"
- `tipoCompensacion`: "nomina"
- `horasBalance`: cantidad de horas a pagar
- `aprobadoPor`: usuario HR que aprobó
- `aprobadoEn`: fecha de aprobación

#### Para implementar en el módulo de nóminas:

Cuando se genere una pre-nómina o nómina, el sistema debe:

1. **Consultar compensaciones pendientes**:
```typescript
const compensacionesPendientes = await prisma.compensacionHoraExtra.findMany({
  where: {
    empleadoId: empleadoId,
    tipoCompensacion: 'nomina',
    estado: 'aprobada',
    nominaId: null, // Aún no asignadas a ninguna nómina
  },
});
```

2. **Calcular importe**:
   - Obtener precio hora del empleado
   - Multiplicar por horas compensadas
   - Aplicar multiplicador de horas extra (ej: 1.5x o 1.75x según convenio)

3. **Incluir en nómina**:
```typescript
// En el cálculo de la nómina
const horasExtrasACompensar = compensacionesPendientes.reduce(
  (sum, comp) => sum + Number(comp.horasBalance),
  0
);

const importeHorasExtras = horasExtrasACompensar * precioHora * multiplicadorHorasExtra;
```

4. **Marcar compensaciones como procesadas**:
```typescript
await prisma.compensacionHoraExtra.updateMany({
  where: {
    id: { in: compensacionesPendientes.map(c => c.id) },
  },
  data: {
    nominaId: nominaGenerada.id,
  },
});
```

## Esquema de Base de Datos

### Tabla: `compensaciones_horas_extra`

```prisma
model CompensacionHoraExtra {
  id               String    @id @default(uuid())
  empresaId        String
  empleadoId       String
  horasBalance     Decimal   @db.Decimal(5, 2)
  tipoCompensacion String    // 'nomina' | 'ausencia'
  estado           String    // 'pendiente', 'aprobada', 'rechazada'
  diasAusencia     Decimal?  // Días convertidos (si es ausencia)
  ausenciaId       String?   @unique
  nominaId         String?   // ID de nómina donde se incluye
  aprobadoPor      String?
  aprobadoEn       DateTime?
  motivoRechazo    String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

## API Endpoints

### POST `/api/compensaciones-horas-extra/crear-hr`

Crea una compensación directamente aprobada por HR.

**Permisos**: Solo HR Admin

**Body**:
```json
{
  "empleadoId": "uuid",
  "horasBalance": 12.5,
  "tipoCompensacion": "ausencia" | "nomina"
}
```

**Response**:
```json
{
  "id": "uuid",
  "empleadoId": "uuid",
  "horasBalance": 12.5,
  "tipoCompensacion": "ausencia",
  "estado": "aprobada",
  "diasAusencia": 1.6,
  "ausenciaId": "uuid",
  "empleado": {
    "id": "uuid",
    "nombre": "Juan",
    "apellidos": "Pérez",
    "email": "juan@example.com"
  },
  "ausencia": { ... }
}
```

## Casos de Uso

### Caso 1: Empleado trabaja horas extra y quiere vacaciones

1. Empleado acumula balance positivo de horas
2. HR accede a `Personas > [Empleado] > Fichajes`
3. Ve balance acumulado: +16h
4. Click en "Compensar Horas"
5. Elige: 16 horas → Ausencia
6. Sistema:
   - Crea compensación aprobada
   - Añade 2 días al saldo de vacaciones
   - Crea ausencia auto-aprobada
   - Empleado puede usar esos 2 días

### Caso 2: Empleado prefiere cobrar horas extra

1. Empleado acumula balance positivo: +24h
2. HR accede a ficha del empleado
3. Click en "Compensar Horas"
4. Elige: 24 horas → Nómina
5. Sistema:
   - Crea compensación aprobada
   - Queda registrada con `tipoCompensacion: 'nomina'`
   - Módulo de nóminas la incluirá en próxima generación

## Seguridad y Permisos

- ✅ Solo HR Admin puede crear compensaciones
- ✅ Solo se pueden compensar horas de empleados de la misma empresa
- ✅ No se pueden compensar más horas del balance disponible
- ✅ Validación de datos con Zod
- ✅ Audit trail completo (quién aprobó, cuándo)

## Validaciones

1. **Horas positivas**: No se pueden compensar horas negativas
2. **Balance suficiente**: No se puede compensar más del balance acumulado
3. **Empleado válido**: El empleado debe existir y pertenecer a la empresa
4. **Permisos**: Solo HR puede crear compensaciones

## Futuras Mejoras

1. **Solicitud por empleado**: Permitir que empleados soliciten compensación (ya hay endpoints, falta UI)
2. **Aprobación por manager**: Workflow de aprobación antes de HR
3. **Políticas automáticas**: Configurar políticas por departamento/empleado
4. **Notificaciones**: Avisar al empleado cuando se aprueba compensación
5. **Reportes**: Dashboard de compensaciones por período/departamento
6. **Límites**: Configurar máximo de horas/año compensables

## Notas Técnicas

- Las horas se guardan como `Decimal(5,2)` para precisión
- Conversión estándar: 8 horas = 1 día laboral
- Las ausencias de compensación usan tipo "otro" con descripción específica
- Estado "auto_aprobada" indica que fue aprobada automáticamente por el sistema
- Campo `descuentaSaldo: false` indica que suma días en lugar de restarlos

---

**Última actualización**: 2025-01-27
**Versión**: 1.0

