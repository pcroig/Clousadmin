# Onboarding de Empleados con Gestión de Documentos

## 📋 Visión General

El sistema de onboarding permite a HR crear nuevos empleados y activar un proceso de onboarding automatizado. **Ahora incluye la funcionalidad de subir documentos iniciales** durante la creación del empleado, conectados directamente al proceso de onboarding.

---

## 🎯 Flujo Completo

### 1. **HR Crea Empleado y Activa Onboarding**

**Ubicación:** `/hr/organizacion/personas` → "Añadir Persona" → Tab "Activar Onboarding"

**Pasos:**
1. HR completa los datos básicos del empleado (nombre, apellidos, email, fecha de alta, puesto)
2. **Opcional:** HR puede subir documentos iniciales (contrato, DNI, nómina, etc.)
3. HR hace clic en "Crear y Enviar Onboarding"
4. El sistema:
   - Crea el empleado (inactivo)
   - Crea el registro de onboarding con token único
   - Sube los documentos a las carpetas de onboarding
   - Envía email al empleado con link de onboarding

### 2. **Empleado Completa Onboarding**

**Ubicación:** `/onboarding/[token]`

**Pasos del empleado:**
1. **Paso 0 - Credenciales:** Establece contraseña y sube avatar (opcional)
2. **Paso 1 - Datos Personales:** Completa NIF, NSS, dirección, etc.
3. **Paso 2 - Datos Bancarios:** Completa IBAN y titular de cuenta
4. **Paso 3 - Documentos:** Puede subir documentos adicionales o ver los ya subidos por HR
5. **Finalizar:** Traspasa todos los datos a los registros permanentes y activa el empleado

---

## 📁 Gestión de Documentos

### Carpetas Automáticas

El sistema crea automáticamente carpetas organizadas:

#### Para HR (Carpetas Compartidas)
- `Onboarding - {nombreDocumento}` - Carpeta compartida por tipo de documento
- Ejemplo: `Onboarding - Contrato`, `Onboarding - DNI/NIE`

#### Para Empleado (Carpetas Personales)
- `Onboarding/` - Carpeta principal de onboarding del empleado
  - `{nombreDocumento}/` - Subcarpeta por tipo de documento
    - Documentos subidos

### Tipos de Documentos Soportados

- **contrato** - Contratos laborales
- **dni** - DNI/NIE
- **nomina** - Nóminas
- **medico** - Certificados médicos
- **otro** - Otros documentos

### Formatos Aceptados

- PDF (`application/pdf`)
- Imágenes JPEG (`image/jpeg`, `image/jpg`)
- Imágenes PNG (`image/png`)
- **Tamaño máximo:** 5MB por archivo

---

## 🔌 API Endpoints

### 1. Subir Documento de Onboarding (HR)

**Endpoint:** `POST /api/empleados/[id]/onboarding/documentos`

**Autenticación:** Requiere rol `hr_admin`

**Request:**
```typescript
FormData {
  file: File;
  nombreDocumento: string; // Ej: "Contrato laboral"
  tipoDocumento: string;  // Ej: "contrato", "dni", "nomina", "medico", "otro"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Documento subido correctamente",
  "documento": {
    "id": "uuid",
    "nombre": "Contrato laboral",
    "tipoDocumento": "contrato",
    "s3Key": "onboarding/{empresaId}/{empleadoId}/contrato-{timestamp}-{random}.pdf",
    "downloadUrl": "https://...",
    ...
  }
}
```

### 2. Listar Documentos de Onboarding (HR)

**Endpoint:** `GET /api/empleados/[id]/onboarding/documentos`

**Autenticación:** Requiere rol `hr_admin`

**Response:**
```json
{
  "success": true,
  "documentos": [
    {
      "id": "uuid",
      "nombre": "Contrato laboral",
      "tipoDocumento": "contrato",
      "downloadUrl": "https://...",
      ...
    }
  ],
  "carpeta": {
    "id": "uuid",
    "nombre": "Onboarding",
    ...
  }
}
```

### 3. Subir Documento de Onboarding (Empleado)

**Endpoint:** `POST /api/onboarding/[token]/documentos`

**Autenticación:** Token de onboarding (válido por 7 días)

**Request:** Mismo formato que HR endpoint

**Response:** Mismo formato que HR endpoint

### 4. Listar Documentos de Onboarding (Empleado)

**Endpoint:** `GET /api/onboarding/[token]/documentos`

**Autenticación:** Token de onboarding

**Response:** Mismo formato que HR endpoint

---

## 🏗️ Arquitectura

### Componentes Frontend

#### `AddPersonaOnboardingForm`
- **Ubicación:** `components/organizacion/add-persona-onboarding-form.tsx`
- **Funcionalidad:**
  - Formulario para crear empleado
  - Selector de tipo de documento
  - Uploader de documentos (usando `DocumentUploader`)
  - Lista de documentos pendientes
  - Subida automática de documentos después de crear empleado

#### `DocumentUploader`
- **Ubicación:** `components/shared/document-uploader.tsx`
- **Funcionalidad:** Componente reutilizable para subir archivos

#### `DocumentList`
- **Ubicación:** `components/shared/document-list.tsx`
- **Funcionalidad:** Componente para mostrar lista de documentos

