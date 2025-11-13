# ✅ Plantillas de Documentos - Checklist de Implementación

**Proyecto**: Clousadmin  
**Fase**: MVP - Sprint 1  
**Duración Estimada**: 1.5 semanas

---

## 📋 Pre-requisitos

### Antes de Empezar

- [ ] **Revisar y aprobar** especificación técnica (`plantillas-documentos.md`)
- [ ] **Leer** guía de implementación (`plantillas-documentos-implementacion.md`)
- [ ] **Decidir** qué plantillas oficiales incluir en MVP
- [ ] **Verificar** que AWS S3 está configurado y funcionando
- [ ] **Confirmar** que módulo de documentos existente funciona correctamente

### Diseño de Plantillas Word

- [ ] **Crear** plantilla "Contrato Indefinido" (`.docx`)
  - [ ] Diseñar formato según legislación española
  - [ ] Incluir todas las variables necesarias: `{{empleado_nombre}}`, etc.
  - [ ] Validar que se ve bien en Word
  - [ ] Guardar en `uploads/plantillas/oficiales/contrato-indefinido.docx`

- [ ] **Crear** plantilla "Modelo 145" (`.docx`)
  - [ ] Basar en formulario oficial de AEAT
  - [ ] Incluir variables de datos personales y fiscales
  - [ ] Guardar en `uploads/plantillas/oficiales/modelo-145.docx`

- [ ] **Crear** plantilla "Justificante de Vacaciones" (`.docx`)
  - [ ] Formato oficial de justificante
  - [ ] Variables: fechas, días, aprobador
  - [ ] Guardar en `uploads/plantillas/oficiales/justificante-vacaciones.docx`

- [ ] **Crear** plantilla "Carta de Bienvenida" (`.docx`)
  - [ ] Tono corporativo y acogedor
  - [ ] Variables: nombre, puesto, manager, fecha inicio
  - [ ] Guardar en `uploads/plantillas/oficiales/carta-bienvenida.docx`

---

## 🗄️ Paso 1: Base de Datos (Día 1)

### 1.1 Actualizar Prisma Schema

- [ ] **Abrir** `prisma/schema.prisma`
- [ ] **Agregar** modelo `PlantillaDocumento`:
  ```prisma
  model PlantillaDocumento {
    id        String  @id @default(uuid())
    empresaId String?
    nombre      String  @db.VarChar(255)
    descripcion String? @db.Text
    categoria   String  @db.VarChar(100)
    tipo        String  @db.VarChar(50)
    formato     String  @db.VarChar(20)
    s3Key       String  @unique @db.Text
    s3Bucket    String  @db.VarChar(255)
    variablesUsadas Json @default("[]")
    activa               Boolean @default(true)
    esOficial            Boolean @default(false)
    requiereContrato     Boolean @default(false)
    requiereFirma        Boolean @default(false)
    carpetaDestinoDefault String? @db.VarChar(50)
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    empresa             Empresa?            @relation(fields: [empresaId], references: [id], onDelete: Cascade)
    documentosGenerados DocumentoGenerado[]
    @@index([empresaId])
    @@index([tipo])
    @@index([categoria])
    @@index([activa])
    @@map("plantillas_documentos")
  }
  ```

- [ ] **Agregar** modelo `DocumentoGenerado`:
  ```prisma
  model DocumentoGenerado {
    id          String @id @default(uuid())
    empresaId   String
    empleadoId  String
    plantillaId String
    documentoId String @unique
    generadoPor String?
    generadoEn  DateTime @default(now())
    variablesUtilizadas Json
    notificado Boolean @default(false)
    visto      Boolean @default(false)
    vistoEn    DateTime?
    requiereFirma Boolean   @default(false)
    firmado       Boolean   @default(false)
    firmadoEn     DateTime?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    empresa   Empresa            @relation(fields: [empresaId], references: [id], onDelete: Cascade)
    empleado  Empleado           @relation(fields: [empleadoId], references: [id], onDelete: Cascade)
    plantilla PlantillaDocumento @relation(fields: [plantillaId], references: [id], onDelete: Cascade)
    documento Documento          @relation(fields: [documentoId], references: [id], onDelete: Cascade)
    @@index([empresaId])
    @@index([empleadoId])
    @@index([plantillaId])
    @@index([documentoId])
    @@index([generadoEn])
    @@index([firmado])
    @@map("documentos_generados")
  }
  ```

