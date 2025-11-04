# 📋 Sugerencias Futuras - Sistema de Notificaciones

## Estado Actual

### ✅ Implementado (Fases 1 y 2)

#### Fase 1 - Notificaciones Críticas
- ✅ `ausencia_solicitada` - Cuando un empleado solicita una ausencia
- ✅ `ausencia_aprobada` - Cuando se aprueba una ausencia
- ✅ `ausencia_rechazada` - Cuando se rechaza una ausencia
- ✅ `ausencia_cancelada` - Cuando un empleado cancela su ausencia
- ✅ `fichaje_autocompletado` - Cuando el sistema completa automáticamente un fichaje
- ✅ `fichaje_requiere_revision` - Cuando un fichaje necesita revisión manual
- ✅ `fichaje_resuelto` - Cuando se resuelve un fichaje pendiente

#### Fase 2 - Alta Prioridad
- ✅ `cambio_manager` - Cuando cambia el manager de un empleado
- ✅ `asignado_equipo` - Cuando un empleado es asignado a un equipo
- ✅ `solicitud_creada` - Cuando se crea una nueva solicitud de cambio
- ✅ **Nuevos tipos de solicitudes soportados**:
  - `fichaje_correccion` - Solicitud de corrección de fichajes
  - `ausencia_modificacion` - Solicitud de modificación de ausencia
  - `documento` - Solicitud relacionada con documentos
  - `cambio_datos` - Solicitud de cambio de datos personales (ya existente)

### Archivos Modificados

#### APIs con Notificaciones Integradas
1. `/app/api/ausencias/route.ts` - POST (ausencia_solicitada)
2. `/app/api/ausencias/[id]/route.ts` - PATCH (ausencia_aprobada, ausencia_rechazada), DELETE (ausencia_cancelada)
3. `/lib/ia/clasificador-fichajes.ts` - Funciones de clasificación (fichaje_autocompletado, fichaje_requiere_revision)
4. `/app/api/fichajes/revision/route.ts` - POST (fichaje_resuelto)
5. `/app/api/empleados/[id]/route.ts` - PATCH (cambio_manager, asignado_equipo)
6. `/app/api/solicitudes/route.ts` - POST (solicitud_creada)

## 📅 Fase 3 - Notificaciones Proactivas (Sugeridas para Futuro)

### Documentos
```typescript
// Cron Job Sugerido: /app/api/cron/check-document-expiration/route.ts
```

#### 1. `documento_solicitado` (PARCIAL - Requiere implementación en UI)
- **Cuándo**: Cuando HR solicita un documento a un empleado
- **Destinatarios**: Empleado
- **Prioridad**: Alta
- **Implementación sugerida**:
  ```typescript
  // En: /app/api/documentos/solicitar/route.ts (CREAR)
  await crearNotificacionDocumentoSolicitado(prisma, {
    documentoId,
    empresaId,
    empleadoId,
    empleadoNombre,
    tipoDocumento,
    fechaLimite,
  });
  ```

#### 2. `documento_proximo_caducar` (Requiere Cron Job)
- **Cuándo**: 7 días antes de que caduque un documento
- **Destinatarios**: Empleado + HR Admin
- **Prioridad**: Alta
- **Implementación sugerida**:
  ```typescript
  // Crear cron job: /app/api/cron/check-document-expiration/route.ts
  export async function GET(request: NextRequest) {
    // Ejecutar diariamente
    const documentosProximosCaducar = await prisma.documento.findMany({
      where: {
        fechaCaducidad: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
        },
        activo: true,
      },
      include: {
        empleado: { select: { id: true, nombre: true, apellidos: true, empresaId: true } },
      },
    });

    for (const doc of documentosProximosCaducar) {
      await crearNotificacionDocumentoProximoCaducar(prisma, {
        documentoId: doc.id,
        empresaId: doc.empleado.empresaId,
        empleadoId: doc.empleadoId,
        empleadoNombre: `${doc.empleado.nombre} ${doc.empleado.apellidos}`,
        tipoDocumento: doc.tipo,
        fechaCaducidad: doc.fechaCaducidad,
        diasRestantes: Math.ceil((doc.fechaCaducidad.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      });
    }
  }
  ```

### Contratos
```typescript
// Cron Job Sugerido: /app/api/cron/check-contract-expiration/route.ts
```

