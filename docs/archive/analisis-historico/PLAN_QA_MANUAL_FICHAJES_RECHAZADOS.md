# Plan de QA Manual: Sistema de Fichajes Rechazados

## ✅ Resumen Ejecutivo

Este documento describe las pruebas manuales necesarias para validar completamente la funcionalidad de **fichajes rechazados** antes de deploy a producción.

**Tiempo estimado**: 30-45 minutos
**Rol requerido**: HR Admin + Empleado (2 usuarios diferentes)

---

## 🎯 Objetivos de las Pruebas

1. Validar que fichajes rechazados son **inmutables** (no se pueden editar)
2. Verificar flujos **simétricos bidireccionales** (Empleado ↔ HR)
3. Confirmar que **CRONs** omiten fichajes rechazados
4. Validar **optimistic locking** (no race conditions)
5. Verificar **frontend** muestra estados correctamente

---

## 📋 Escenarios de Prueba

### **Test 1: Empleado Edita Fichaje → Solicitud Optimista Creada**

**Precondiciones:**
- Tener un fichaje del día anterior con eventos (entrada, salida)
- Estar logueado como **Empleado**

**Pasos:**
1. Ir a "Mi Espacio" → "Fichajes"
2. Click en "Editar fichaje" del fichaje de ayer
3. Modificar la hora de entrada (ej: cambiar de 9:00 a 9:30)
4. Click "Guardar cambios"

**Resultado Esperado:**
- ✅ Toast: "Fichaje actualizado. Pendiente de aprobación de HR."
- ✅ Cambio se aplica **inmediatamente** en la tabla
- ✅ **No** aparece badge de "editado" hasta que HR apruebe
- ✅ En bandeja de entrada de HR aparece notificación de revisión pendiente

**Verificación en DB:**
```sql
-- Verificar que existe la solicitud
SELECT * FROM solicitudes_correccion_fichaje
WHERE estado = 'pendiente'
ORDER BY created_at DESC LIMIT 1;

-- Verificar detalles de auditoría
SELECT detalles FROM solicitudes_correccion_fichaje WHERE id = '<SOLICITUD_ID>';
-- Debe contener: origen: 'edicion_empleado'
```

---

### **Test 2: HR Rechaza Edición de Empleado → Fichaje Congelado**

**Precondiciones:**
- Completar Test 1 (tener solicitud pendiente de empleado)
- Estar logueado como **HR Admin**

**Pasos:**
1. Ir a "Horario" → "Fichajes"
2. Buscar la solicitud pendiente en bandeja de entrada
3. Click "Rechazar"
4. Escribir motivo: "Horario no coincide con registro de cámaras"
5. Confirmar rechazo

**Resultado Esperado:**
- ✅ Fichaje queda marcado con badge **"Rechazado"** (rojo)
- ✅ Los cambios del empleado **NO se revierten** (quedan aplicados)
- ✅ Fichaje **congelado**: no se puede editar
- ✅ Empleado recibe notificación del rechazo

**Verificación en DB:**
```sql
-- Verificar estado del fichaje
SELECT estado FROM fichajes WHERE id = '<FICHAJE_ID>';
-- Debe ser: 'rechazado'

-- Verificar solicitud
SELECT estado, respuesta FROM solicitudes_correccion_fichaje WHERE id = '<SOLICITUD_ID>';
-- estado: 'rechazada'
```

**Verificación Frontend:**
1. Como **Empleado**, ir a "Mi Espacio" → "Fichajes"
2. Intentar editar el fichaje rechazado
3. **Resultado esperado**: Toast error "Este fichaje fue rechazado y no se puede editar"

---

### **Test 3: HR Edita Fichaje de Empleado**

**Precondiciones:**
- Tener un fichaje normal (no rechazado)
- Estar logueado como **HR Admin**

**Pasos:**
1. Ir a "Horario" → "Fichajes"
2. Click en "Editar fichaje" de un empleado
3. Modificar hora de salida
4. Escribir motivo: "Corrección según registro de acceso"
5. Guardar cambios

**Resultado Esperado:**
- ✅ Cambio se aplica **inmediatamente**
- ✅ Se crea notificación para el empleado
- ✅ Empleado tiene **48 horas** para rechazar la edición

**Verificación en DB:**
```sql
-- Verificar edición pendiente
SELECT * FROM ediciones_fichaje_pendientes
WHERE estado = 'pendiente'
ORDER BY created_at DESC LIMIT 1;

-- Verificar que expira_en es aprox 48h en el futuro
SELECT expira_en FROM ediciones_fichaje_pendientes WHERE id = '<EDICION_ID>';
```

---

### **Test 4: Empleado Rechaza Edición de HR → Revierte y Congela**