- [ ] **Actualizar** modelo `Documento` (agregar relación):
  ```prisma
  model Documento {
    // ... campos existentes ...
    generadoDesde DocumentoGenerado?
    // ... resto de relaciones ...
  }
  ```

- [ ] **Actualizar** modelo `Empresa` (agregar relaciones):
  ```prisma
  model Empresa {
    // ... campos existentes ...
    plantillasDocumentos PlantillaDocumento[]
    documentosGenerados  DocumentoGenerado[]
    // ... resto de relaciones ...
  }
  ```

- [ ] **Actualizar** modelo `Empleado` (agregar relación):
  ```prisma
  model Empleado {
    // ... campos existentes ...
    documentosGenerados DocumentoGenerado[]
    // ... resto de relaciones ...
  }
  ```

### 1.2 Ejecutar Migración

- [ ] **Generar migración**:
  ```bash
  npx prisma migrate dev --name add_plantillas_documentos
  ```

- [ ] **Verificar** que migración se ejecutó correctamente
- [ ] **Generar cliente Prisma**:
  ```bash
  npx prisma generate
  ```

- [ ] **Verificar** que tipos TypeScript se generaron correctamente

---

## 📦 Paso 2: Instalación de Librerías (Día 1)

### 2.1 Instalar Dependencias

- [ ] **Instalar** `docxtemplater` y `pizzip`:
  ```bash
  npm install docxtemplater pizzip
  ```

- [ ] **Instalar tipos TypeScript**:
  ```bash
  npm install --save-dev @types/docxtemplater
  ```

- [ ] **Verificar** que se agregaron a `package.json`

### 2.2 Test de Instalación

- [ ] **Crear** archivo `scripts/test-docxtemplater.ts` (ver guía de implementación)
- [ ] **Ejecutar test**:
  ```bash
  npx tsx scripts/test-docxtemplater.ts
  ```
- [ ] **Verificar** que se genera `output.docx` correctamente

---

## 🛠️ Paso 3: Utilidades Core (Día 2-3)

### 3.1 Crear Estructura de Carpetas

- [ ] **Crear** directorio `lib/plantillas/`
- [ ] **Crear** directorio `lib/plantillas/__tests__/`

### 3.2 Implementar Utilidades

- [ ] **Crear** `lib/plantillas/tipos.ts`
  - [ ] Definir interfaces: `VariableDefinicion`, `VariablesResueltas`, etc.
  - [ ] Copiar código de la guía de implementación

- [ ] **Crear** `lib/plantillas/constantes.ts`
  - [ ] Definir array `VARIABLES_DISPONIBLES` con 50+ variables
  - [ ] Crear objeto `VARIABLES_POR_CATEGORIA`
  - [ ] Copiar código de la guía de implementación

- [ ] **Crear** `lib/plantillas/resolver-variables.ts`
  - [ ] Implementar función `resolverVariables(variables, empleadoId)`
  - [ ] Implementar función `obtenerValorVariable(variable, empleado)`
  - [ ] Manejar campos encriptados (NIF, NSS, IBAN)
  - [ ] Formatear fechas y números
  - [ ] Copiar código de la guía de implementación
  - [ ] **Testing**: Probar con empleado de prueba

- [ ] **Crear** `lib/plantillas/generar-documento.ts`
  - [ ] Implementar función `generarDocumento(plantillaS3Key, variables)`
  - [ ] Descargar plantilla de S3
  - [ ] Usar `docxtemplater` para sustituir variables
  - [ ] Retornar buffer del documento generado
  - [ ] Copiar código de la guía de implementación
  - [ ] **Testing**: Generar documento de prueba

- [ ] **Crear** `lib/plantillas/extraer-variables.ts`
  - [ ] Implementar función `extraerVariables(fileBuffer)`
  - [ ] Usar regex para encontrar `{{variables}}`
  - [ ] Retornar array de variables únicas
  - [ ] Copiar código de la guía de implementación
  - [ ] **Testing**: Extraer variables de plantilla de prueba

