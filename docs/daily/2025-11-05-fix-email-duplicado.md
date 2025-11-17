# Fix: Manejo de Emails Duplicados al Crear Empleados

**Fecha:** 2025-11-05  
**Tipo:** Bug Fix + Mejora de UX  
**Módulos:** API Empleados, Componentes de Organización

---

## 🐛 Problema Identificado

### Síntoma
Al intentar crear un empleado subiendo un documento (contrato/DNI), el sistema lanzaba un error 500 genérico cuando el email extraído ya existía en la base de datos:

```
[API Error - API POST /api/empleados] Error: El email ya está en uso
POST /api/empleados 500 in 1489ms
```

### Causa Raíz
1. El endpoint `/api/empleados` (POST) verificaba si el email existía
2. Si existía, devolvía un error genérico sin información adicional
3. El frontend no podía distinguir entre un error genérico y un email duplicado
4. El usuario no recibía información útil ni alternativas

### Flujo Afectado
```
Usuario sube documento → 
IA extrae datos → 
Usuario hace clic "Crear Empleado" → 
API verifica email → 
❌ ERROR 500: "El email ya está en uso"
```

---

## ✅ Solución Implementada

### 1. Backend: Mejora del Endpoint `/api/empleados` (POST)

**Archivo:** `app/api/empleados/route.ts`

**Cambios:**
- ✅ Cambio de código de respuesta: `500` → `409 Conflict` (más semántico para duplicados)
- ✅ Código de error específico: `EMAIL_DUPLICADO` para identificación programática
- ✅ Devolución de información del empleado existente (id, nombre, apellidos, email, activo)
- ✅ Mensaje de error más descriptivo

**Antes:**
```typescript
if (existingUsuario) {
  return handleApiError(
    new Error('El email ya está en uso'),
    'API POST /api/empleados'
  ); // 500 error genérico
}
```

**Después:**
```typescript
if (existingUsuario) {
  return Response.json(
    {
      error: 'El email ya está en uso',
      code: 'EMAIL_DUPLICADO',
      empleadoExistente: existingUsuario.empleado ? {
        id: existingUsuario.empleado.id,
        nombre: existingUsuario.empleado.nombre,
        apellidos: existingUsuario.empleado.apellidos,
        email: existingUsuario.empleado.email,
        activo: existingUsuario.empleado.activo,
      } : null,
    },
    { status: 409 } // 409 Conflict
  );
}
```

### 2. Frontend: Mejora del Manejo de Errores

**Archivos Modificados:**
- `components/organizacion/add-persona-document-form.tsx`
- `components/organizacion/add-persona-manual-form.tsx`

**Mejoras:**
- ✅ Detección del código `EMAIL_DUPLICADO`
- ✅ Mensaje de error contextual con nombre del empleado existente
- ✅ Botón "Ver empleado" en el toast que redirige al perfil del empleado existente
- ✅ Duración extendida del toast (6 segundos) para dar tiempo al usuario a leer y actuar

**Implementación:**
```typescript
if (data.code === 'EMAIL_DUPLICADO' && data.empleadoExistente) {
  const empleado = data.empleadoExistente;
  toast.error(
    `El email ${email} ya está registrado para ${empleado.nombre} ${empleado.apellidos}`,
    {
      duration: 6000,
      action: {
        label: 'Ver empleado',
        onClick: () => {
          window.location.href = `/hr/organizacion/personas/${empleado.id}`;
        },
      },
    }
  );
}
```

---

## 📊 Comparación: Antes vs Después

### Antes ❌
```
Usuario: Sube contrato con email existente
Sistema: "Error al crear empleado" (toast genérico)
Usuario: 🤔 ¿Qué pasó? ¿Por qué falló?
```

### Después ✅
```
Usuario: Sube contrato con email existente
Sistema: "El email juan@empresa.com ya está registrado para Juan Pérez"
         [Ver empleado] (botón clickeable)
Usuario: 👍 Entiendo el problema, puedo ver el empleado existente
```

---

## 🎯 Beneficios

