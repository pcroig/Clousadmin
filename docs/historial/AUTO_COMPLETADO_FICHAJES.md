# 📋 Auto-completado de Fichajes - Especificación y Testing

**Fecha**: Noviembre 2025  
**Estado**: Implementado y funcional

---

## 📊 Resumen

Sistema de clasificación y auto-completado automático de fichajes incompletos, ejecutado cada noche mediante AWS EventBridge. Utiliza reglas determinísticas (sin IA) para clasificar fichajes y aplicar auto-completados o solicitar revisión manual de HR.

**Nota**: Este documento consolida la especificación y guía de testing del sistema de auto-completado de fichajes.

---

## 🏗️ Arquitectura

### Clasificador (`lib/ia/clasificador-fichajes.ts`)

**Responsabilidad:** Analizar fichajes incompletos y clasificarlos en dos categorías:
- **Auto-completar**: Fichajes que cumplen criterios predecibles
- **Revisión manual**: Fichajes con patrones irregulares

### Reglas de Clasificación

| Escenario | Criterio | Acción |
|-----------|----------|--------|
| Pausa sin cerrar | `pausa_inicio` sin `pausa_fin` | ❌ Revisión manual |
| Sin entrada | No hay `entrada` registrada | ❌ Revisión manual |
| Sin salida (>8h) | `entrada` sin `salida`, transcurrieron ≥8h | ✅ Auto-completar |
| Sin salida (<8h) | `entrada` sin `salida`, transcurrieron <8h | ⏳ No clasificar (aún trabajando) |

### Lógica de Auto-completado

1. **Con Jornada Fija:**
   - Usa la hora de salida configurada en la jornada del empleado
   - Ejemplo: Jornada 09:00-18:00 → Salida sugerida: 18:00

2. **Con Jornada Flexible:**
   - Calcula `horasPorDia = horasSemanales / 5`
   - Suma `horasPorDia` a la hora de entrada
   - Ejemplo: 40h semanales = 8h/día → Entrada 09:15 → Salida 17:15

3. **Sin Jornada Definida:**
   - Asume 8 horas por defecto
   - Ejemplo: Entrada 09:30 → Salida 17:30

---

## 🧪 Testing

### Datos Sintéticos Creados

El seed crea **4 casos de prueba** para diferentes escenarios:

| Empleado | Caso | Fichajes Creados | Resultado Esperado |
|----------|------|------------------|-------------------|
| **Admin** (1°) | Sin salida | `entrada 09:00` | **Auto-completar**: Se creará salida porque transcurrieron >8h |
| **Ana** (2°) | Pausa sin cerrar | `entrada 08:30`, `pausa_inicio 13:00` | **Revisión manual**: Falta pausa_fin y salida |
| **Carlos** (3°) | Jornada completa | `entrada 09:15`, `pausa_inicio 13:30`, `pausa_fin 14:15`, `salida 18:00` | **No procesar**: Jornada ya completa |
| **Laura** (4°) | Sin entrada | `salida 17:00` | **Revisión manual**: Falta fichaje de entrada |

> **Nota:** Los fichajes se crean en días anteriores a hoy (ayer - 3 días), para que el clasificador los procese.

### Pasos para Probar

1. **Ejecutar el Seed** (si no lo has hecho)
   ```bash
   npx prisma db seed
   ```

2. **Iniciar el Servidor**
   ```bash
   npm run dev
   ```

3. **Loggear como HR Admin**
   - URL: http://localhost:3001
   - Email: `admin@clousadmin.com`
   - Password: `Admin123!`

4. **Ejecutar Clasificador Manualmente**
   ```javascript
   fetch('/api/fichajes/clasificar', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ fecha: '2025-11-01' }) // Ajustar fecha
   });
   ```

5. **Verificar Resultados**
   - Dashboard HR: Widget "Auto-completados" mostrará fichajes procesados
   - Bandeja de entrada: Tab "Auto-completed" mostrará elementos clasificados

---

## 📝 Notas Técnicas

- El sistema está diseñado para soportar 3 tipos de auto-completado:
  1. **Fichajes** (implementado) - Documentado en este archivo
  2. **Ausencias** (por implementar) - Seguirá arquitectura similar
  3. **Solicitudes** (por implementar) - Seguirá arquitectura similar

- El widget `AutoCompletadoWidget` en el dashboard HR muestra las 3 categorías de forma horizontal.

---

**Nota**: Para información actualizada sobre el sistema de auto-completado, consultar `docs/funcionalidades/fichajes.md` o el código actual en `lib/ia/clasificador-fichajes.ts`.