#### 3. `contrato_proximo_vencer` (Requiere Cron Job)
- **Cuándo**: 30 días antes de que termine un contrato
- **Destinatarios**: Empleado + HR Admin
- **Prioridad**: Alta
- **Implementación sugerida**:
  ```typescript
  // Crear cron job: /app/api/cron/check-contract-expiration/route.ts
  export async function GET(request: NextRequest) {
    // Ejecutar semanalmente
    const contratosProximosVencer = await prisma.contrato.findMany({
      where: {
        fechaFin: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
        },
        estado: 'activo',
      },
      include: {
        empleado: { select: { id: true, nombre: true, apellidos: true, empresaId: true } },
      },
    });

    for (const contrato of contratosProximosVencer) {
      await crearNotificacionContratoProximoVencer(prisma, {
        contratoId: contrato.id,
        empresaId: contrato.empleado.empresaId,
        empleadoId: contrato.empleadoId,
        empleadoNombre: `${contrato.empleado.nombre} ${contrato.empleado.apellidos}`,
        tipoContrato: contrato.tipo,
        fechaFin: contrato.fechaFin,
        diasRestantes: Math.ceil((contrato.fechaFin.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      });
    }
  }
  ```

#### 4. `contrato_finalizado`
- **Cuándo**: Cuando se finaliza un contrato
- **Destinatarios**: Empleado + HR Admin
- **Prioridad**: Alta
- **Implementación sugerida**:
  ```typescript
  // En: /app/api/contratos/[id]/finalizar/route.ts (YA EXISTE - AGREGAR NOTIFICACIÓN)
  await crearNotificacionContratoFinalizado(prisma, {
    contratoId,
    empresaId,
    empleadoId,
    empleadoNombre,
    tipoContrato,
    motivoFinalizacion,
  });
  ```

### Nóminas

#### 5. `nomina_disponible`
- **Cuándo**: Cuando se publica una nómina
- **Destinatarios**: Empleado
- **Prioridad**: Normal
- **Implementación sugerida**:
  ```typescript
  // En: /app/api/nominas/publicar/route.ts (YA EXISTE - AGREGAR NOTIFICACIÓN)
  for (const nominaEmpleado of nominasPublicadas) {
    await crearNotificacionNominaDisponible(prisma, {
      nominaId: nominaEmpleado.id,
      empresaId,
      empleadoId: nominaEmpleado.empleadoId,
      empleadoNombre: nominaEmpleado.empleado.nombre,
      mes: nominaEmpleado.mes,
      año: nominaEmpleado.año,
      importeNeto: nominaEmpleado.importeNeto,
    });
  }
  ```

### Onboarding

#### 6. `onboarding_bienvenida`
- **Cuándo**: Cuando se crea un nuevo empleado
- **Destinatarios**: Empleado
- **Prioridad**: Normal
- **Implementación sugerida**:
  ```typescript
  // En: /app/api/empleados/route.ts POST (YA EXISTE - AGREGAR NOTIFICACIÓN)
  await crearNotificacionOnboardingBienvenida(prisma, {
    empleadoId: nuevoEmpleado.id,
    empresaId,
    empleadoNombre: `${nuevoEmpleado.nombre} ${nuevoEmpleado.apellidos}`,
    fechaAlta: nuevoEmpleado.fechaAlta,
  });
  ```

#### 7. `onboarding_documentos_pendientes`
- **Cuándo**: Cuando quedan documentos pendientes en el onboarding
- **Destinatarios**: Empleado
- **Prioridad**: Normal
- **Cron job diario o webhook**

## 📊 Fase 4 - Notificaciones de Métricas y Gestión (Futuro)

### Vacaciones

#### 8. `vacaciones_campana_iniciada`
- **Cuándo**: Cuando se inicia una campaña de vacaciones
- **Destinatarios**: Todos los empleados del equipo
- **Prioridad**: Normal

#### 9. `vacaciones_campana_recordatorio`
- **Cuándo**: 7 días antes del cierre de campaña
- **Destinatarios**: Empleados que no han solicitado vacaciones
- **Prioridad**: Normal
- **Cron job**

#### 10. `vacaciones_saldo_bajo`
- **Cuándo**: Cuando quedan menos de 5 días de vacaciones disponibles
- **Destinatarios**: Empleado
- **Prioridad**: Baja
- **Cron job mensual**