**Precondiciones:**
- Completar Test 3 (HR editó un fichaje)
- Estar logueado como **Empleado**

**Pasos:**
1. Ver notificación "HR ha editado tu fichaje"
2. Click "Ver edición"
3. Click "Rechazar edición"
4. Confirmar rechazo

**Resultado Esperado:**
- ✅ Cambios de HR se **revierten** (vuelven al estado original)
- ✅ Fichaje queda **congelado** (estado = 'rechazado')
- ✅ HR recibe notificación del rechazo
- ✅ Badge "Rechazado" visible en la tabla

**Verificación en DB:**
```sql
-- Verificar reversión de eventos
SELECT hora, editado FROM fichaje_eventos WHERE fichaje_id = '<FICHAJE_ID>' ORDER BY hora;
-- Las horas deben ser las originales, editado = false

-- Verificar congelación
SELECT estado FROM fichajes WHERE id = '<FICHAJE_ID>';
-- Debe ser: 'rechazado'

-- Verificar edición marcada como rechazada
SELECT estado, rechazado_en FROM ediciones_fichaje_pendientes WHERE id = '<EDICION_ID>';
```

---

### **Test 5: Validación de Inmutabilidad → Intentar Editar Fichaje Rechazado**

**Precondiciones:**
- Tener un fichaje con estado 'rechazado' (de Test 2 o Test 4)

**Sub-test 5.1: Desde Widget de Empleado**
1. Como **Empleado**, ir a dashboard
2. En el widget de fichaje, click "Editar fichaje" del día rechazado
3. **Resultado esperado**: Toast error "Este fichaje fue rechazado y no se puede editar"

**Sub-test 5.2: Desde Modal (botón "Completar descanso")**
1. Si el fichaje rechazado tenía descanso incompleto
2. Intentar completar descanso desde el diálogo
3. **Resultado esperado**: Validación bloquea la edición

**Sub-test 5.3: Desde Tabla de HR**
1. Como **HR Admin**, ir a "Horario" → "Fichajes"
2. Filtrar por estado "Rechazado"
3. Intentar editar un fichaje rechazado
4. **Resultado esperado**: Error "Este fichaje fue rechazado y no se puede editar"

**Sub-test 5.4: Desde API (curl)**
```bash
# Obtener ID de un fichaje rechazado
curl http://localhost:3000/api/fichajes?estado=rechazado \
  -H "Cookie: <session-cookie>"

# Intentar editarlo
curl -X POST http://localhost:3000/api/fichajes/editar-batch \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "fichajeId": "<FICHAJE_RECHAZADO_ID>",
    "cambios": [{"accion": "crear", "tipo": "entrada", "hora": "2024-01-01T09:00:00Z"}],
    "motivo": "Test"
  }'

# Resultado esperado: 400 Bad Request
# { "error": "Este fichaje fue rechazado y no se puede editar" }
```

---

### **Test 6: Cuadrar Fichajes Ignora Rechazados**

**Precondiciones:**
- Tener fichajes pendientes de cuadrar
- Tener al menos 1 fichaje con estado 'rechazado'
- Estar logueado como **HR Admin**

**Pasos:**
1. Ir a "Horario" → "Cuadrar Fichajes"
2. Seleccionar rango de fechas que incluya fichajes rechazados
3. Observar lista de fichajes pendientes
4. Seleccionar "todos" y click "Cuadrar seleccionados"

**Resultado Esperado:**
- ✅ Fichajes rechazados **NO aparecen** en la lista para cuadrar
- ✅ Al intentar cuadrar (si forzamos via API), muestra error:
  - "Fichaje rechazado por discrepancia, no se puede cuadrar"
- ✅ Solo se cuadran fichajes con estado 'pendiente'

**Verificación en logs del servidor:**
```bash
# Verificar que los fichajes rechazados fueron saltados
grep "rechazado (congelado), saltando" <LOG_FILE>
```

---

### **Test 7: CRONs Omiten Fichajes Rechazados**

**Test 7.1: CRON Clasificar Fichajes**

**Pasos:**
1. Crear un fichaje rechazado del día anterior (sin cerrar)
2. Ejecutar CRON manualmente:
```bash
curl -X POST http://localhost:3000/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Resultado Esperado:**
- ✅ Fichaje rechazado **NO es procesado**
- ✅ Log muestra: "Fichaje <ID> está rechazado (congelado), omitiendo"
- ✅ Otros fichajes normales sí se procesan

**Test 7.2: CRON Revisar Solicitudes (Auto-aprobación)**

**Pasos:**
1. Crear una solicitud pendiente con fichaje rechazado
2. Modificar `created_at` a hace 50 horas (para que sea elegible):
```sql
UPDATE solicitudes_correccion_fichaje
SET created_at = NOW() - INTERVAL '50 hours'
WHERE id = '<SOLICITUD_ID>';
```
3. Ejecutar CRON:
```bash
curl -X POST http://localhost:3000/api/cron/revisar-solicitudes \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Resultado Esperado:**
- ✅ Solicitud **NO es auto-aprobada**
- ✅ Log muestra: "Solicitud <ID> omitida: fichaje rechazado"
- ✅ Solicitud permanece en estado 'pendiente'

