# Solución: Límites de Fichaje y CRONs

## 🔍 Problemas Identificados

### 1. **Eventos después del límite superior permitidos**
- **Estado actual**: La validación solo previene NUEVOS fichajes, pero si alguien ya fichó entrada antes del límite, puede seguir fichando después
- **Impacto**: Eventos registrados a las 23:17, 23:36, 23:43 cuando el límite es 21:00

### 2. **Fichajes en_curso no se cierran automáticamente**
- **Estado actual**: Fichajes quedan en_curso indefinidamente si el CRON no ejecuta
- **Impacto**: Fichajes del 10/12 aún en_curso el 11/12

### 3. **CRON clasificar-fichajes no ejecutó**
- **Estado actual**: No hay evidencia de ejecución en las últimas 24h
- **Impacto**: Fichajes del día anterior no se cerraron

### 4. **Cálculo de horas NO respeta límites**
- **Estado actual**: `calcularHorasTrabajadas()` suma horas sin considerar límites
- **Impacto**: Si alguien ficha entrada a 07:00 y salida a 23:00, cuenta 16h en lugar de máximo hasta 21:00 (14h)

---

## ✅ Solución Propuesta

### **Parte 1: Validación de Límites en POST /api/fichajes** ✅ (YA EXISTE)

Código actual (líneas 460-469 de `route.ts`):
```typescript
if (empresaConfig?.limiteInferiorFichaje || empresaConfig?.limiteSuperiorFichaje) {
  const horaFichaje = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

  if (empresaConfig.limiteInferiorFichaje && horaFichaje < empresaConfig.limiteInferiorFichaje) {
    return badRequestResponse(`No puedes fichar antes de ${empresaConfig.limiteInferiorFichaje}`);
  }
  if (empresaConfig.limiteSuperiorFichaje && horaFichaje > empresaConfig.limiteSuperiorFichaje) {
    return badRequestResponse(`No puedes fichar después de ${empresaConfig.limiteSuperiorFichaje}`);
  }
}
```

**Estado**: ✅ CORRECTO - Previene fichajes fuera de límites

---

### **Parte 2: NUEVO - Auto-cierre al exceder límite superior**

**Propuesta conservadora** (sin añadir eventos fantasma):

1. Cuando pase el `limiteSuperiorFichaje`, cambiar fichaje de `en_curso` → `pendiente`
2. **NO añadir evento de salida** automático
3. HR debe cuadrar manualmente con eventos propuestos

**Implementación**:
- Nuevo CRON job: `cerrar-fichajes-excedidos` (ejecuta cada hora)
- Busca fichajes `en_curso` donde el último evento sea > `limiteSuperiorFichaje`
- Cambia estado a `pendiente`

**Ventajas**:
- No inventa datos (no crea eventos falsos)
- Compatible con lógica de cuadrar existente
- HR tiene visibilidad y control

**Desventajas**:
- Requiere acción manual de HR
- Fichaje queda en `pendiente` hasta que HR cuadre

---

### **Parte 3: Modificar cálculo de horas para respetar límites**

Modificar `calcularHorasTrabajadas()` para aceptar límites opcionales:

```typescript
export function calcularHorasTrabajadas(
  eventos: FichajeEvento[],
  options?: {
    limiteSuperior?: string; // "21:00"
    limiteInferior?: string; // "07:00"
    fechaFichaje?: Date; // Para construir límites absolutos
  }
): number | null {
  // ... código existente ...

  // NUEVO: Si hay límites, capar las horas
  if (options?.limiteSuperior && options?.fechaFichaje) {
    const [hours, minutes] = options.limiteSuperior.split(':').map(Number);
    const limiteSup = new Date(options.fechaFichaje);
    limiteSup.setHours(hours, minutes, 0, 0);

    // Ajustar eventos que excedan el límite
    // (truncar tiempos trabajados después del límite)
  }

  return Math.round(horasTotales * 100) / 100;
}
```