### Backend

#### `lib/documentos/onboarding.ts`
- **Funciones principales:**
  - `crearCarpetasOnboardingDocumento()` - Crea carpetas automáticamente
  - `subirDocumentoOnboarding()` - Sube documento y lo guarda en BD
  - `listarDocumentosOnboarding()` - Lista documentos de onboarding
  - `validarDocumentosRequeridosCompletos()` - Valida documentos requeridos

#### `lib/onboarding.ts`
- **Funciones relacionadas:**
  - `guardarProgresoDocumentos()` - Actualiza progreso cuando se suben documentos
  - `finalizarOnboarding()` - Valida documentos requeridos antes de finalizar

---

## 🔄 Flujo de Datos

### Cuando HR Sube Documento

```
1. HR selecciona archivo y tipo de documento
2. Frontend → POST /api/empleados/[id]/onboarding/documentos
3. Backend valida:
   - Empleado existe y pertenece a la empresa
   - Onboarding activo existe
   - Archivo válido (tipo, tamaño)
4. Backend:
   - Sube archivo a S3
   - Crea/obtiene carpetas de onboarding
   - Guarda documento en BD
   - Valida documentos requeridos
   - Actualiza progreso si todos los requeridos están completos
5. Frontend muestra confirmación
```

### Cuando Empleado Sube Documento

```
1. Empleado selecciona archivo y tipo de documento
2. Frontend → POST /api/onboarding/[token]/documentos
3. Backend valida:
   - Token válido y no expirado
   - Onboarding no completado
   - Archivo válido
4. Backend: (mismo proceso que HR)
5. Frontend actualiza lista de documentos
```

---

## ✅ Validaciones

### Documentos Requeridos

El sistema valida automáticamente si todos los documentos requeridos están completos:

1. HR configura documentos requeridos en `OnboardingConfig`
2. Al subir un documento, se valida si todos los requeridos están completos
3. Si están completos, se actualiza automáticamente el progreso: `datos_documentos: true`
4. Al finalizar onboarding, se valida nuevamente que todos los requeridos estén subidos

### Validaciones de Archivo

- **Tipo:** Solo PDF, JPEG, PNG
- **Tamaño:** Máximo 5MB
- **Nombre:** Validado para evitar caracteres especiales
- **Duplicados:** Permitidos (mismo tipo puede tener múltiples versiones)

---

## 📊 Progreso de Onboarding

El progreso se almacena en `OnboardingEmpleado.progreso`:

```json
{
  "credenciales_completadas": boolean,
  "datos_personales": boolean,
  "datos_bancarios": boolean,
  "datos_documentos": boolean  // Se actualiza automáticamente cuando todos los requeridos están completos
}
```

---

## 🔐 Seguridad

### Permisos

- **HR Admin:** Puede subir documentos para cualquier empleado de su empresa
- **Empleado:** Solo puede subir documentos durante su propio onboarding (con token válido)

### Validaciones

- Verificación de pertenencia a empresa
- Verificación de token de onboarding (válido, no expirado, no completado)
- Validación de tipos de archivo y tamaños
- Sanitización de nombres de archivo

---

## 🐛 Troubleshooting

### Error: "El empleado no tiene un onboarding activo"

**Causa:** Se intenta subir documento antes de activar el onboarding o después de completarlo.

**Solución:** Asegurarse de que el onboarding esté activo antes de subir documentos.

### Error: "Tipo de archivo no permitido"

**Causa:** El archivo no es PDF, JPEG o PNG.

**Solución:** Convertir el archivo a un formato soportado.

### Error: "El archivo es demasiado grande"

**Causa:** El archivo supera los 5MB.

**Solución:** Comprimir el archivo o dividirlo en partes más pequeñas.

### Documentos no aparecen en la lista

**Causa:** Puede ser un problema de permisos o de token expirado.

**Solución:** 
- Verificar que el token de onboarding sea válido
- Verificar que el empleado pertenezca a la empresa correcta
- Revisar logs del servidor para más detalles

---

## 📝 Notas de Implementación

### Características Clave

1. **Subida en dos fases:**
   - Antes de crear empleado: Documentos se guardan temporalmente en el frontend
   - Después de crear empleado: Documentos se suben automáticamente al servidor

2. **Gestión de carpetas automática:**
   - Carpetas se crean automáticamente cuando se necesita
   - Estructura organizada por tipo de documento

3. **Validación de documentos requeridos:**
   - Se valida automáticamente al subir documentos
   - El progreso se actualiza cuando todos los requeridos están completos

4. **Manejo de errores robusto:**
   - Errores específicos por tipo de problema
   - Continuación del proceso aunque falle algún documento
   - Mensajes claros al usuario

---

## 🔮 Mejoras Futuras

1. **Vista previa de documentos:** Permitir ver documentos sin descargar
2. **Edición de metadatos:** Permitir cambiar nombre y tipo después de subir
3. **Eliminación de documentos:** Permitir eliminar documentos subidos (con permisos)
4. **Extracción automática con IA:** Extraer datos de contratos y DNI automáticamente
5. **Notificaciones:** Notificar a HR cuando empleado sube documentos

---

**Última actualización:** 2025-11-05  
**Versión:** 1.0.0


