# 📊 Importación Masiva de Empleados desde Excel

**Estado**: ✅ Implementado  
**Versión**: 2.0.0  
**Última actualización**: 2025-01-27

---

## 🎯 Visión General

Sistema de importación masiva de empleados desde archivos Excel con procesamiento inteligente mediante IA. El sistema detecta automáticamente la estructura del Excel, mapea los datos a campos de empleados, y permite revisar un preview completo antes de guardar en la base de datos.

**Características clave:**
- ✅ Procesamiento con IA (OpenAI GPT-4 Vision)
- ✅ Preview completo antes de guardar
- ✅ Validación automática de datos
- ✅ Detección automática de equipos y puestos
- ✅ Creación automática de equipos y puestos si no existen
- ✅ Envío opcional de invitaciones por email
- ✅ Flujo unificado para onboarding y HR/Organización

---

## 🔄 Flujo de Importación (2 Fases)

### FASE 1: Análisis y Preview (NO guarda en BD)

1. **Usuario sube archivo Excel**
   - Formatos soportados: `.xlsx`, `.xls`, `.csv`
   - El Excel puede tener cualquier estructura (la IA detecta automáticamente)

2. **Usuario hace clic en "Analizar archivo"**
   - El sistema procesa el Excel con IA
   - Detecta automáticamente columnas y mapea datos
   - Valida cada empleado detectado
   - **NO se guarda nada en la base de datos todavía**

3. **Sistema muestra Preview completo:**
   - 📋 Resumen: X empleados detectados (válidos/inválidos)
   - 🏢 Lista de equipos a crear
   - 👔 Managers detectados
   - 📋 Lista detallada de empleados válidos (expandible)
   - ⚠️ Lista de empleados con errores (no se importarán)
   - ☑️ Opción de enviar invitaciones automáticamente

### FASE 2: Confirmación y Guardado (Guarda en BD)

4. **Usuario revisa el preview**
   - Puede expandir cada empleado para ver detalles
   - Revisa equipos y puestos detectados
   - Decide si enviar invitaciones

5. **Usuario hace clic en "Confirmar e importar X empleados"**
   - **AHORA SÍ se guardan los datos:**
     - ✅ Empleados (con datos encriptados)
     - ✅ Usuarios asociados
     - ✅ Equipos (si no existen)
     - ✅ Puestos (si no existen)
     - ✅ Relaciones empleado-equipo
     - ✅ Asignación de managers
     - ✅ Invitaciones por email (si está activado)

6. **Sistema muestra resultado final:**
   - Resumen de empleados creados
   - Equipos y puestos creados
   - Invitaciones enviadas
   - Errores si los hubo

---

## 📍 Ubicaciones

### Onboarding (Sign Up de Empresa)

**Ruta:** `/onboarding/cargar-datos` → Tab "Empleados"

**Componente:** `components/onboarding/importar-empleados.tsx`

**Uso:** Durante el proceso de onboarding inicial de la empresa para importar empleados masivamente.

### HR/Organización

**Ruta:** `/hr/organizacion/personas` → "Añadir Persona" → "Importar" → "Excel Masivo"

**Componente:** `components/organizacion/add-persona-document-form.tsx`

**Uso:** Para importar empleados adicionales después del onboarding inicial.

---

## 🏗️ Arquitectura

### Componente Principal

**`components/shared/importar-empleados-excel.tsx`**

Componente unificado y reutilizable usado en ambos contextos (onboarding y HR/Organización).

**Props:**
```typescript
interface ImportarEmpleadosExcelProps {
  onSuccess?: () => void;           // Callback después de importación exitosa
  onCancel?: () => void;             // Callback para cancelar
  showToast?: boolean;                // Mostrar notificaciones toast (default: true)
  title?: string;                     // Título personalizado
  description?: string;               // Descripción personalizada
  showCancelButton?: boolean;         // Mostrar botón cancelar
  showFinishButton?: boolean;         // Mostrar botón "Guardar y volver"
}
```

**Estados:**
- `analizando`: Muestra loader durante análisis del Excel
- `confirmando`: Muestra loader durante guardado en BD
- `previewData`: Almacena datos procesados antes de guardar
- `resultadoImportacion`: Almacena resultado final después de guardar

### API Endpoints

#### 1. Analizar Excel (NO guarda)

**Endpoint:** `POST /api/empleados/importar-excel`

**Autenticación:** Requiere rol `hr_admin`

