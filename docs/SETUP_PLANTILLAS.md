# 📋 Setup Sistema de Plantillas

Guía completa para configurar y activar el sistema de plantillas de documentos con IA.

## 📦 Requisitos Previos

### 1. Redis (OBLIGATORIO)
Redis es necesario para BullMQ (procesamiento asíncrono de documentos).

```bash
# Instalar Redis (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install redis-server

# Iniciar Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar que funciona
redis-cli ping
# Debe responder: PONG
```

**Docker alternativa:**
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 2. PostgreSQL
Base de datos principal (ya debería estar configurado).

### 3. OpenAI API Key (OBLIGATORIO para IA)
Obtener en: https://platform.openai.com/api-keys

El sistema usa GPT-4o-mini para resolver variables de plantillas de forma dinámica.

---

## ⚙️ Configuración

### 1. Variables de Entorno

Crear/actualizar archivo `.env`:

```bash
# Copiar desde ejemplo
cp .env.example .env
```

**Variables OBLIGATORIAS para plantillas:**

```bash
# Redis (BullMQ)
REDIS_URL="redis://localhost:6379"
REDIS_TLS="false"

# OpenAI (Resolución IA de variables)
OPENAI_API_KEY="sk-your-openai-api-key-here"

# Hetzner Object Storage
STORAGE_ENDPOINT="https://fsn1.your-objectstorage.com"
STORAGE_REGION="eu-central-1"
STORAGE_ACCESS_KEY="your-access-key"
STORAGE_SECRET_KEY="your-secret-key"
STORAGE_BUCKET="clousadmin"
ENABLE_CLOUD_STORAGE="true"
```

### 2. Migraciones de Base de Datos

```bash
# Aplicar migraciones (incluye modelos de plantillas)
npx prisma migrate deploy

# O en desarrollo
npx prisma migrate dev

# Generar cliente Prisma
npx prisma generate
```

**Modelos añadidos:**
- `PlantillaDocumento` - Plantillas (oficiales + personalizadas)
- `DocumentoGenerado` - Tracking de documentos generados
- `VariableMapping` - Caché IA de mappings de variables
- `JobGeneracionDocumentos` - Jobs de BullMQ
- `SolicitudFirma` - Solicitudes de firma digital
- `Firma` - Firmas individuales

### 3. Dependencias

Las dependencias ya están en `package.json`:

```json
{
  "docxtemplater": "^3.50.0",
  "pizzip": "^3.1.7",
  "pdf-lib": "^1.17.1",
  "bullmq": "^5.14.2",
  "ioredis": "^5.4.1",
  "openai": "^4.63.0"
}
```

Si faltan, instalar:
```bash
npm install
```

---

## 🚀 Iniciar Sistema

### 1. Verificar Redis
```bash
redis-cli ping
# Debe responder: PONG
```

### 2. Iniciar Next.js
```bash
npm run dev
```

El worker de BullMQ se inicia automáticamente vía `instrumentation.ts`.

### 3. Logs a observar
```
[Instrumentation] Inicializando servicios en background...
[Instrumentation] Worker de documentos iniciado
[Redis] Conectado correctamente
[Worker] Ready to process jobs
```

---

## 📁 Estructura de Archivos

```
lib/plantillas/
├── tipos.ts                    # TypeScript interfaces
├── constantes.ts               # 50+ variables del sistema
├── ia-resolver.ts              # IA con 5 niveles de caché
├── generar-documento.ts        # Generación DOCX
├── pdf-rellenable.ts           # Generación PDF
├── sanitizar.ts                # Utilidades de formato
├── queue.ts                    # BullMQ worker + queue
└── index.ts                    # Exports

app/api/plantillas/
├── route.ts                    # GET, POST plantillas
├── [id]/route.ts               # GET, PATCH, DELETE plantilla
├── [id]/generar/route.ts       # POST generar documentos
├── jobs/[id]/route.ts          # GET, DELETE job status
└── variables/route.ts          # GET variables disponibles

components/hr/
├── plantillas-tab.tsx          # Tab en modal onboarding
└── generar-desde-plantilla-modal.tsx  # Modal de generación

instrumentation.ts              # Auto-init del worker
next.config.ts                  # instrumentationHook: true
```

---

## 🎯 Uso del Sistema

### 1. Subir Plantilla (HR Admin)

**Ubicación:** Gestionar On/Offboarding → Tab "Plantillas"

1. Clic en "Subir Plantilla"
2. Seleccionar archivo DOCX o PDF
3. Rellenar nombre, descripción, categoría
4. El sistema automáticamente:
   - Extrae variables `{{variable_nombre}}`
   - Mapea con IA a schema de Prisma
   - Almacena en S3 o local

### 2. Generar Documentos

**Ubicación:** Documentos → "Generar desde Plantilla"

**Flujo de 4 pasos:**

1. **Seleccionar Plantilla** - Elegir plantilla oficial o personalizada
2. **Seleccionar Empleados** - Uno o múltiples empleados
3. **Configurar Opciones:**
   - Nombre del documento
   - Carpeta destino
   - Notificar empleados
   - Requiere firma digital (opcional)
4. **Procesamiento Async:**
   - Job creado en BullMQ
   - Polling cada 2s del progreso
   - Barra de progreso en tiempo real
   - Auto-cierre al completar

### 3. Variables del Sistema

**50+ variables predefinidas:**

**Empleado:**
- `{{empleado_nombre}}`, `{{empleado_apellidos}}`
- `{{empleado_nif}}`, `{{empleado_email}}`
- `{{empleado_telefono}}`, `{{empleado_direccion}}`

**Empresa:**
- `{{empresa_nombre}}`, `{{empresa_cif}}`
- `{{empresa_direccion}}`, `{{empresa_telefono}}`

