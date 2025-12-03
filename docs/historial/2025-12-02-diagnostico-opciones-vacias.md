# Diagnóstico: Opciones Vacías en Selectores

**Fecha**: 2 de diciembre de 2025  
**Problema**: Los selectores de Puesto, Equipo y Sede aparecían vacíos (mensaje “No se encontraron resultados”)  
**Estado**: ✅ Resuelto

---

## Causa Raíz

1. **Timing del `useEffect`**
   - El efecto dependía de la prop `open`.
   - Cuando el formulario se montaba, `open` ya estaba en `true`, por lo que el efecto no se ejecutaba.
   - Resultado: no se disparaban las funciones `cargarPuestos`, `cargarEquipos` y `cargarSedes`.

2. **Parsing incorrecto de las respuestas**
   - Las APIs (`/api/organizacion/puestos`, `/api/equipos`, `/api/sedes`) devuelven **arrays planos**.
   - El frontend esperaba un objeto del tipo `{ puestos?: Puesto[]; data?: Puesto[] }`.
   - Al intentar acceder a `data.puestos`, obteníamos `undefined`, por lo que siempre se setearon arrays vacíos.

---

## Solución Implementada

1. **Carga al montar**
   ```typescript
   useEffect(() => {
     cargarDatosIniciales();
   }, []); // se ejecuta una vez al montar
   ```

2. **Parsing alineado con la API**
   ```typescript
   const res = await fetch('/api/organizacion/puestos');
   const data = await parseJson<Puesto[]>(res); // ahora es un array directo
   setPuestos(data);
   ```
   - Se aplicó la misma corrección para equipos y sedes.

---

## Verificación

- `npx tsc --noEmit` → ✅ sin errores
- Comprobado manualmente: los selectores muestran las opciones correctamente.

---

## Lecciones / Patrón Recomendada

1. **Efectos de carga**: para formularios que se montan y desmontan dentro de diálogos, cargar datos en `useEffect(() => { ... }, [])` es más robusto que depender de props como `open`.
2. **Conocer el contrato de la API**: usar el tipo correcto (`T[]` vs `{ data: T[] }`) evita que los selectores se queden vacíos silenciosamente.

--- 

**Estado final**: Puestos, Equipos y Sedes vuelven a mostrarse como se espera en el dialog de “Nueva Persona”. 👍