**Test 7.3: CRON Aprobar Ediciones Expiradas**

**Pasos:**
1. Crear edición pendiente de HR sobre fichaje rechazado
2. Modificar `expira_en` al pasado:
```sql
UPDATE ediciones_fichaje_pendientes
SET expira_en = NOW() - INTERVAL '1 hour'
WHERE id = '<EDICION_ID>';
```
3. Ejecutar CRON:
```bash
curl -X GET http://localhost:3000/api/cron/aprobar-ediciones-expiradas \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Resultado Esperado:**
- ✅ Edición **NO es auto-aprobada**
- ✅ Log muestra: "Edición <ID> omitida: fichaje rechazado"

---

### **Test 8: Optimistic Locking → Race Condition CRON vs HR**

**Setup:**
1. Crear solicitud pendiente del empleado (hace 49 horas para que esté cerca del límite)
2. Tener terminal con CRON listo para ejecutar
3. Tener navegador con HR Admin listo para aprobar

**Pasos (requiere coordinación de timing):**
1. **T=0s**: HR click "Aprobar" en la solicitud
2. **T=0.5s**: Ejecutar CRON revisar-solicitudes

**Resultado Esperado:**
- ✅ Solo **una** de las dos operaciones actualiza la solicitud
- ✅ La segunda operación detecta que `estado != 'pendiente'` y hace skip
- ✅ Log del CRON muestra: "Solicitud <ID> ya fue procesada por otro proceso, omitiendo"
- ✅ **No se lanzan errores** (graceful handling)
- ✅ Estado final consistente: 'aprobada' con `revisadaPor = HR_EMPLEADO_ID`

**Verificación en DB:**
```sql
SELECT estado, revisada_por, revisada_en
FROM solicitudes_correccion_fichaje
WHERE id = '<SOLICITUD_ID>';

-- Debe tener:
-- estado: 'aprobada'
-- revisada_por: '<HR_EMPLEADO_ID>' (no NULL del CRON)
-- revisada_en: timestamp coherente
```

---

## 🎨 Verificación de Frontend

### **Checklist de UI:**

**Dashboard HR (Tabla de Fichajes):**
- [ ] Filtro incluye opción "Rechazado"
- [ ] Badge rojo con texto "Rechazado" se muestra correctamente
- [ ] Click en badge no abre modal de edición
- [ ] Tooltip explica por qué está rechazado

**Dashboard Empleado (Mi Espacio → Fichajes):**
- [ ] Fichajes rechazados se muestran con indicador visual
- [ ] Click "Editar fichaje" muestra toast de error
- [ ] No se puede abrir modal de edición

**Widget de Fichaje:**
- [ ] Botón "Editar fichaje" valida estado antes de abrir modal
- [ ] Toast error claro cuando fichaje está rechazado

**Bandeja de Entrada:**
- [ ] Notificaciones de solicitudes rechazadas tienen icono y color distintivo
- [ ] Click en notificación navega al fichaje correspondiente

---

## 📊 Métricas de Éxito

✅ **100% de los tests pasan**
✅ **Cero errores en consola del navegador**
✅ **Cero errores en logs del servidor**
✅ **Fichajes rechazados permanecen inmutables en todos los flujos**
✅ **Optimistic locking previene race conditions**
✅ **Frontend responde correctamente en todos los estados**

---

## 🐛 Reporte de Bugs

Si encuentras algún problema durante las pruebas, documenta:

1. **Escenario**: Test X, paso Y
2. **Esperado**: [Comportamiento esperado]
3. **Obtenido**: [Comportamiento actual]
4. **Logs**: [Extracto de logs del servidor]
5. **Screenshot**: [Captura de pantalla si aplica]
6. **DB State**: [Resultado de queries de verificación]

---

## 🚀 Conclusión

Una vez completados **todos** los tests con éxito:

1. ✅ Funcionalidad validada para producción
2. ✅ Invariantes garantizadas
3. ✅ Sin race conditions
4. ✅ UX correcta
5. ✅ Ready to deploy 🎉

---

**Última actualización**: 2025-12-10
**Versión**: 1.0.0
**Autor**: Claude Sonnet 4.5 (QA Automatizado)