**Request:**
```typescript
FormData {
  file: File;  // Archivo Excel (.xlsx, .xls, .csv)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "empleados": [
      {
        "nombre": "Juan",
        "apellidos": "García",
        "email": "juan.garcia@empresa.com",
        "nif": "12345678A",
        "telefono": "+34600123456",
        "puesto": "Desarrollador Senior",
        "equipo": "Desarrollo",
        "manager": "María López",
        "fechaAlta": "2025-01-01",
        "salarioBrutoAnual": 50000,
        "valido": true,
        "errores": []
      }
    ],
    "equiposDetectados": ["Desarrollo", "Ventas", "Marketing"],
    "managersDetectados": ["María López", "Pedro Sánchez"],
    "resumen": {
      "total": 10,
      "validos": 8,
      "invalidos": 2
    }
  }
}
```

#### 2. Confirmar Importación (Guarda en BD)

**Endpoint:** `POST /api/empleados/importar-excel/confirmar`

**Autenticación:** Requiere rol `hr_admin`

**Request:**
```json
{
  "empleados": [
    {
      "nombre": "Juan",
      "apellidos": "García",
      "email": "juan.garcia@empresa.com",
      "valido": true,
      "errores": []
      // ... otros campos
    }
  ],
  "equiposDetectados": ["Desarrollo", "Ventas"],
  "managersDetectados": ["María López"],
  "invitarEmpleados": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "empleadosCreados": 8,
    "equiposCreados": 3,
    "puestosCreados": 5,
    "invitacionesEnviadas": 8,
    "errores": [
      "Email duplicado: juan.garcia@empresa.com"
    ],
    "empleadosImportados": [
      {
        "id": "uuid",
        "nombre": "Juan",
        "apellidos": "García",
        "email": "juan.garcia@empresa.com",
        "puesto": "Desarrollador Senior",
        "equipo": "Desarrollo",
        "fechaAlta": "2025-01-01T00:00:00Z",
        "salarioBrutoAnual": 50000,
        "invitacionEnviada": true
      }
    ]
  }
}
```

---

## 🤖 Procesamiento con IA

### Detección Automática de Columnas

El sistema usa **OpenAI GPT-4 Vision** para:
1. Analizar la estructura del Excel
2. Detectar automáticamente qué columnas corresponden a qué campos
3. Mapear datos incluso si las columnas tienen nombres diferentes
4. Manejar variaciones en formato (fechas, números, texto)

### Campos Detectados

El sistema puede detectar automáticamente:
- ✅ Nombre y apellidos
- ✅ Email
- ✅ NIF/NIE
- ✅ Teléfono
- ✅ Fecha de nacimiento
- ✅ Puesto de trabajo
- ✅ Equipo
- ✅ Manager
- ✅ Fecha de alta
- ✅ Salario bruto anual/mensual
- ✅ Dirección completa (calle, número, piso, ciudad, código postal, provincia)

### Validación Automática

Cada empleado detectado se valida automáticamente:
- ✅ Email válido y único
- ✅ NIF válido (formato español)
- ✅ Campos requeridos presentes (nombre, apellidos, email)
- ✅ Fechas válidas
- ✅ Salarios numéricos válidos

---

## 📋 Estructura del Excel

### Ejemplo de Excel

El Excel puede tener cualquier estructura. La IA detecta automáticamente las columnas:

| Nombre | Apellidos | Email | NIF | Teléfono | Puesto | Equipo | Manager | Fecha Alta | Salario Anual |
|--------|-----------|-------|-----|----------|--------|--------|---------|------------|---------------|
| Juan | García | juan.garcia@empresa.com | 12345678A | +34600123456 | Desarrollador Senior | Desarrollo | María López | 2025-01-01 | 50000 |
| Ana | Martínez | ana.martinez@empresa.com | 87654321B | +34600654321 | Product Manager | Producto | Pedro Sánchez | 2025-01-15 | 55000 |

### Formatos Soportados

- **Excel 2007+**: `.xlsx`
- **Excel 97-2003**: `.xls`
- **CSV**: `.csv` (valores separados por comas)

---

## 🔐 Seguridad y Validaciones

### Validaciones de Archivo

- ✅ Tipo de archivo válido (`.xlsx`, `.xls`, `.csv`)
- ✅ Archivo no vacío
- ✅ Estructura Excel válida

### Validaciones de Datos

- ✅ Email único (no duplicado en la empresa)
- ✅ NIF único (si se proporciona)
- ✅ Campos requeridos presentes
- ✅ Formatos válidos (fechas, números, emails)

### Encriptación

Los datos sensibles se encriptan antes de guardar:
- NIF
- Teléfono
- Dirección completa
- Salarios

---

## 🎨 Interfaz de Usuario

### Fase 1: Análisis

**Pantalla de carga:**
- Área drag-and-drop para subir archivo
- Botón "Analizar archivo"
- Información sobre formatos soportados

**Durante análisis:**
- Loader con mensaje "Analizando archivo..."
- Indicador de progreso

**Preview:**
- Resumen con estadísticas
- Lista de equipos a crear (badges)
- Lista de empleados válidos (expandible)
- Lista de empleados inválidos con errores
- Checkbox para enviar invitaciones
- Botones: "Cancelar" y "Confirmar e importar X empleados"