**Contrato:**
- `{{contrato_tipo}}`, `{{contrato_fecha_inicio}}`
- `{{contrato_salario_bruto}}`, `{{contrato_categoria}}`

**Manager:**
- `{{manager_nombre}}`, `{{manager_email}}`

**Sistema:**
- `{{fecha_hoy}}`, `{{año_actual}}`

Ver todas: `lib/plantillas/constantes.ts` (346 líneas)

---

## 🧪 Testing

### 1. Verificar Redis
```bash
redis-cli
> PING
PONG
> SET test "hello"
OK
> GET test
"hello"
```

### 2. Verificar Worker BullMQ

En logs de `npm run dev`:
```
[Instrumentation] Worker de documentos iniciado
[Redis] Conectado correctamente
```

### 3. Test End-to-End

1. Subir plantilla de prueba con variables
2. Generar documento para 1 empleado
3. Verificar progreso en modal
4. Confirmar documento en carpeta destino

### 4. Monitoreo de Jobs

**API endpoints:**
```bash
# Estado de job
GET /api/plantillas/jobs/{jobId}

# Cancelar job
DELETE /api/plantillas/jobs/{jobId}
```

---

## 🔧 Troubleshooting

### Redis no conecta
```bash
# Verificar que está corriendo
sudo systemctl status redis-server

# Ver logs
sudo journalctl -u redis-server -f

# Reiniciar
sudo systemctl restart redis-server
```

### Worker no procesa jobs
```bash
# Verificar logs de Next.js
npm run dev

# Debe mostrar:
[Worker] Ready to process jobs

# Verificar que instrumentationHook está habilitado
# En next.config.ts:
experimental: {
  instrumentationHook: true
}
```

### OpenAI API Key inválido
```bash
# Verificar variable de entorno
echo $OPENAI_API_KEY

# Debe empezar con: sk-

# Verificar que tiene créditos en:
https://platform.openai.com/account/usage
```

### S3 no configurado (OK en dev)
Si no hay S3, el sistema usa almacenamiento local en `/uploads`.

```bash
mkdir -p /tmp/uploads
```

---

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (UI)                     │
│  ┌──────────────────┐     ┌──────────────────────┐ │
│  │ PlantillasTab    │     │ GenerarDesde         │ │
│  │ (Onboarding)     │     │ PlantillaModal       │ │
│  └──────────────────┘     └──────────────────────┘ │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                  REST APIs (Next.js)                 │
│  /api/plantillas, /api/plantillas/[id]/generar      │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│              BULLMQ QUEUE (Redis)                    │
│  Job: { plantillaId, empleadoIds[], config }        │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│       WORKER (instrumentation.ts auto-init)          │
│                                                       │
│  Para cada empleado:                                 │
│  1. Descargar plantilla de S3                        │
│  2. Resolver variables con IA (5-level cache)        │
│     - Quick mappings (<1ms)                          │
│     - Memory cache                                   │
│     - Redis cache                                    │
│     - Database (VariableMapping)                     │
│     - OpenAI GPT-4o-mini (solo 1ra vez)             │
│  3. Generar documento (DOCX/PDF)                     │
│  4. Subir a S3 / local storage                       │
│  5. Crear registro en DB                             │
│  6. Notificar empleado                               │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│              STORAGE (S3 / Local)                    │
│  Documentos generados + plantillas originales        │
└─────────────────────────────────────────────────────┘
```

---

## 💰 Costos de IA

**Modelo:** GPT-4o-mini

**Cache de 5 niveles:**
- Level 0: Variables computadas (gratis)
- Level 1: Quick mappings top 20 variables (gratis, <1ms)
- Level 2: Memory cache (gratis, <1ms)
- Level 3: Redis cache (gratis, <5ms)
- Level 4: Database VariableMapping (gratis, ~10ms)
- Level 5: OpenAI API (~$0.001 por variable nueva, 100-500ms)

**Ejemplo real:**
- Contrato con 30 variables
- 25 están en quick mappings (gratis)
- 5 nuevas requieren IA (~$0.005 total)
- Siguientes generaciones: 100% gratis (usarán caché)

**Estimado mensual:**
- 100 plantillas nuevas × 20 variables nuevas promedio
- 2,000 llamadas IA × $0.001 = **$2/mes**
- Generaciones posteriores: **$0** (todo en caché)

---

## ✅ Checklist de Implementación

- [ ] Redis instalado y corriendo
- [ ] Variables de entorno configuradas (REDIS_URL, OPENAI_API_KEY)
- [ ] Migraciones Prisma aplicadas
- [ ] npm install completo
- [ ] Next.js dev server iniciado
- [ ] Worker logs muestran conexión exitosa
- [ ] Test: Subir plantilla de prueba
- [ ] Test: Generar documento para 1 empleado
- [ ] Test: Verificar progreso en modal
- [ ] Test: Confirmar documento generado

---

## 📚 Referencias

- **Documentación BullMQ:** https://docs.bullmq.io/
- **docxtemplater:** https://docxtemplater.com/
- **OpenAI API:** https://platform.openai.com/docs/
- **Prisma:** https://www.prisma.io/docs/

---

## 🆘 Soporte

Si encuentras problemas:

1. Verificar logs de Next.js (`npm run dev`)
2. Verificar logs de Redis (`redis-cli`)
3. Revisar variables de entorno
4. Verificar que migraciones están aplicadas
5. Consultar este documento

**Archivos clave para debugging:**
- `instrumentation.ts` - Inicialización worker
- `lib/plantillas/queue.ts` - Lógica del worker
- `lib/redis.ts` - Configuración Redis
- `lib/plantillas/ia-resolver.ts` - Lógica IA

---

Última actualización: 2025-11-13
