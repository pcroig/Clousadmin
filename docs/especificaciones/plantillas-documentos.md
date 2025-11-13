# 📝 Sistema de Plantillas de Documentos - Especificación Funcional y Técnica

**Proyecto**: Clousadmin  
**Fecha**: 12 de Noviembre 2025  
**Versión**: 1.0.0 (Básico/MVP)  
**Estado**: 📋 Especificación en Definición

---

## 📋 Índice

1. [Análisis del Competidor](#1-análisis-del-competidor)
2. [Definición de Requisitos](#2-definición-de-requisitos-clousadmin)
3. [Arquitectura y Modelos de Datos](#3-arquitectura-y-modelos-de-datos)
4. [Especificación Técnica](#4-especificación-técnica)
5. [Flujos de Uso](#5-flujos-de-uso)
6. [Fases de Implementación](#6-fases-de-implementación)
7. [Integraciones](#7-integraciones-con-módulos-existentes)

---

## 1. Análisis del Competidor

### 1.1 Funcionalidades Clave (Factorial)

#### ✅ Tipos de Plantillas

**1. Plantillas con Variables (DOCX)**
- Documentos en formato `.DOCX` de Microsoft Word
- Variables entre corchetes dobles: `{{nombre}}`, `{{id_number}}`, `{{salary_amount}}`
- Sistema de sustitución automática de variables con datos del empleado/empresa
- Más de 60 campos disponibles (datos personales, contrato, salario, banco)
- Campos personalizados se convierten automáticamente en variables

**2. Plantillas con Campos de Formulario (PDF Rellenable)**
- PDFs rellenables creados con Adobe Acrobat Pro, Sedja o Lumin
- Campos de texto, checkboxes, radio buttons, combobox, sliders
- Ejemplo: Modelo 145 (España), Formulario W-4 (EE.UU.)
- Usuarios completan campos manualmente o se pre-rellenan automáticamente

**3. Plantillas Híbridas (Variables + Formulario)**
- Combinación de variables dentro de campos de formulario rellenables
- Variables dentro de un campo de texto de un PDF rellenable
- Se sustituyen variables Y se pueden editar campos adicionales

#### ✅ Funcionalidades Principales

**Gestión de Plantillas**
- Upload de plantillas (DOCX, PDF rellenable)
- Biblioteca de plantillas disponibles por empresa
- Plantillas oficiales predefinidas (Modelo 145, W-4, etc.)
- Previsualización con datos de empleado específico
- Indicador de permisos por variable (verde/naranja/rojo)

**Distribución Masiva**
- Selección de plantilla
- Selección de empleados (individual o masivo)
- Configuración de nombre del archivo resultante
- Carpeta de destino en "Mis documentos" del empleado
- Opción de solicitar firma electrónica
- Tracking de envíos y estado

**Sistema de Permisos**
- Control de acceso a variables según rol y permisos del usuario
- Indicadores visuales de permisos insuficientes
- Restricción de envío si faltan permisos para ciertas variables

### 1.2 Variables Disponibles (Ejemplos del Competidor)

| Categoría | Ejemplos de Variables |
|-----------|----------------------|
| **Datos Personales** | `{{name}}`, `{{last_name}}`, `{{email}}`, `{{phone}}` |
| **Identificación** | `{{id_number}}` (NIF/NIE), `{{social_security_number}}` |
| **Contrato** | `{{contract_start}}`, `{{contract_type}}`, `{{contract_end}}` |
| **Salario** | `{{salary_amount}}`, `{{salary_monthly}}`, `{{base_salary}}` |
| **Banco** | `{{bank_number}}` (IBAN), `{{bank_account_holder}}` |
| **Dirección** | `{{address}}`, `{{city}}`, `{{postal_code}}`, `{{province}}` |
| **Empresa** | `{{company_name}}`, `{{company_cif}}`, `{{company_address}}` |
| **Puesto** | `{{job_position}}`, `{{department}}`, `{{manager_name}}` |
| **Vacaciones** | `{{vacation_days}}`, `{{vacation_balance}}` |

---

## 2. Definición de Requisitos Clousadmin

### 2.1 Requisitos Funcionales - Versión Básica (MVP)

#### 🎯 PRIORIDAD 1: Plantillas Oficiales Predefinidas

**Objetivo**: Documentos estándar iguales para todas las empresas, conectados con módulos existentes.

**Plantillas a Incluir (España)**:
1. **Contrato de Trabajo** (conectado con módulo de Contratos)
   - Variables: datos empleado, salario, fecha inicio, tipo contrato, puesto
   - Se genera automáticamente con datos del contrato
   
2. **Modelo 145** (Cálculo IRPF)
   - Formulario PDF rellenable oficial de la AEAT
   - Variables: NIF, nombre, dirección, situación familiar
   - Pre-rellenado con datos del empleado
   - Empleado puede editar y firmar
   
3. **Modelo 190** (Retención IRPF para Renta)
   - Variables: datos fiscales, retenciones anuales
   - Generado automáticamente desde nóminas

4. **Justificante de Vacaciones**
   - Conectado con módulo de Ausencias
   - Variables: fechas, días solicitados, aprobador

5. **Carta de Bienvenida**
   - Variables: nombre, puesto, fecha inicio, manager

#### 🎯 PRIORIDAD 2: Plantillas Personalizadas (Empresa)

**Objetivo**: Permitir que cada empresa suba sus propias plantillas con variables.

**Funcionalidades Básicas**:
- Upload de plantillas DOCX con variables `{{nombre_variable}}`
- Sistema de variables predefinidas mapeadas a campos de `Empleado` y `Empresa`
- Selector visual de variables disponibles al crear plantilla
- Previsualización con datos de empleado de prueba
- Almacenamiento en S3 de plantillas

**Limitaciones MVP**:
- Solo formato DOCX (PDFs rellenables en Fase 2)
- Variables predefinidas (no campos personalizados en MVP)
- Sin editor visual de plantillas (lo suben desde Word)

### 2.2 Requisitos Técnicos

#### ✅ Auto-Rellenado de Datos

1. **Con datos existentes**:
   - Buscar datos en BD (empleado, empresa, contrato)
   - Sustituir variables automáticamente
   - Generar documento final

2. **Sin datos completos**:
   - Identificar variables faltantes
   - Permitir que HR Admin o Empleado complete
   - Validar campos requeridos antes de generar

#### ✅ Envío Masivo

**Flujo**:
1. Seleccionar plantilla
2. Seleccionar empleados (filtros: equipo, departamento, todos)
3. Configurar:
   - Nombre del documento generado
   - Carpeta de destino (sistema o personalizada)
   - Solicitar firma digital (Fase 2)
4. Vista previa opcional
5. Enviar → Genera documento por empleado
6. Notificación a empleados
7. Almacenamiento en carpeta del empleado

#### ✅ Tracking y Auditoría

- Registro de cuándo se generó cada documento
- Quién generó el documento (HR Admin)
- Variables utilizadas
- Estado: generado, enviado, visto, firmado (Fase 2)

### 2.3 Variables del Sistema (Clousadmin MVP)

**Basadas en el schema de Prisma:**

```typescript
// Empleado
{{empleado_nombre}}
{{empleado_apellidos}}
{{empleado_email}}
{{empleado_nif}}
{{empleado_nss}}
{{empleado_fecha_nacimiento}}
{{empleado_telefono}}
{{empleado_direccion_completa}}
{{empleado_direccion_calle}}
{{empleado_direccion_numero}}
{{empleado_direccion_piso}}
{{empleado_codigo_postal}}
{{empleado_ciudad}}
{{empleado_provincia}}
{{empleado_estado_civil}}
{{empleado_numero_hijos}}
{{empleado_iban}}
{{empleado_titular_cuenta}}

// Contrato
{{contrato_tipo}}
{{contrato_fecha_inicio}}
{{contrato_fecha_fin}}
{{contrato_salario_bruto_anual}}
{{contrato_salario_bruto_mensual}}
{{contrato_puesto}}
{{contrato_categoria_profesional}}
{{contrato_grupo_cotizacion}}

// Jornada
{{jornada_nombre}}
{{jornada_horas_semanales}}

// Empresa
{{empresa_nombre}}
{{empresa_cif}}
{{empresa_email}}
{{empresa_telefono}}
{{empresa_direccion}}
{{empresa_web}}

// Manager
{{manager_nombre}}
{{manager_apellidos}}
{{manager_email}}

// Fechas dinámicas
{{fecha_actual}}
{{año_actual}}
{{mes_actual}}

// Vacaciones
{{vacaciones_dias_totales}}
{{vacaciones_dias_disponibles}}
{{vacaciones_dias_usados}}
```

---

## 3. Arquitectura y Modelos de Datos

### 3.1 Nuevas Tablas en Prisma Schema

```prisma
/// PlantillaDocumento - Template storage and metadata
model PlantillaDocumento {
  id        String  @id @default(uuid())
  empresaId String? // NULL = plantilla oficial (todas empresas), NOT NULL = personalizada por empresa
  
  // Metadata
  nombre      String  @db.VarChar(255) // "Contrato Indefinido", "Modelo 145"
  descripcion String? @db.Text
  categoria   String  @db.VarChar(100) // 'contrato', 'fiscal', 'ausencia', 'personal'
  
  // Template type
  tipo        String  @db.VarChar(50) // 'oficial' | 'personalizada'
  formato     String  @db.VarChar(20) // 'docx' | 'pdf_rellenable' (Fase 2)
  
  // File storage
  s3Key       String  @unique @db.Text // S3 key to template file
  s3Bucket    String  @db.VarChar(255)
  
  // Variables used in template (JSON array)
  // Example: ["empleado_nombre", "empleado_nif", "contrato_fecha_inicio"]
  variablesUsadas Json  @default("[]")
  
  // Configuration
  activa           Boolean @default(true)
  esOficial        Boolean @default(false) // Sistema predefinida
  requiereContrato Boolean @default(false) // Necesita datos de contrato
  requiereFirma    Boolean @default(false) // Requiere firma digital (Fase 2)
  
  // Folder destination default
  carpetaDestinoDefault String? @db.VarChar(50) // 'Contratos', 'Personales', etc.
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  empresa           Empresa?            @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  documentosGenerados DocumentoGenerado[]
  
  @@index([empresaId])
  @@index([tipo])
  @@index([categoria])
  @@index([activa])
  @@map("plantillas_documentos")
}

/// DocumentoGenerado - Documents generated from templates
/// Tracking de documentos generados a partir de plantillas
model DocumentoGenerado {
  id          String @id @default(uuid())
  empresaId   String
  empleadoId  String
  plantillaId String
  documentoId String @unique // Link to Documento table (final PDF/DOCX)
  
  // Generation metadata
  generadoPor String? // Usuario ID (HR Admin)
  generadoEn  DateTime @default(now())
  
  // Variables used (snapshot for audit)
  variablesUtilizadas Json // { "empleado_nombre": "Juan", ... }
  
  // Delivery tracking
  notificado Boolean @default(false)
  visto      Boolean @default(false)
  vistoEn    DateTime?
  
  // Firma digital (Fase 2)
  requiereFirma Boolean   @default(false)
  firmado       Boolean   @default(false)
  firmadoEn     DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  empresa   Empresa            @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  empleado  Empleado           @relation(fields: [empleadoId], references: [id], onDelete: Cascade)
  plantilla PlantillaDocumento @relation(fields: [plantillaId], references: [id], onDelete: Cascade)
  documento Documento          @relation(fields: [documentoId], references: [id], onDelete: Cascade)
  
  @@index([empresaId])
  @@index([empleadoId])
  @@index([plantillaId])
  @@index([documentoId])
  @@index([generadoEn])
  @@index([firmado]) // Para firma digital (Fase 2)
  @@map("documentos_generados")
}
```

### 3.2 Modificaciones en Tablas Existentes

```prisma
// En model Documento, agregar relación:
model Documento {
  // ... campos existentes ...
  
  generadoDesde DocumentoGenerado? // One-to-one con DocumentoGenerado
  
  // ... resto de relaciones ...
}

// En model Empresa, agregar relación:
model Empresa {
  // ... campos existentes ...
  
  plantillasDocumentos PlantillaDocumento[]
  documentosGenerados  DocumentoGenerado[]
  
  // ... resto de relaciones ...
}

// En model Empleado, agregar relación:
model Empleado {
  // ... campos existentes ...
  
  documentosGenerados DocumentoGenerado[]
  
  // ... resto de relaciones ...
}
```

---

## 4. Especificación Técnica

### 4.1 Stack Tecnológico Recomendado

#### 📦 Librerías para Manipulación de Documentos

**Para DOCX (Variables)**:
```bash
npm install docxtemplater pizzip
npm install @types/docxtemplater --save-dev
```

- **docxtemplater**: Librería para plantillas DOCX con variables
- **pizzip**: Dependencia para leer/escribir archivos ZIP (DOCX internamente es XML en ZIP)
- Soporta variables simples, condicionales, loops
- Compatible con Node.js y Next.js

**Para PDF (Fase 2 - PDFs Rellenables)**:
```bash
npm install pdf-lib
npm install @pdf-lib/fontkit
```

- **pdf-lib**: Manipulación de PDFs en JavaScript/TypeScript
- Soporta rellenar campos de formulario
- Crear, modificar y extraer datos de PDFs
- Sin dependencias externas

**Para Conversión DOCX → PDF (Opcional)**:
```bash
npm install docx-pdf libreoffice-convert
```

- **libreoffice-convert**: Requiere LibreOffice instalado en el servidor
- Alternativa: Servicios cloud (Cloudmersive, PDFShift, etc.)
- Para MVP: Generar solo DOCX, conversión manual si se necesita PDF

### 4.2 APIs a Implementar

#### `GET /api/plantillas`

**Descripción**: Listar plantillas disponibles (oficiales + personalizadas de la empresa)

**Query Params**:
- `tipo`: 'oficial' | 'personalizada' | 'todas'
- `categoria`: 'contrato' | 'fiscal' | 'ausencia' | 'personal'
- `activa`: boolean

**Response**:
```typescript
{
  success: true,
  plantillas: [
    {
      id: "uuid",
      nombre: "Contrato Indefinido",
      descripcion: "Plantilla oficial para contratos indefinidos",
      tipo: "oficial",
      categoria: "contrato",
      formato: "docx",
      variablesUsadas: ["empleado_nombre", "contrato_fecha_inicio"],
      requiereContrato: true,
      carpetaDestinoDefault: "Contratos",
      activa: true,
      esOficial: true
    }
  ]
}
```

#### `POST /api/plantillas`

**Descripción**: Subir nueva plantilla personalizada (solo HR Admin)

**Body (FormData)**:
```typescript
file: File // DOCX file
nombre: string
descripcion?: string
categoria: string // 'contrato' | 'fiscal' | 'ausencia' | 'personal'
carpetaDestinoDefault?: string
```

**Proceso**:
1. Validar permisos (solo HR Admin)
2. Validar formato (solo DOCX en MVP)
3. Extraer variables del documento usando `docxtemplater`
4. Subir a S3
5. Crear registro en `PlantillaDocumento`
6. Retornar plantilla creada

**Response**:
```typescript
{
  success: true,
  plantilla: { /* PlantillaDocumento */ },
  variablesDetectadas: ["empleado_nombre", "empresa_cif"]
}
```

#### `GET /api/plantillas/[id]`

**Descripción**: Obtener detalles de una plantilla específica

**Response**:
```typescript
{
  success: true,
  plantilla: { /* PlantillaDocumento completo */ }
}
```

#### `GET /api/plantillas/[id]/previsualizar`

**Descripción**: Previsualizar plantilla con datos de un empleado específico

**Query Params**:
- `empleadoId`: UUID del empleado

**Response**:
```typescript
{
  success: true,
  previewUrl: "https://s3.../preview-doc.docx",
  variablesResueltas: {
    empleado_nombre: "Juan Pérez",
    empleado_nif: "12345678A",
    // ...
  },
  variablesFaltantes: ["empleado_nss", "contrato_fecha_inicio"]
}
```

#### `POST /api/plantillas/[id]/generar`

**Descripción**: Generar documentos a partir de plantilla para empleados seleccionados

**Body**:
```typescript
{
  empleadoIds: string[], // Array de IDs de empleados
  configuracion: {
    nombreDocumento?: string, // Template para nombre: "Contrato_{{empleado_nombre}}_{{fecha}}"
    carpetaDestino?: string, // Override default
    notificar: boolean, // Enviar notificación a empleados
    requiereFirma?: boolean // Fase 2
  }
}
```

**Proceso**:
1. Validar permisos
2. Para cada empleado:
   a. Resolver variables con datos del empleado
   b. Generar documento usando `docxtemplater`
   c. Subir documento generado a S3
   d. Crear registro en `Documento`
   e. Crear registro en `DocumentoGenerado`
   f. Asignar a carpeta del empleado
   g. (Opcional) Enviar notificación
3. Retornar resumen de generación

**Response**:
```typescript
{
  success: true,
  resumen: {
    totalEmpleados: 10,
    generadosExitosos: 9,
    fallidos: 1,
    documentos: [
      {
        empleadoId: "uuid",
        empleadoNombre: "Juan Pérez",
        documentoId: "uuid",
        success: true
      },
      {
        empleadoId: "uuid2",
        empleadoNombre: "María López",
        error: "Falta campo requerido: contrato_fecha_inicio",
        success: false
      }
    ]
  }
}
```

#### `GET /api/plantillas/variables`

**Descripción**: Listar todas las variables disponibles del sistema

**Response**:
```typescript
{
  success: true,
  variables: {
    empleado: [
      { key: "empleado_nombre", label: "Nombre", tipo: "string", ejemplo: "Juan" },
      { key: "empleado_nif", label: "NIF/NIE", tipo: "string", ejemplo: "12345678A" },
      // ...
    ],
    empresa: [ /* ... */ ],
    contrato: [ /* ... */ ],
    // ...
  }
}
```

#### `PATCH /api/plantillas/[id]`

**Descripción**: Actualizar plantilla (nombre, descripción, activa, etc.)

**Body**:
```typescript
{
  nombre?: string,
  descripcion?: string,
  activa?: boolean,
  carpetaDestinoDefault?: string
}
```

#### `DELETE /api/plantillas/[id]`

**Descripción**: Eliminar plantilla personalizada (solo HR Admin, no oficiales)

---

### 4.3 Utilidades y Funciones Helper

#### `lib/plantillas/resolver-variables.ts`

```typescript
/**
 * Resuelve variables de plantilla con datos del empleado
 * 
 * @param variables - Array de variables a resolver ["empleado_nombre", "empresa_cif"]
 * @param empleadoId - ID del empleado
 * @returns Objeto con variables resueltas y faltantes
 */
export async function resolverVariables(
  variables: string[],
  empleadoId: string
): Promise<{
  resueltas: Record<string, string>;
  faltantes: string[];
}> {
  // 1. Buscar empleado con relaciones necesarias
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    include: {
      empresa: true,
      manager: true,
      jornada: true,
      contratos: {
        orderBy: { fechaInicio: 'desc' },
        take: 1
      },
      saldosAusencias: {
        where: { año: new Date().getFullYear() }
      }
    }
  });

  if (!empleado) {
    throw new Error('Empleado no encontrado');
  }

  // 2. Mapear variables a valores
  const resueltas: Record<string, string> = {};
  const faltantes: string[] = [];

  for (const variable of variables) {
    const valor = obtenerValorVariable(variable, empleado);
    
    if (valor !== null && valor !== undefined && valor !== '') {
      resueltas[variable] = valor;
    } else {
      faltantes.push(variable);
    }
  }

  return { resueltas, faltantes };
}

/**
 * Obtiene el valor de una variable específica
 */
function obtenerValorVariable(
  variable: string,
  empleado: EmpleadoConRelaciones
): string | null {
  // Empleado
  if (variable === 'empleado_nombre') return empleado.nombre;
  if (variable === 'empleado_apellidos') return empleado.apellidos;
  if (variable === 'empleado_email') return empleado.email;
  if (variable === 'empleado_nif') return empleado.nif ? decrypt(empleado.nif) : null;
  // ... más variables
  
  // Empresa
  if (variable === 'empresa_nombre') return empleado.empresa.nombre;
  if (variable === 'empresa_cif') return empleado.empresa.cif;
  // ... más variables
  
  // Contrato
  const contrato = empleado.contratos[0];
  if (variable === 'contrato_fecha_inicio' && contrato) {
    return format(contrato.fechaInicio, 'dd/MM/yyyy');
  }
  // ... más variables
  
  // Fechas dinámicas
  if (variable === 'fecha_actual') return format(new Date(), 'dd/MM/yyyy');
  if (variable === 'año_actual') return new Date().getFullYear().toString();
  
  return null;
}
```

#### `lib/plantillas/generar-documento.ts`

```typescript
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { readFile, writeFile } from 'fs/promises';

/**
 * Genera documento a partir de plantilla DOCX y variables
 * 
 * @param plantillaS3Key - S3 key de la plantilla
 * @param variables - Objeto con variables resueltas
 * @returns Buffer del documento generado
 */
export async function generarDocumento(
  plantillaS3Key: string,
  variables: Record<string, string>
): Promise<Buffer> {
  // 1. Descargar plantilla de S3
  const plantillaBuffer = await descargarDeS3(plantillaS3Key);
  
  // 2. Cargar plantilla con PizZip
  const zip = new PizZip(plantillaBuffer);
  
  // 3. Crear instancia de Docxtemplater
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '', // Reemplazar variables vacías con string vacío
  });
  
  // 4. Setear variables
  doc.setData(variables);
  
  // 5. Renderizar documento
  try {
    doc.render();
  } catch (error) {
    console.error('[generar-documento] Error renderizando:', error);
    throw new Error(`Error generando documento: ${error.message}`);
  }
  
  // 6. Generar buffer
  const buffer = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  });
  
  return buffer;
}
```

#### `lib/plantillas/extraer-variables.ts`

```typescript
/**
 * Extrae variables de una plantilla DOCX
 * 
 * @param fileBuffer - Buffer del archivo DOCX
 * @returns Array de variables encontradas
 */
export async function extraerVariables(
  fileBuffer: Buffer
): Promise<string[]> {
  const zip = new PizZip(fileBuffer);
  const doc = new Docxtemplater(zip);
  
  // Usar regex para encontrar {{variables}}
  const content = zip.file('word/document.xml')?.asText();
  
  if (!content) {
    throw new Error('No se pudo leer el contenido del DOCX');
  }
  
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const variable = match[1].trim();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }
  
  return variables;
}
```

---

## 5. Flujos de Uso

### 5.1 Flujo: HR Admin Sube Plantilla Personalizada

```
1. HR Admin → Navega a /hr/plantillas
2. Click en "Nueva Plantilla"
3. Completa formulario:
   - Nombre: "Carta de Aumento Salarial"
   - Descripción: "Notificación de aumento salarial"
   - Categoría: "Personal"
   - Carpeta destino: "Personales"
   - Subir archivo DOCX
4. Sistema:
   a. Valida formato DOCX
   b. Extrae variables: ["empleado_nombre", "contrato_salario_bruto_anual"]
   c. Sube a S3
   d. Crea PlantillaDocumento en BD
5. Muestra variables detectadas
6. HR Admin confirma
7. Plantilla disponible en biblioteca
```

### 5.2 Flujo: HR Admin Genera Documentos Masivos

```
1. HR Admin → /hr/plantillas
2. Selecciona plantilla "Contrato Indefinido"
3. Click en "Generar Documentos"
4. Modal:
   a. Seleccionar empleados:
      - Todos
      - Por equipo
      - Por departamento
      - Individual (búsqueda)
   b. Configuración:
      - Nombre documento: "Contrato_{{empleado_apellidos}}_{{fecha}}"
      - Carpeta: "Contratos"
      - Notificar empleados: ✅
5. Vista previa (opcional):
   - Selecciona 1 empleado de muestra
   - Ve previsualización del documento
6. Click "Generar"
7. Sistema:
   a. Para cada empleado:
      - Resuelve variables
      - Genera DOCX
      - Sube a S3
      - Crea Documento en BD
      - Crea DocumentoGenerado (tracking)
      - Asigna a carpeta del empleado
   b. Envía notificaciones
8. Muestra resumen:
   - 25 de 27 generados exitosamente
   - 2 fallidos (falta campo requerido)
   - Lista de documentos generados
```

### 5.3 Flujo: Empleado Recibe y Ve Documento

```
1. Empleado recibe notificación:
   "Nuevo documento: Contrato_Perez_2025.docx"
2. Click en notificación
3. Redirige a /empleado/mi-espacio/documentos
4. Carpeta "Contratos" tiene badge "1 nuevo"
5. Abre carpeta
6. Ve documento con indicador "Nuevo"
7. Click en documento → Descarga
8. Sistema:
   a. Marca como "visto"
   b. Actualiza DocumentoGenerado.visto = true
```

### 5.4 Flujo: Previsualización con Datos de Empleado

```
1. HR Admin → /hr/plantillas
2. Click en plantilla "Modelo 145"
3. Click en "Previsualizar"
4. Modal:
   a. Selector de empleado (búsqueda)
   b. Selecciona "Juan Pérez"
5. Sistema:
   a. Resuelve variables con datos de Juan
   b. Genera documento temporal
   c. Muestra variables resueltas:
      ✅ empleado_nombre: "Juan Pérez"
      ✅ empleado_nif: "12345678A"
      ⚠️ empleado_nss: (faltante)
   d. Muestra documento en visor
6. Opción de descargar previsualización
7. Alerta si faltan variables requeridas
```

---

## 6. Fases de Implementación

### 📌 Fase 1: MVP Básico (Prioridad Alta)

**Objetivo**: Sistema funcional con plantillas oficiales y generación básica

**Tareas**:
1. ✅ Crear modelos en Prisma (`PlantillaDocumento`, `DocumentoGenerado`)
2. ✅ Migración de BD
3. ✅ Instalar librerías (`docxtemplater`, `pizzip`)
4. ✅ Implementar utilidades:
   - `lib/plantillas/resolver-variables.ts`
   - `lib/plantillas/generar-documento.ts`
   - `lib/plantillas/extraer-variables.ts`
5. ✅ Crear APIs:
   - `GET /api/plantillas`
   - `POST /api/plantillas/[id]/generar`
   - `GET /api/plantillas/variables`
6. ✅ Crear plantillas oficiales (seeders):
   - Contrato Indefinido
   - Modelo 145
   - Justificante de Vacaciones
7. ✅ Componente UI:
   - `components/hr/plantillas-lista.tsx`
   - `components/hr/generar-documentos-modal.tsx`
8. ✅ Página: `/hr/plantillas`
9. ✅ Testing básico

**Duración Estimada**: 1.5 semanas

---

### 📌 Fase 2: Plantillas Personalizadas (Prioridad Media)

**Objetivo**: Permitir que empresas suban sus propias plantillas

**Tareas**:
1. ✅ Implementar APIs:
   - `POST /api/plantillas` (upload)
   - `PATCH /api/plantillas/[id]`
   - `DELETE /api/plantillas/[id]`
2. ✅ UI para subir plantillas:
   - Formulario de upload
   - Validación de formato
   - Mostrar variables detectadas
3. ✅ Sistema de categorías personalizadas
4. ✅ Biblioteca de plantillas (oficiales + personalizadas)
5. ✅ Testing

**Duración Estimada**: 1 semana

---

### 📌 Fase 3: Previsualización y Edición (Prioridad Media)

**Objetivo**: Previsualizar documentos antes de generar masivamente

**Tareas**:
1. ✅ API: `GET /api/plantillas/[id]/previsualizar`
2. ✅ Componente de previsualización:
   - Selector de empleado
   - Visor de documento (iframe o descarga)
   - Lista de variables resueltas/faltantes
3. ✅ Permitir completar variables faltantes manualmente
4. ✅ UI mejorada

**Duración Estimada**: 4 días

---

### 📌 Fase 4: PDFs Rellenables (Prioridad Baja)

**Objetivo**: Soporte para PDFs con campos de formulario

**Tareas**:
1. ✅ Instalar `pdf-lib`
2. ✅ Implementar:
   - `lib/plantillas/generar-pdf-rellenable.ts`
   - Detectar campos de formulario en PDF
   - Rellenar campos con datos
3. ✅ Soporte para PDFs híbridos (variables + formulario)
4. ✅ Actualizar upload para aceptar PDFs
5. ✅ UI actualizada

**Duración Estimada**: 1 semana

**Nota**: PDFs rellenables requieren documentos creados con Adobe Acrobat Pro u otra herramienta similar.

---

### 📌 Fase 5: Integración con Firma Digital (Futuro)

**Objetivo**: Solicitar firma electrónica en documentos generados

**Nota**: Se define en especificación separada de Firma Digital

**Integración**:
- Campo `requiereFirma` en `PlantillaDocumento`
- Campo `firmado` en `DocumentoGenerado`
- Workflow de firma al generar documento
- Tracking de estado de firma

---

## 7. Integraciones con Módulos Existentes

### 7.1 Módulo de Contratos

**Plantilla Oficial**: "Contrato de Trabajo"

**Flujo Integrado**:
```
1. HR Admin crea nuevo contrato para empleado
2. Formulario de contrato tiene opción:
   "Generar documento desde plantilla"
3. Si selecciona "Sí":
   a. Al guardar contrato, se genera documento automáticamente
   b. Se usa plantilla oficial "Contrato Indefinido"
   c. Variables se resuelven con datos del contrato
   d. Documento se guarda en carpeta "Contratos" del empleado
   e. Se vincula a registro de Contrato (contratoId)
4. Empleado recibe notificación con documento
```

**Variables Específicas**:
- Todas las variables de `contrato_*`
- Variables de `empleado_*`
- Variables de `empresa_*`

---

### 7.2 Módulo de Ausencias

**Plantilla Oficial**: "Justificante de Vacaciones"

**Flujo Integrado**:
```
1. HR Admin aprueba ausencia de empleado
2. Sistema genera automáticamente:
   a. Justificante de vacaciones desde plantilla oficial
   b. Variables: fechas, días, tipo ausencia, aprobador
   c. Documento se guarda en carpeta "Justificantes"
   d. Se vincula a ausencia (ausenciaId)
3. Empleado puede descargar justificante desde:
   - /empleado/mi-espacio/ausencias (botón "Descargar Justificante")
   - /empleado/mi-espacio/documentos > Justificantes
```

**Variables Específicas**:
```typescript
{{ausencia_tipo}}
{{ausencia_fecha_inicio}}
{{ausencia_fecha_fin}}
{{ausencia_dias_solicitados}}
{{ausencia_aprobador_nombre}}
{{ausencia_aprobado_fecha}}
```

---

### 7.3 Módulo de Nóminas

**Plantilla Oficial**: "Modelo 190 - Retención IRPF"

**Flujo Integrado**:
```
1. Fin de año fiscal (diciembre)
2. HR Admin navega a /hr/nominas/modelo-190
3. Sistema genera Modelo 190 para todos los empleados:
   a. Calcula retenciones anuales desde nóminas
   b. Genera documento por empleado
   c. Guarda en carpeta "Personales" o "Fiscales"
4. Empleados pueden descargar para declaración de renta
```

**Variables Específicas**:
```typescript
{{nomina_retenciones_anuales}}
{{nomina_base_imponible}}
{{nomina_salario_anual}}
```

---

### 7.4 Módulo de Onboarding

**Plantilla Oficial**: "Carta de Bienvenida"

**Flujo Integrado**:
```
1. HR Admin crea nuevo empleado
2. Sistema genera automáticamente:
   a. Carta de bienvenida personalizada
   b. Variables: nombre, puesto, fecha inicio, manager
   c. Se guarda en carpeta "Personales"
   d. Se envía por email (opcional)
3. Empleado recibe bienvenida al completar onboarding
```

**Variables Específicas**:
```typescript
{{empleado_fecha_alta}}
{{empleado_puesto}}
{{manager_nombre_completo}}
{{empresa_nombre}}
```

---

## 8. Consideraciones de Seguridad y Permisos

### 8.1 Control de Acceso

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Ver plantillas oficiales | ✅ | ✅ | ✅ |
| Ver plantillas personalizadas empresa | ✅ (solo si le afectan) | ✅ | ✅ |
| Crear plantillas | ❌ | ❌ | ✅ |
| Editar plantillas | ❌ | ❌ | ✅ |
| Eliminar plantillas | ❌ | ❌ | ✅ |
| Generar documentos propios | ❌ | ❌ | ✅ |
| Generar documentos masivos | ❌ | ❌ | ✅ |
| Ver documentos propios generados | ✅ | ✅ | ✅ |
| Ver documentos de equipo | ❌ | ✅ | ✅ |
| Ver todos los documentos | ❌ | ❌ | ✅ |

### 8.2 Campos Sensibles y Encriptación

**Campos Encriptados** (ya implementado en empleado):
- `nif`
- `nss`
- `iban`

**Consideraciones**:
- Al resolver variables, desencriptar campos sensibles
- Al generar documento, NO almacenar valores desencriptados en JSON de auditoría
- En `DocumentoGenerado.variablesUtilizadas`, almacenar valores enmascarados:
  ```json
  {
    "empleado_nif": "****5678A",
    "empleado_iban": "ES**...***1234"
  }
  ```

### 8.3 Auditoría de Acceso (GDPR/LOPD)

**Registro de Accesos**:
- Cada generación de documento crea entrada en `AuditoriaAcceso`
- Acción: `"generacion_documento"`
- Recurso: `"plantilla_documento"`
- Campos accedidos: Variables utilizadas

**Ejemplo**:
```typescript
await prisma.auditoriaAcceso.create({
  data: {
    empresaId: session.user.empresaId,
    usuarioId: session.user.id,
    empleadoAccedidoId: empleadoId,
    accion: 'generacion_documento',
    recurso: 'plantilla_documento',
    camposAccedidos: ['nif', 'nss', 'iban', 'salarioBrutoAnual'],
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    motivo: `Generación de documento: ${plantilla.nombre}`
  }
});
```

---

## 9. UI/UX - Componentes y Páginas

### 9.1 Página Principal: `/hr/plantillas`

**Estructura**:
```
┌─────────────────────────────────────────┐
│ 📝 Plantillas de Documentos             │ [+ Nueva Plantilla]
├─────────────────────────────────────────┤
│ [Oficiales] [Personalizadas] [Todas]   │  🔍 Buscar...
├─────────────────────────────────────────┤
│                                          │
│ 📄 Contratos                             │
│ ├─ Contrato Indefinido         [Oficial] → [Generar] [👁️ Preview]
│ ├─ Contrato Temporal            [Oficial] → [Generar] [👁️]
│ └─ Finiquito                    [Custom] → [Generar] [✏️] [🗑️]
│                                          │
│ 💰 Fiscal                                │
│ ├─ Modelo 145 (IRPF)           [Oficial] → [Generar]
│ └─ Modelo 190                   [Oficial] → [Generar]
│                                          │
│ 📋 Ausencias                             │
│ └─ Justificante Vacaciones     [Oficial] → [Generar]
│                                          │
│ 👤 Personal                              │
│ ├─ Carta Bienvenida            [Oficial] → [Generar]
│ └─ Carta Aumento Salarial      [Custom] → [Generar] [✏️]
│                                          │
└─────────────────────────────────────────┘
```

**Componentes**:
- `PlantillasLista.tsx`: Lista categorizada de plantillas
- `PlantillaCard.tsx`: Card individual con acciones
- `NuevaPlantillaModal.tsx`: Modal para subir plantilla
- `GenerarDocumentosModal.tsx`: Modal para generar masivamente

---

### 9.2 Modal: Generar Documentos

```
┌──────────────────────────────────────────────┐
│ Generar: Contrato Indefinido           [X]   │
├──────────────────────────────────────────────┤
│                                               │
│ 👥 Seleccionar Empleados                     │
│ ┌─────────────────────────────────────────┐  │
│ │ ⚪ Todos los empleados (127)            │  │
│ │ ⚪ Por equipo                            │  │
│ │ ⚪ Por departamento                      │  │
│ │ ● Selección manual                      │  │
│ │                                          │  │
│ │ 🔍 Buscar empleados...                  │  │
│ │                                          │  │
│ │ ✅ Juan Pérez                           │  │
│ │ ✅ María López                          │  │
│ │ ☐ Carlos García                         │  │
│ │ ...                                      │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ ⚙️ Configuración                             │
│ Nombre documento:                             │
│ [Contrato_{{empleado_apellidos}}_{{fecha}}]  │
│                                               │
│ Carpeta destino:                              │
│ [Contratos ▼]                                 │
│                                               │
│ ☑️ Notificar a empleados                     │
│ ☐ Requiere firma digital (Fase 2)            │
│                                               │
├──────────────────────────────────────────────┤
│         [Cancelar] [👁️ Vista Previa] [Generar] │
└──────────────────────────────────────────────┘
```

---

### 9.3 Modal: Nueva Plantilla Personalizada

```
┌──────────────────────────────────────────────┐
│ Nueva Plantilla Personalizada          [X]   │
├──────────────────────────────────────────────┤
│                                               │
│ Nombre *                                      │
│ [Carta de Aumento Salarial]                  │
│                                               │
│ Descripción                                   │
│ [Notificación oficial de incremento...]      │
│                                               │
│ Categoría *                                   │
│ [Personal ▼]                                  │
│                                               │
│ Carpeta destino por defecto                   │
│ [Personales ▼]                                │
│                                               │
│ Archivo de plantilla * (DOCX)                │
│ ┌─────────────────────────────────────────┐  │
│ │  📄 Arrastra archivo o click para subir │  │
│ │                                          │  │
│ │     [Seleccionar archivo]                │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ ℹ️ Formato soportado: DOCX                   │
│ ℹ️ Usa variables: {{empleado_nombre}}        │
│ ℹ️ [Ver lista de variables disponibles]      │
│                                               │
├──────────────────────────────────────────────┤
│                     [Cancelar] [Crear Plantilla] │
└──────────────────────────────────────────────┘
```

---

## 10. Testing

### 10.1 Unit Tests

**Utilidades**:
```typescript
// lib/plantillas/__tests__/resolver-variables.test.ts
describe('resolverVariables', () => {
  it('resuelve variables de empleado correctamente', async () => {
    const { resueltas } = await resolverVariables(
      ['empleado_nombre', 'empleado_email'],
      empleadoMockId
    );
    
    expect(resueltas.empleado_nombre).toBe('Juan Pérez');
    expect(resueltas.empleado_email).toBe('juan@example.com');
  });
  
  it('detecta variables faltantes', async () => {
    const { faltantes } = await resolverVariables(
      ['empleado_nss'],
      empleadoSinNSSId
    );
    
    expect(faltantes).toContain('empleado_nss');
  });
});

// lib/plantillas/__tests__/generar-documento.test.ts
describe('generarDocumento', () => {
  it('genera DOCX correctamente con variables', async () => {
    const buffer = await generarDocumento(plantillaS3Key, {
      empleado_nombre: 'Juan Pérez',
      fecha_actual: '12/11/2025'
    });
    
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
```

### 10.2 Integration Tests

**APIs**:
```typescript
// app/api/plantillas/__tests__/route.test.ts
describe('GET /api/plantillas', () => {
  it('lista plantillas oficiales y personalizadas', async () => {
    const response = await GET(mockRequest);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.plantillas).toHaveLength(5);
    expect(data.plantillas[0].tipo).toBe('oficial');
  });
});

describe('POST /api/plantillas/[id]/generar', () => {
  it('genera documentos para empleados seleccionados', async () => {
    const response = await POST(mockRequest, {
      empleadoIds: [emp1Id, emp2Id],
      configuracion: { notificar: true }
    });
    
    const data = await response.json();
    expect(data.resumen.generadosExitosos).toBe(2);
  });
});
```

### 10.3 E2E Tests (Playwright)

```typescript
// tests/e2e/plantillas.spec.ts
test('HR Admin puede subir plantilla personalizada', async ({ page }) => {
  await page.goto('/hr/plantillas');
  await page.click('text=Nueva Plantilla');
  
  await page.fill('input[name="nombre"]', 'Mi Plantilla');
  await page.selectOption('select[name="categoria"]', 'personal');
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/plantilla.docx');
  
  await page.click('button:has-text("Crear Plantilla")');
  
  await expect(page.locator('text=Mi Plantilla')).toBeVisible();
});

test('HR Admin puede generar documentos masivamente', async ({ page }) => {
  await page.goto('/hr/plantillas');
  await page.click('button:has-text("Generar")');
  
  await page.check('text=Todos los empleados');
  await page.click('button:has-text("Generar")');
  
  await expect(page.locator('text=generados exitosamente')).toBeVisible();
});
```

---

## 11. Próximos Pasos

### Inmediatos (Sprint 1 - Fase 1 MVP)

1. ✅ Revisar y aprobar esta especificación
2. ✅ Crear modelos en Prisma Schema
3. ✅ Ejecutar migración de BD
4. ✅ Instalar librerías (`docxtemplater`, `pizzip`)
5. ✅ Implementar utilidades básicas
6. ✅ Crear APIs esenciales
7. ✅ Desarrollar UI básica
8. ✅ Crear plantillas oficiales (seeders)

### Corto Plazo (Sprint 2-3 - Fase 2)

1. ✅ Implementar upload de plantillas personalizadas
2. ✅ Sistema de previsualización
3. ✅ Mejoras en UI/UX
4. ✅ Testing completo

### Mediano Plazo (Sprint 4-5 - Fase 3-4)

1. ✅ Soporte para PDFs rellenables
2. ✅ Integración con módulos existentes (Contratos, Ausencias)
3. ✅ Optimizaciones de performance

### Largo Plazo (Futuro)

1. ✅ Integración con Firma Digital
2. ✅ Editor visual de plantillas (WYSIWYG)
3. ✅ Plantillas condicionales (if/else, loops)
4. ✅ Versioning de plantillas
5. ✅ Analytics de uso de plantillas

---

## 12. Recursos y Referencias

### Documentación Técnica

- **docxtemplater**: https://docxtemplater.com/
  - Docs: https://docxtemplater.com/docs/get-started/
  - Variables: https://docxtemplater.com/docs/tag-types/
  - Loops: https://docxtemplater.com/docs/tag-types/#loops
  - Conditions: https://docxtemplater.com/docs/tag-types/#conditions

- **pdf-lib**: https://pdf-lib.js.org/
  - Filling forms: https://pdf-lib.js.org/docs/api/form

- **PizZip**: https://stuk.github.io/jszip/

### Ejemplos de Plantillas Oficiales (España)

- **Modelo 145**: https://www.agenciatributaria.es/AEAT.internet/Inicio/La_Agencia_Tributaria/Modelos_y_formularios/Modelo_145__Comunicacion_de_datos_del_trabajador_al_pagador_de_rentas_del_trabajo_para_practicar_la_retencion_a_cuenta_del_IRPF.shtml

- **Modelo 190**: https://www.agenciatributaria.es/AEAT.internet/Inicio/_Segmentos_/Empresas_y_profesionales/Empresas/Retenciones_e_ingresos_a_cuenta/Rentas_del_trabajo_y_de_actividades_economicas/Modelos_190_y_390__Resumen_anual_de_retenciones_e_ingresos_a_cuenta/Modelo_190_.shtml

---

## Apéndice A: Estructura de Archivos

```
prisma/
└── schema.prisma (modificado con PlantillaDocumento, DocumentoGenerado)

lib/
└── plantillas/
    ├── resolver-variables.ts
    ├── generar-documento.ts
    ├── extraer-variables.ts
    └── __tests__/
        ├── resolver-variables.test.ts
        ├── generar-documento.test.ts
        └── extraer-variables.test.ts

app/
├── api/
│   └── plantillas/
│       ├── route.ts (GET, POST)
│       ├── [id]/
│       │   ├── route.ts (GET, PATCH, DELETE)
│       │   ├── generar/
│       │   │   └── route.ts (POST)
│       │   └── previsualizar/
│       │       └── route.ts (GET)
│       └── variables/
│           └── route.ts (GET)
│
└── (dashboard)/
    └── hr/
        └── plantillas/
            ├── page.tsx
            └── [id]/
                └── page.tsx

components/
└── hr/
    ├── plantillas-lista.tsx
    ├── plantilla-card.tsx
    ├── nueva-plantilla-modal.tsx
    ├── generar-documentos-modal.tsx
    └── previsualizar-plantilla-modal.tsx

prisma/
└── seeds/
    └── plantillas-oficiales.ts (seeder para plantillas predefinidas)

uploads/
└── plantillas/
    ├── oficiales/
    │   ├── contrato-indefinido.docx
    │   ├── modelo-145.pdf
    │   └── justificante-vacaciones.docx
    └── empresas/
        └── [empresaId]/
            └── [plantillaId].docx

docs/
└── especificaciones/
    └── plantillas-documentos.md (este archivo)
```

---

## Apéndice B: Ejemplo de Plantilla DOCX

**Archivo**: `contrato-indefinido.docx`

```
CONTRATO DE TRABAJO INDEFINIDO

En {{empresa_ciudad}}, a {{fecha_actual}}

REUNIDOS

De una parte, {{empresa_nombre}}, con CIF {{empresa_cif}}, y domicilio social en {{empresa_direccion}}, representada por su representante legal.

Y de otra parte, {{empleado_nombre}} {{empleado_apellidos}}, con DNI/NIE {{empleado_nif}}, domiciliado/a en {{empleado_direccion_completa}}.

EXPONEN

Que ambas partes convienen celebrar un CONTRATO DE TRABAJO, con arreglo a las siguientes

CLÁUSULAS

PRIMERA.- Don/Doña {{empleado_nombre}} {{empleado_apellidos}} prestará sus servicios como {{contrato_puesto}} en la empresa {{empresa_nombre}}.

SEGUNDA.- El contrato de trabajo tendrá carácter de INDEFINIDO, con inicio el día {{contrato_fecha_inicio}}.

TERCERA.- La retribución bruta anual será de {{contrato_salario_bruto_anual}} euros, distribuida en 14 pagas (12 mensuales + 2 extraordinarias).

CUARTA.- La jornada de trabajo será de {{jornada_horas_semanales}} horas semanales, distribu idas según la jornada {{jornada_nombre}}.

QUINTA.- El/la trabajador/a tendrá derecho a {{vacaciones_dias_totales}} días laborables de vacaciones anuales retribuidas.

[...]

Y en prueba de conformidad, ambas partes firman el presente contrato en el lugar y fecha indicados en el encabezamiento.

Por la Empresa:                    El/la Trabajador/a:

_________________                  _________________
```

---

**FIN DEL DOCUMENTO**

**Versión**: 1.0.0  
**Última actualización**: 12 de Noviembre 2025  
**Autor**: Sofia Roig (con asistencia de Claude AI)  
**Proyecto**: Clousadmin - Sistema de Gestión de RRHH

---



