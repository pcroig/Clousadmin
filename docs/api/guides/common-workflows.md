# Guías de Uso Comunes - API Clousadmin

**Última actualización:** 27 de enero de 2025  
**Estado:** Boceto con los flujos más solicitados.

---

## Flujos Cubiertos (en construcción)

1. **Alta de empleado**  
   1. `POST /api/empleados`  
   2. `POST /api/empleados/{id}/avatar` (opcional)  
   3. `POST /api/empleados/invitar` (enviar invitación)

2. **Solicitud y aprobación de ausencia**  
   1. `POST /api/ausencias`  
   2. `PATCH /api/ausencias/{id}` (aprobación/rechazo)

3. **Registro de fichaje manual**  
   1. `POST /api/fichajes`  
   2. `POST /api/fichajes/correccion` (si aplica)

---

## Próximos Pasos

- Documentar respuestas completas para cada flujo.
- Añadir ejemplos en diferentes lenguajes en `docs/api/examples/`.


