## Jornadas – Unificación de fixes (8 dic 2025)

**Estado**: vigente  
**Alcance**: validación, asignación, errores y flujo de edición/eliminación de jornadas.

### Resumen
- Validación completa: sin solapamientos entre empresa/equipos/individuales y cobertura 100% de empleados.
- Manejo de errores Zod detallado en frontend (mensajes por campo) y logs de depuración.
- Persistencia precisa con tabla `jornada_asignaciones` y transacciones en asignación/edición.
- UI alineada entre modal y onboarding (accordion, labels por asignados).
- Eliminación segura: desasigna empleados y marca jornada inactiva antes de recrear configuración.

### Cambios clave
- **Validación de solapamientos y cobertura** (`jornadas-modal.tsx`): expansión de equipos a empleados, intersecciones entre jornadas, detección de empleados sin jornada, mensajes específicos.
- **Errores Zod con detalle** (`jornadas-modal.tsx`, `components/onboarding/jornada-step.tsx`): `details[]` parseado y mostrado por campo; logs `[DEBUG]` con payload enviado.
- **Arquitectura y APIs**:
  - Nueva tabla `jornada_asignaciones` para metadata de asignación (`prisma/schema.prisma`, migración `20251208095542_add_jornada_asignaciones`).
  - `/api/jornadas` y `/api/jornadas/[id]` incluyen metadata de asignación; `/api/jornadas/asignar` usa transacciones y upsert.
- **Flujo de guardado** (`jornadas-modal.tsx`): elimina jornadas obsoletas primero (DELETE), luego crea/actualiza y asigna en transacción.
- **Eliminación** (`app/api/jornadas/[id]/route.ts`): desasigna empleados en transacción y marca `activa: false`.

### Reglas de negocio garantizadas
1) Cada empleado tiene exactamente una jornada.  
2) Jornada de empresa es excluyente.  
3) Equipos e individuales no se solapan (cruce entre niveles).  
4) Cobertura total de empleados activos.  
5) Rollbacks atómicos en creación/asignación.

### Pruebas recomendadas
- Crear 2 jornadas de equipos distintos → debe guardar.  
- Empresa + equipo → debe bloquear por exclusividad.  
- Equipo + individual del mismo equipo → debe bloquear por solapamiento.  
- Configuración parcial (dejar empleados sin jornada) → debe mostrar listado de faltantes.  
- Eliminar jornadas antiguas y crear jornada empresa → debe desasignar y guardar sin errores.

### Notas de despliegue
- Ejecutar migración `20251208095542_add_jornada_asignaciones` y `npx prisma generate`, reiniciar servidor.  
- Verificar logs de `/api/jornadas/asignar` para confirmar upsert en `jornada_asignaciones`.

### Referencias
- UI: `app/(dashboard)/hr/horario/fichajes/jornadas-modal.tsx`, `components/onboarding/jornada-step.tsx`
- APIs: `app/api/jornadas/route.ts`, `app/api/jornadas/[id]/route.ts`, `app/api/jornadas/asignar/route.ts`
- BD: `prisma/schema.prisma`, `prisma/migrations/20251208095542_add_jornada_asignaciones/migration.sql`

### Deprecaciones
Los siguientes documentos quedan reemplazados por este resumen unificado:
- `FIX_VALIDACION_SOLAPAMIENTOS_JORNADAS_DIC_8_2025.md`
- `MEJORAS_ERRORES_JORNADAS_DIC_8_2025.md`
- `SOLUCION_JORNADAS_COMPLETA.md`