- [ ] **Crear** `lib/plantillas/helpers.ts`
  - [ ] Implementar función `generarDocumentoDesdeContrato(empleadoId, contratoId)`
  - [ ] (Opcional) Otras funciones helper según necesidad

### 3.3 Unit Tests

- [ ] **Crear** `lib/plantillas/__tests__/resolver-variables.test.ts`
  - [ ] Test: Resuelve variables de empleado correctamente
  - [ ] Test: Detecta variables faltantes
  - [ ] Test: Desencripta campos sensibles

- [ ] **Crear** `lib/plantillas/__tests__/generar-documento.test.ts`
  - [ ] Test: Genera DOCX correctamente
  - [ ] Test: Sustituye variables
  - [ ] Test: Maneja variables faltantes

- [ ] **Ejecutar tests**:
  ```bash
  npm test lib/plantillas
  ```

---

## 🌐 Paso 4: APIs (Día 4-5)

### 4.1 Listar Plantillas

- [ ] **Crear** `app/api/plantillas/route.ts`
- [ ] **Implementar** `GET /api/plantillas`:
  - [ ] Validar autenticación
  - [ ] Filtrar por tipo (oficial, personalizada, todas)
  - [ ] Filtrar por categoría
  - [ ] Incluir `_count.documentosGenerados`
  - [ ] Ordenar por `esOficial DESC, createdAt DESC`
  - [ ] Retornar JSON con array de plantillas
- [ ] **Testing**: Probar endpoint con Postman/Thunder Client

### 4.2 Subir Plantilla Personalizada (Fase 2)

- [ ] **Implementar** `POST /api/plantillas`:
  - [ ] Validar rol (solo HR Admin)
  - [ ] Validar FormData (file, nombre, categoría)
  - [ ] Validar formato DOCX
  - [ ] Extraer variables con `extraerVariables()`
  - [ ] Subir archivo a S3
  - [ ] Crear registro en BD
  - [ ] Retornar plantilla creada
- [ ] **Testing**: Subir plantilla de prueba

### 4.3 Generar Documentos Masivamente

- [ ] **Crear** `app/api/plantillas/[id]/generar/route.ts`
- [ ] **Implementar** `POST /api/plantillas/[id]/generar`:
  - [ ] Validar autenticación y rol (HR Admin)
  - [ ] Validar body (empleadoIds, configuracion)
  - [ ] Buscar plantilla
  - [ ] Loop por cada empleadoId:
    - [ ] Resolver variables
    - [ ] Generar documento con `generarDocumento()`
    - [ ] Subir a S3
    - [ ] Crear registro `Documento`
    - [ ] Crear registro `DocumentoGenerado`
    - [ ] (Opcional) Enviar notificación
    - [ ] Catch errores individuales
  - [ ] Retornar resumen (exitosos, fallidos)
- [ ] **Testing**: Generar documentos para 3 empleados de prueba

### 4.4 Obtener Variables Disponibles

- [ ] **Crear** `app/api/plantillas/variables/route.ts`
- [ ] **Implementar** `GET /api/plantillas/variables`:
  - [ ] Retornar `VARIABLES_DISPONIBLES` agrupadas por categoría
  - [ ] Incluir ejemplos
- [ ] **Testing**: Verificar JSON de variables

### 4.5 Obtener Detalle de Plantilla

- [ ] **Crear** `app/api/plantillas/[id]/route.ts`
- [ ] **Implementar** `GET /api/plantillas/[id]`:
  - [ ] Buscar plantilla por ID
  - [ ] Validar permisos (plantilla oficial o de la empresa)
  - [ ] Retornar plantilla completa
- [ ] **Testing**: Obtener plantilla existente

### 4.6 Previsualización (Fase 2 - Opcional en MVP)

- [ ] **Crear** `app/api/plantillas/[id]/previsualizar/route.ts`
- [ ] **Implementar** `GET /api/plantillas/[id]/previsualizar?empleadoId=xxx`:
  - [ ] Resolver variables con datos del empleado
  - [ ] Generar documento temporal
  - [ ] Subir a S3 con TTL (o retornar stream)
  - [ ] Retornar URL de previsualización
  - [ ] Retornar variables resueltas y faltantes