### Jornadas

#### 11. `jornada_asignada`
- **Cuándo**: Cuando se asigna una jornada a un empleado
- **Destinatarios**: Empleado
- **Prioridad**: Normal

#### 12. `jornada_modificada`
- **Cuándo**: Cuando se modifica la jornada de un empleado
- **Destinatarios**: Empleado
- **Prioridad**: Normal

### Evaluaciones (Si se implementa módulo)

#### 13. `evaluacion_programada`
- **Cuándo**: Se programa una evaluación de desempeño
- **Destinatarios**: Empleado + Manager
- **Prioridad**: Normal

#### 14. `evaluacion_completada`
- **Cuándo**: Se completa una evaluación
- **Destinatarios**: Empleado + HR Admin
- **Prioridad**: Normal

### Formación (Si se implementa módulo)

#### 15. `formacion_asignada`
- **Cuándo**: Se asigna un curso de formación
- **Destinatarios**: Empleado
- **Prioridad**: Normal

#### 16. `formacion_recordatorio`
- **Cuándo**: 3 días antes del inicio del curso
- **Destinatarios**: Empleado
- **Prioridad**: Normal

### Equipos

#### 17. `equipo_nuevo_miembro`
- **Cuándo**: Se añade un nuevo miembro al equipo
- **Destinatarios**: Miembros del equipo + Manager
- **Prioridad**: Baja

#### 18. `equipo_miembro_sale`
- **Cuándo**: Un miembro deja el equipo
- **Destinatarios**: Miembros del equipo + Manager
- **Prioridad**: Baja

## 🔧 Implementación de Cron Jobs

### Configuración Recomendada

Para las notificaciones proactivas que requieren revisión periódica, se recomienda:

1. **Crear endpoint de cron**:
   ```typescript
   // /app/api/cron/daily-notifications/route.ts
   export async function GET(request: NextRequest) {
     // Validar token de autorización (Vercel Cron, etc.)
     const authHeader = request.headers.get('authorization');
     if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
       return new Response('Unauthorized', { status: 401 });
     }

     await checkDocumentExpiration();
     await checkContractExpiration();
     await checkOnboardingPending();

     return Response.json({ success: true });
   }
   ```

2. **Configurar en Vercel**:
   ```json
   // vercel.json
   {
     "crons": [
       {
         "path": "/api/cron/daily-notifications",
         "schedule": "0 9 * * *"
       },
       {
         "path": "/api/cron/weekly-notifications",
         "schedule": "0 9 * * 1"
       }
     ]
   }
   ```

3. **Variables de entorno**:
   ```bash
   CRON_SECRET="tu-secret-aqui"
   ```

## 📝 Notas de Implementación

### Prioridades de Notificaciones
- **Crítica**: Requiere acción inmediata (ausencias, fichajes incompletos)
- **Alta**: Requiere atención pronto (documentos por caducar, contratos por vencer)
- **Normal**: Informativa pero importante (nóminas, onboarding)
- **Baja**: Informativa general (cambios en equipo, métricas)

### Mejores Prácticas
1. **Rate Limiting**: Evitar spam de notificaciones similares
2. **Agrupación**: Agrupar notificaciones del mismo tipo en resúmenes diarios
3. **Preferencias**: Permitir a usuarios configurar qué notificaciones recibir
4. **Canales**: Email para notificaciones críticas, in-app para el resto
5. **Expiración**: Marcar notificaciones antiguas como leídas automáticamente

### Testing
- Crear datos de prueba en seed para verificar notificaciones
- Probar manualmente cada tipo de notificación
- Verificar que los destinatarios son correctos
- Comprobar metadata y action URLs

## 🎯 Próximos Pasos Sugeridos

1. **Corto Plazo (1-2 semanas)**:
   - Implementar cron jobs para documentos y contratos
   - Añadir notificación de nómina disponible
   - Implementar onboarding_bienvenida

2. **Medio Plazo (1 mes)**:
   - Sistema de preferencias de notificaciones
   - Notificaciones de vacaciones
   - Notificaciones de jornadas

3. **Largo Plazo (3+ meses)**:
   - Módulo de evaluaciones con notificaciones
   - Módulo de formación con notificaciones
   - Sistema de resúmenes diarios/semanales
   - Push notifications para móvil