**Dónde usar**:
1. Al cuadrar fichajes: pasar límites de empresa
2. Al calcular en CRON: pasar límites
3. En actualizarCalculosFichaje: obtener límites y pasar

---

### **Parte 4: CRÍTICO - Arreglar CRONs en Producción**

**Diagnóstico necesario en Hetzner**:

```bash
# SSH a servidor de producción
ssh root@<IP_HETZNER>

# Verificar crontab
crontab -l | grep clousadmin

# Verificar logs
tail -100 /var/log/clousadmin-cron.log

# Ver últimas ejecuciones de cron
grep CRON /var/log/syslog | tail -20
```

**Posibles causas**:
1. Crontab no instalado correctamente
2. `APP_URL` o `CRON_SECRET` incorrectos
3. Servidor apagado/reiniciado y crontab perdido
4. Permisos de archivo de log

**Solución**:
```bash
# Re-instalar crons
cd /opt/clousadmin
export APP_URL="https://app.clousadmin.com"  # O la URL correcta
export CRON_SECRET="<secret>"
./scripts/hetzner/setup-cron.sh
```

---

## 🔧 Plan de Implementación

### Fase 1: URGENTE - Arreglar CRONs (AHORA)
1. Diagnosticar por qué CRON no ejecutó
2. Re-instalar crontab en Hetzner
3. Verificar ejecución manual
4. Monitorear logs

### Fase 2: Cerrar fichajes pendientes actuales (AHORA)
1. Script manual para cerrar fichajes en_curso del 10/12
2. Ejecutar CRON manualmente: `curl -X POST https://app.clousadmin.com/api/cron/clasificar-fichajes -H "Authorization: Bearer <SECRET>"`

### Fase 3: Implementar auto-cierre por límite superior (HOY)
1. Crear CRON `cerrar-fichajes-excedidos`
2. Modificar `calcularHorasTrabajadas` para respetar límites
3. Testing exhaustivo

### Fase 4: Verificación y Monitoreo (MAÑANA)
1. Verificar que CRONs ejecutan correctamente
2. Monitorear fichajes en_curso
3. Validar que no hay nuevos fichajes fuera de límites

---

## 📝 Archivos a Modificar

1. **app/api/cron/cerrar-fichajes-excedidos/route.ts** (NUEVO)
2. **lib/calculos/fichajes.ts** - Función `calcularHorasTrabajadas`
3. **app/api/fichajes/cuadrar/route.ts** - Pasar límites al calcular
4. **scripts/hetzner/setup-cron.sh** - Añadir nuevo CRON
5. **vercel.json** - (NO, los CRONs van en Hetzner)

---

## ⚠️ Consideraciones Importantes

### NO romper lógica de cuadrar
- La lógica actual de cuadrar fichajes asume que puede proponer eventos
- Si cambiamos a `pendiente`, HR debe poder cuadrar normalmente
- Los eventos propuestos deben respetar los límites

### Compatibilidad con fichajes rechazados
- Fichajes rechazados NO deben ser procesados por el nuevo CRON
- Mantener validación `if (fichaje.estado === 'rechazado') continue`

### Transición gradual
- No modificar fichajes históricos
- Solo aplicar límites a fichajes nuevos/actuales
- Documentar cambios para HR

---

## 🧪 Testing

1. **Test límite inferior**: Intentar fichar a las 06:00 → debe rechazar
2. **Test límite superior**: Intentar fichar a las 22:00 → debe rechazar
3. **Test auto-cierre**: Fichaje en_curso a las 21:30 → debe pasar a pendiente
4. **Test cálculo**: Fichaje 07:00-23:00 → debe contar solo hasta 21:00
5. **Test cuadrar**: Fichaje pendiente con eventos fuera de límites → debe ajustar

---

## 📊 Métricas de Éxito

- ✅ 0 fichajes en_curso de días anteriores
- ✅ 0 eventos después del límite superior
- ✅ CRONs ejecutan cada noche
- ✅ Horas trabajadas respetan límites
- ✅ Cuadrar fichajes funciona correctamente