---

## 🎨 Paso 5: Componentes UI (Día 6-7)

### 5.1 Página Principal de Plantillas

- [ ] **Crear** `app/(dashboard)/hr/plantillas/page.tsx`
- [ ] **Implementar** Server Component:
  - [ ] Fetch plantillas desde API
  - [ ] Pasar datos a Client Component
- [ ] **Agregar** al menú de navegación HR

### 5.2 Componente Lista de Plantillas

- [ ] **Crear** `components/hr/plantillas-lista.tsx`
- [ ] **Implementar**:
  - [ ] Estado: `plantillas`, `loading`, `filtro`
  - [ ] Hook `useEffect` para cargar plantillas
  - [ ] Filtros: Todas, Oficiales, Personalizadas
  - [ ] Agrupar por categoría
  - [ ] Renderizar cards de plantillas
  - [ ] Botones de acción: Generar, Previsualizar, Editar, Eliminar
  - [ ] Mostrar estadísticas (usos, variables)

- [ ] **Estilizar** con Tailwind + shadcn/ui:
  - [ ] Usar `Card`, `Button`, `Badge`
  - [ ] Layout responsive (grid)
  - [ ] Iconos (lucide-react)

### 5.3 Modal: Nueva Plantilla (Fase 2)

- [ ] **Crear** `components/hr/nueva-plantilla-modal.tsx`
- [ ] **Implementar**:
  - [ ] Formulario con `react-hook-form` + `zod`
  - [ ] Campos: nombre, descripción, categoría, carpeta destino
  - [ ] Input file (DOCX)
  - [ ] Validación de formato
  - [ ] Submit → `POST /api/plantillas`
  - [ ] Mostrar variables detectadas
  - [ ] Confirmar creación

### 5.4 Modal: Generar Documentos

- [ ] **Crear** `components/hr/generar-documentos-modal.tsx`
- [ ] **Implementar**:
  - [ ] Props: `plantilla`, `open`, `onClose`, `onSuccess`
  - [ ] Selector de empleados:
    - [ ] Radio: Todos, Por equipo, Por departamento, Manual
    - [ ] Si manual: Búsqueda + checkboxes
  - [ ] Configuración:
    - [ ] Input: Nombre documento (con template)
    - [ ] Select: Carpeta destino
    - [ ] Checkbox: Notificar empleados
  - [ ] Botones:
    - [ ] "Vista Previa" (Fase 2)
    - [ ] "Generar" → `POST /api/plantillas/[id]/generar`
  - [ ] Loading state durante generación
  - [ ] Mostrar resumen al finalizar (exitosos, fallidos)
  - [ ] Lista de documentos generados con links

### 5.5 Modal: Previsualización (Fase 2 - Opcional)

- [ ] **Crear** `components/hr/previsualizar-plantilla-modal.tsx`
- [ ] **Implementar**:
  - [ ] Selector de empleado (búsqueda)
  - [ ] Fetch `GET /api/plantillas/[id]/previsualizar?empleadoId=xxx`
  - [ ] Visor de documento (iframe o descarga)
  - [ ] Lista de variables resueltas (con iconos de estado)
  - [ ] Lista de variables faltantes (con advertencias)
  - [ ] Botón: Descargar previsualización

---

## 🌱 Paso 6: Seeders (Día 8)

### 6.1 Crear Seeder de Plantillas Oficiales

- [ ] **Crear** `prisma/seeds/plantillas-oficiales.ts`
- [ ] **Implementar** función `seedPlantillasOficiales()`:
  - [ ] Array de plantillas a crear:
    - Contrato Indefinido
    - Modelo 145
    - Justificante Vacaciones
    - Carta Bienvenida
  - [ ] Para cada plantilla:
    - [ ] Verificar si ya existe
    - [ ] Leer archivo DOCX desde `uploads/plantillas/oficiales/`
    - [ ] Subir a S3
    - [ ] Crear registro en `PlantillaDocumento`
  - [ ] Logging de progreso

- [ ] **Ejecutar seeder**:
  ```bash
  npx tsx prisma/seeds/plantillas-oficiales.ts
  ```

