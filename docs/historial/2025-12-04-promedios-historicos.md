# 2025-12-04 – Cuadraje basado en promedios históricos

**Autor**: Equipo de desarrollo – Sofía Roig  
**Visión**: Resumen de la conversación y decisiones para el nuevo flujo de cuadrar fichajes usando promedios históricos.

---

## 🔧 Estado actual

- Se ha creado un módulo dedicado `lib/calculos/fichajes-historico.ts` que calcula promedios de entrada/pausa/salida a partir de los últimos días con eventos registrados del mismo empleado y jornada.
- `app/api/fichajes/cuadrar/route.ts` intenta aplicar ese promedio antes de recurrir al fallback tradicional (horarios fijos/flexibles). Se ajusta la salida si el promedio excede las horas esperadas (`lib/calculos/fichajes-helpers.ts`).
- Se añadió `jornadaId` al modelo `fichajes`, se rellenó en todas las creaciones actuales y se ejecutó un **backfill** para los registros antiguos.
- Se agregó un rate limit de **50 fichajes por request** en la API de cuadrar.
- Hay tests unitarios en `lib/calculos/__tests__/fichajes-historico.test.ts` que cubren validaciones y ajustes de salida.

## 🧠 Decisiones relevantes discutidas

1. **Promedios de “últimos 3 días” vs “últimos 3 del mismo día de la semana”**  
   - Elegimos los últimos 3 días con eventos porque simplifica las queries, responde más rápido en empleados nuevos y siempre tiene datos válidos.  
   - Se mantiene el filtro por `jornadaId` y por registros con eventos reales, por lo que el promedio nunca usa “días vacíos”.

2. **Número de días para el promedio (3 vs 5)**  
   - La lógica ya admite menos de N días: toma los disponibles hasta el límite.  
   - Un límite de 5 suaviza la media; 3 la hace más reactiva.  
   - No hay coste técnico adicional, sólo decidir el valor de `limite`. Hoy se usa 5 para favorecer estabilidad.

3. **Pausas cuando no hay horario fijo**  
   - La API de revisión calcula pausas reales si existen; si no, usa las pausas configuradas o el `descansoMinimo` para imponer duración mínima y recalcular `pausa_inicio/fin` y `salida`.

4. **Procesamiento de múltiples días pendientes**  
   - Cada fichaje se procesa secuencialmente dentro de una transacción.  
   - El promedio histórico se calcula por fichaje, no se reutiliza entre días.
   - El helper sólo mira fichajes anteriores con eventos creados; si no hay suficientes, cae al fallback.

5. **Documento `REVISION_SENIOR_CUADRAJE_HISTORICO.md`**  
   - Se añadió una revisión completa como Senior Developer, con riesgos, métricas y plan de acción.

## ✅ Acciones ya ejecutadas

| Acción | Detalle |
| --- | --- |
| Migración | `prisma/migrations/20251204111828_backfill_jornada_id_fichajes` copia el `jornadaId` de `empleados` a todos los `fichajes` históricos. |
| Rate limit | `MAX_FICHAJES_POR_REQUEST = 50` protege el endpoint de cuadraje. |
| Tests | `npm run test -- fichajes-historico` pasa y cubre secuencias válidas/inválidas y ajustes de salida. |
| Linter | `npx eslint app/api/fichajes/cuadrar/route.ts` sin errores. |

## ⚠️ Riesgos pendientes

1. **Cachear históricos**: el helper se ejecuta por fichaje; si se cuadran muchos días del mismo empleado, se podrían cachear los resultados para evitar queries repetidos. Se deja para futuras iteraciones.  
2. **Rate limiting global**: el guard es sencillo y protege la transacción, pero se puede reforzar si el flujo se expone a integraciones externas.  
3. **Monitorización**: se recomienda revisar logs `[Cuadrar Histórico]` durante los primeros despliegues para detectar secuencias no válidas.

## 📦 Próximos pasos sugeridos

1. Documentar el nuevo flujo en la guía interna de HR (si no se ha hecho ya).  
2. Preparar notas para QA con ejemplos de cuadrar con 0, 2 y 5 días históricos.  
3. Observar métricas de tiempo de respuesta en `POST /api/fichajes/cuadrar` una vez el feature esté activo en producción.

---

*Fin del resumen.*