### 1. **Experiencia de Usuario**
- ✅ Mensajes de error claros y accionables
- ✅ Navegación directa al empleado existente
- ✅ Sin frustración por errores genéricos

### 2. **Mantenibilidad**
- ✅ Código HTTP semántico (409 para conflictos)
- ✅ Errores tipados con códigos específicos
- ✅ Fácil extensión para otros casos de duplicados

### 3. **Seguridad**
- ✅ Verificación de pertenencia a la empresa (ya existía)
- ✅ No expone información de empleados de otras empresas
- ✅ Solo devuelve datos básicos del empleado

---

## 🔮 Mejoras Futuras Sugeridas

### Opción 1: Actualización de Datos
Permitir actualizar el empleado existente con los datos extraídos del nuevo documento:
```typescript
// Propuesta
if (data.code === 'EMAIL_DUPLICADO') {
  mostrarModalConfirmacion({
    mensaje: `El email ya existe. ¿Deseas actualizar los datos de ${empleado.nombre}?`,
    opciones: ['Actualizar datos', 'Ver empleado', 'Cancelar']
  });
}
```

### Opción 2: Vinculación de Documentos
Vincular el nuevo documento subido al empleado existente:
```typescript
// Propuesta
if (data.code === 'EMAIL_DUPLICADO') {
  // Opción para vincular el documento subido al empleado existente
  vincularDocumentoAEmpleado(empleado.id, documentoId);
}
```

### Opción 3: Validación Previa
Validar el email antes de extraer datos del documento:
```typescript
// Propuesta
async function validarEmailAntesDeProcesar(email: string) {
  const existe = await fetch(`/api/empleados/validar-email?email=${email}`);
  if (existe) {
    mostrarAdvertencia('Este email ya está registrado');
  }
}
```

---

## 🧪 Testing

### Casos de Prueba
1. ✅ Crear empleado con email nuevo → Éxito
2. ✅ Crear empleado con email duplicado → Error 409 + info empleado
3. ✅ Hacer clic en "Ver empleado" desde toast → Redirige correctamente
4. ✅ Email duplicado desde formulario manual → Manejo correcto
5. ✅ Email duplicado desde documento subido → Manejo correcto

### Probar Manualmente
1. Crear un empleado con email `test@empresa.com`
2. Intentar crear otro empleado con el mismo email (manual o por documento)
3. Verificar que aparece el toast con el nombre del empleado existente
4. Hacer clic en "Ver empleado" y verificar la redirección

---

## 📝 Notas Técnicas

### HTTP Status Codes
- **409 Conflict**: Usado correctamente para indicar que la solicitud no puede completarse debido a un conflicto con el estado actual del recurso
- **500 Internal Server Error**: Reservado para errores inesperados del servidor

### Patrones Aplicados
1. **Respuestas Estructuradas**: Usar objetos con `error`, `code`, y datos adicionales
2. **Códigos de Error Semánticos**: `EMAIL_DUPLICADO`, `VALIDATION_ERROR`, etc.
3. **Información Contextual**: Devolver datos relevantes para que el frontend pueda tomar decisiones

### Seguimiento de Principios del Proyecto
- ✅ **Root Cause Analysis**: Identificado y solucionado el problema raíz
- ✅ **Clean Code**: Código limpio, estructurado y mantenible
- ✅ **Long-term Thinking**: Solución escalable y fácil de extender
- ✅ **System-wide Impact**: Verificadas todas las referencias y dependencias
- ✅ **Code Reuse**: Lógica de manejo de errores aplicada consistentemente

---

## 🔗 Referencias

- Endpoint modificado: `app/api/empleados/route.ts`
- Componentes actualizados:
  - `components/organizacion/add-persona-document-form.tsx`
  - `components/organizacion/add-persona-manual-form.tsx`
- API de extracción: `app/api/documentos/extraer/route.ts` (sin cambios)

---

**Autor:** AI Assistant  
**Revisado por:** [Pendiente]  
**Estado:** ✅ Implementado y Testeado
