- [ ] **Verificar** en BD que se crearon 4 plantillas oficiales

### 6.2 Actualizar Seeder Principal (Opcional)

- [ ] **Editar** `prisma/seeds/index.ts` (si existe)
- [ ] **Agregar** llamada a `seedPlantillasOficiales()`

---

## 🧪 Paso 7: Testing Integral (Día 9)

### 7.1 Testing Manual (E2E)

- [ ] **Escenario 1: Listar plantillas**
  - [ ] Navegar a `/hr/plantillas`
  - [ ] Verificar que se muestran 4 plantillas oficiales
  - [ ] Probar filtros (Todas, Oficiales)
  - [ ] Verificar cards con información correcta

- [ ] **Escenario 2: Generar documento individual**
  - [ ] Seleccionar plantilla "Carta de Bienvenida"
  - [ ] Click "Generar"
  - [ ] Seleccionar 1 empleado manualmente
  - [ ] Configurar nombre y carpeta
  - [ ] Generar
  - [ ] Verificar que documento se creó en BD
  - [ ] Verificar que archivo existe en S3
  - [ ] Descargar y abrir documento en Word
  - [ ] Verificar que variables se sustituyeron correctamente

- [ ] **Escenario 3: Generar documentos masivos**
  - [ ] Seleccionar plantilla "Contrato Indefinido"
  - [ ] Click "Generar"
  - [ ] Seleccionar "Todos los empleados" (o 5 empleados de prueba)
  - [ ] Generar
  - [ ] Verificar resumen (5 exitosos, 0 fallidos)
  - [ ] Verificar que 5 documentos se crearon en BD
  - [ ] Descargar uno y verificar sustitución de variables

- [ ] **Escenario 4: Variables faltantes**
  - [ ] Seleccionar plantilla que requiera campo que falta (ej: IBAN)
  - [ ] Generar para empleado sin IBAN
  - [ ] Verificar que aparece en "fallidos" con mensaje claro
  - [ ] Rellenar IBAN del empleado
  - [ ] Reintentar generación
  - [ ] Verificar que ahora funciona

- [ ] **Escenario 5: Notificaciones**
  - [ ] Generar documento con "Notificar empleados" activado
  - [ ] Verificar que empleado recibe notificación
  - [ ] Como empleado, ver notificación
  - [ ] Click en notificación → redirige a documento
  - [ ] Verificar que documento se marca como "visto"

### 7.2 Testing Automatizado

- [ ] **Unit tests** de utilidades (ya hecho en Paso 3.3)
- [ ] **Integration tests** de APIs:
  - [ ] Test `GET /api/plantillas`
  - [ ] Test `POST /api/plantillas/[id]/generar`
  - [ ] Test `GET /api/plantillas/variables`

- [ ] **E2E tests** con Playwright (opcional):
  - [ ] Test: HR puede ver plantillas
  - [ ] Test: HR puede generar documentos
  - [ ] Test: Empleado recibe notificación

---

## 🚀 Paso 8: Integración con Módulos Existentes (Día 10)

### 8.1 Integración con Módulo de Contratos

- [ ] **Editar** formulario de creación de contrato
- [ ] **Agregar** checkbox: "Generar documento de contrato automáticamente"
- [ ] **Al guardar contrato**:
  - [ ] Si checkbox activado → llamar `generarDocumentoDesdeContrato()`
  - [ ] Vincular documento generado con contrato (`contrato.documentoId`)

- [ ] **Testing**:
  - [ ] Crear contrato con checkbox activado
  - [ ] Verificar que documento se genera automáticamente
  - [ ] Verificar vínculo contrato ↔ documento

### 8.2 Integración con Módulo de Ausencias

- [ ] **Editar** workflow de aprobación de ausencias
- [ ] **Al aprobar ausencia**:
  - [ ] Generar justificante automáticamente
  - [ ] Usar plantilla "Justificante de Vacaciones"
  - [ ] Vincular documento con ausencia (`ausencia.documentoId`)
  - [ ] Enviar notificación al empleado

- [ ] **Agregar** botón "Descargar Justificante" en vista de ausencias del empleado