### Fase 2: Confirmación

**Durante guardado:**
- Loader con mensaje "Guardando empleados..."
- Indicador de progreso

**Resultado final:**
- Resumen de éxito (empleados creados, equipos, puestos, invitaciones)
- Lista de errores si los hubo
- Lista de empleados importados (expandible)
- Botones: "Importar más empleados" y "Guardar y volver" (si aplica)

---

## 🔄 Proceso de Guardado

### Orden de Creación

1. **Equipos** (si no existen)
   - Se crean con `upsert` (evita duplicados)
   - Tipo por defecto: `proyecto`
   - Se activan automáticamente

2. **Puestos** (si no existen)
   - Se crean con `upsert` (evita duplicados)
   - Se activan automáticamente

3. **Empleados** (en batches de 50, con paralelismo de 8)
   - Se crea usuario primero
   - Se valida email único
   - Se valida NIF único (si existe)
   - Se crea empleado con datos encriptados
   - Se vincula empleado al usuario
   - Se asigna a equipo (si corresponde)
   - Se asigna jornada por defecto

4. **Managers** (segunda pasada)
   - Se buscan managers por email o nombre
   - Se asignan a empleados
   - Se asignan como managers de equipos (si el equipo no tiene manager)

5. **Invitaciones** (si está activado)
   - Se envían emails de invitación
   - Tipo de onboarding: `simplificado`

---

## ⚠️ Manejo de Errores

### Errores Comunes

**Email duplicado:**
- El empleado no se crea
- Se muestra error específico en el resultado

**NIF duplicado:**
- El empleado no se crea
- Se elimina el usuario creado (rollback)
- Se muestra error específico

**Equipo/Puesto duplicado:**
- Se usa `upsert` para evitar duplicados
- Si ya existe, se activa automáticamente

**Error en creación de empleado:**
- El error no bloquea otros empleados
- Se procesan en paralelo con `Promise.allSettled`
- Se muestran todos los errores al final

### Validaciones que Previenen Errores

- ✅ Validación de email único antes de crear
- ✅ Validación de NIF único antes de crear
- ✅ Validación de campos requeridos
- ✅ Validación de formatos (fechas, números)

---

## 🧪 Testing

### Casos de Prueba

1. **Excel con estructura estándar**
   - Debe detectar correctamente todos los campos
   - Debe validar empleados correctamente
   - Debe crear empleados, equipos y puestos

2. **Excel con estructura no estándar**
   - Debe detectar columnas automáticamente
   - Debe mapear datos correctamente

3. **Excel con empleados duplicados**
   - Debe detectar emails duplicados
   - Debe mostrar errores en preview
   - No debe crear empleados duplicados

4. **Excel con datos inválidos**
   - Debe validar cada empleado
   - Debe mostrar errores específicos
   - Solo debe crear empleados válidos

5. **Cancelación durante preview**
   - No debe guardar nada en BD
   - Debe permitir volver a subir archivo

---

## 📝 Notas de Implementación

### Cambios Recientes (v2.0.0)

**Problema anterior:**
- El sistema guardaba equipos y puestos automáticamente después de analizar el Excel
- No había oportunidad de revisar antes de guardar

**Solución implementada:**
- Separación en dos fases: Análisis (preview) y Confirmación (guardado)
- Preview completo antes de guardar
- Usuario debe confirmar explícitamente para guardar

### Unificación de Flujos

- ✅ Mismo componente para onboarding y HR/Organización
- ✅ Misma funcionalidad en ambos contextos
- ✅ Misma experiencia de usuario

---

## 🔮 Mejoras Futuras

1. **Edición en preview:**
   - Permitir editar datos de empleados antes de confirmar
   - Permitir excluir empleados específicos

2. **Plantilla de Excel:**
   - Descargar plantilla con estructura recomendada
   - Validación más estricta con plantilla

3. **Importación parcial:**
   - Permitir importar solo empleados válidos
   - Opción de corregir y reintentar empleados inválidos

4. **Historial de importaciones:**
   - Guardar historial de importaciones
   - Permitir reimportar desde historial

5. **Validaciones avanzadas:**
   - Validar IBAN antes de crear
   - Validar fechas de alta futuras
   - Validar rangos salariales

---

## 📚 Referencias

- **Componente:** `components/shared/importar-empleados-excel.tsx`
- **API Análisis:** `app/api/empleados/importar-excel/route.ts`
- **API Confirmación:** `app/api/empleados/importar-excel/confirmar/route.ts`
- **Procesamiento IA:** `lib/ia/procesar-excel-empleados.ts`
- **Validaciones:** `lib/ia/procesar-excel-empleados.ts` (función `validarEmpleado`)

---

**Última actualización:** 2025-01-27  
**Versión:** 2.0.0