- [ ] **Testing**:
  - [ ] Crear y aprobar ausencia
  - [ ] Verificar que justificante se genera
  - [ ] Como empleado, descargar justificante
  - [ ] Verificar contenido del justificante

### 8.3 Integración con Módulo de Onboarding (Opcional)

- [ ] **Al completar onboarding**:
  - [ ] Generar "Carta de Bienvenida" automáticamente
  - [ ] Enviar notificación al empleado

---

## 📝 Paso 9: Documentación y Deploy (Día 11)

### 9.1 Documentación de Usuario

- [ ] **Crear** guía de usuario en notion/docs (opcional)
- [ ] **Documentar**:
  - [ ] Cómo crear plantillas en Word con variables
  - [ ] Cómo subir plantilla personalizada (Fase 2)
  - [ ] Cómo generar documentos masivamente
  - [ ] Cómo ver documentos generados
  - [ ] Troubleshooting común

### 9.2 Documentación Técnica

- [ ] **Actualizar** `README.md` (si aplica)
- [ ] **Documentar** en `docs/`:
  - [ ] Arquitectura de plantillas
  - [ ] Variables disponibles
  - [ ] Cómo agregar nuevas variables
  - [ ] Cómo agregar nuevas plantillas oficiales

### 9.3 Deploy

- [ ] **Verificar** que `.env` tiene variables necesarias:
  - [ ] `STORAGE_BUCKET`
  - [ ] `STORAGE_ENDPOINT`
  - [ ] `STORAGE_ACCESS_KEY`
  - [ ] `STORAGE_SECRET_KEY`
  - [ ] `STORAGE_REGION`

- [ ] **Ejecutar** migraciones en staging:
  ```bash
  npx prisma migrate deploy
  ```

- [ ] **Ejecutar** seeders en staging:
  ```bash
  npx tsx prisma/seeds/plantillas-oficiales.ts
  ```

- [ ] **Testing en staging**:
  - [ ] Probar flujo completo
  - [ ] Verificar generación de documentos
  - [ ] Verificar que S3 funciona correctamente

- [ ] **Deploy a producción**:
  - [ ] Merge a rama `main`
  - [ ] Deploy automático (Amplify/Vercel)
  - [ ] Ejecutar migraciones en producción
  - [ ] Ejecutar seeders en producción

- [ ] **Verificación post-deploy**:
  - [ ] Verificar que plantillas se cargaron
  - [ ] Probar generación de 1 documento de prueba
  - [ ] Verificar que no hay errores en logs

---

## ✅ Checklist Final

### Funcionalidades Core

- [ ] ✅ **Listar plantillas** (oficiales + personalizadas)
- [ ] ✅ **Generar documentos masivamente** (múltiples empleados)
- [ ] ✅ **50+ variables del sistema** funcionando
- [ ] ✅ **4 plantillas oficiales** disponibles
- [ ] ✅ **Tracking completo** (DocumentoGenerado)
- [ ] ✅ **Notificaciones** a empleados
- [ ] ✅ **Integración con Contratos** (opcional)
- [ ] ✅ **Integración con Ausencias** (justificantes automáticos)

### Calidad

- [ ] ✅ **Unit tests** de utilidades pasando
- [ ] ✅ **Integration tests** de APIs pasando
- [ ] ✅ **Testing manual E2E** completado
- [ ] ✅ **No hay linter errors**
- [ ] ✅ **Documentación** completa

### Deploy

- [ ] ✅ **Migraciones** ejecutadas en producción
- [ ] ✅ **Seeders** ejecutados en producción
- [ ] ✅ **Funcionalidad verificada** en producción
- [ ] ✅ **Sin errores** en logs de producción

---

## 🎉 ¡Completado!

Si todos los checkboxes están marcados, has implementado exitosamente el **MVP de Plantillas de Documentos**. 

**Próximos pasos**:
1. Recoger feedback de usuarios (HR Admins)
2. Iterar con mejoras
3. Planificar Fase 2 (Plantillas personalizadas)
4. Planificar Fase 3 (PDFs rellenables)
5. Integrar con Firma Digital (Fase 4)

---

**Versión**: 1.0.0  
**Fecha**: 12 de Noviembre 2025  
**Proyecto**: Clousadmin

