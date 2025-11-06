# 🚀 AWS Deployment Guide - Clousadmin

Guía completa para desplegar Clousadmin en AWS usando Amplify, RDS, S3 y SES.

---

## 📋 Prerequisitos

- Cuenta AWS con créditos
- Repositorio en GitHub
- Dominio (opcional, recomendado para SES)
- Node.js 18+ local para testing

---

## 🎯 Arquitectura AWS

```
├── AWS Amplify      → Hosting Next.js (auto-scaling)
├── RDS PostgreSQL   → Base de datos (Multi-AZ)
├── S3               → Almacenamiento de archivos
├── SES              → Emails transaccionales
└── CloudWatch       → Logs y monitoring
```

---

## 📝 PASO 1: Preparar el código (✅ COMPLETADO)

Ya está hecho. Los archivos modificados:
- ✅ `lib/env.ts` - Cognito opcional
- ✅ `lib/prisma.ts` - Connection pooling
- ✅ `lib/s3.ts` - Mejor manejo de errores
- ✅ `amplify.yml` - Build configuration

---

## 🗄️ PASO 2: Crear RDS PostgreSQL

### 2.1 Crear instancia RDS

1. Ir a AWS Console → RDS
2. Click "Create database"
3. Configuración:
   ```
   Engine: PostgreSQL 15.x
   Template: Production (o Dev/Test si quieres ahorrar)
   
   DB instance identifier: clousadmin-db
   Master username: clousadmin_admin
   Master password: [genera una contraseña segura]
   
   Instance class: db.t3.small (o db.t3.micro para dev)
   Storage: 20 GB SSD (General Purpose)
   
   Multi-AZ: Yes (recomendado para producción)
   VPC: Default VPC
   Public access: No (más seguro)
   
   Database name: clousadmin
   ```

4. Click "Create database" y espera 5-10 minutos

### 2.2 Configurar Security Group

1. Ve a RDS → Databases → clousadmin-db
2. Click en el Security Group
3. Editar Inbound rules → Add rule:
   ```
   Type: PostgreSQL
   Port: 5432
   Source: Custom (por ahora 0.0.0.0/0, luego ajustaremos)
   ```

### 2.3 Obtener connection string

1. En RDS → clousadmin-db → Connectivity
2. Copiar el "Endpoint"
3. Crear DATABASE_URL:
   ```
   postgresql://clousadmin_admin:tu-password@endpoint.rds.amazonaws.com:5432/clousadmin
   ```

### 2.4 Migrar datos locales (opcional)

```bash
# Exportar datos locales
pg_dump -h localhost -U postgres -d clousadmin > backup.sql

# Importar a RDS (reemplaza valores)
psql -h your-rds-endpoint.rds.amazonaws.com -U clousadmin_admin -d clousadmin < backup.sql
```

O ejecutar migraciones desde cero:
```bash
# En tu local, con DATABASE_URL apuntando a RDS
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npm run seed
```

---

## 📦 PASO 3: Configurar S3

### 3.1 Crear bucket

1. AWS Console → S3
2. Create bucket:
   ```
   Bucket name: clousadmin-production-files (debe ser único globalmente)
   Region: eu-west-1 (Irlanda, cerca de España)
   
   Block Public Access: Keep all enabled (seguridad)
   Bucket Versioning: Disabled (opcional: enable para backups)
   Encryption: Enable (SSE-S3)
   ```

### 3.2 Configurar CORS

1. Ve al bucket → Permissions → CORS
2. Agregar configuración:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://your-amplify-domain.amplifyapp.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### 3.3 Crear IAM User para S3

1. IAM → Users → Add users
   ```
   User name: clousadmin-s3-user
   Access type: Programmatic access
   ```

2. Permissions → Attach policies directly → Create policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::clousadmin-production-files",
        "arn:aws:s3:::clousadmin-production-files/*"
      ]
    }
  ]
}
```

3. Guardar Access Key ID y Secret Access Key

---

## 📧 PASO 4: Configurar SES

### 4.1 Verificar dominio (recomendado)

1. SES → Verified identities → Create identity
2. Identity type: Domain
3. Domain: `yourdomain.com`
4. Copiar los registros DNS (DKIM, SPF)
5. Agregar a tu DNS provider (donde compraste el dominio)
6. Esperar verificación (puede tardar hasta 72h, usualmente minutos)

### 4.2 Salir de Sandbox

Por defecto, SES está en "sandbox mode" (solo emails verificados).

1. SES → Account dashboard
2. Click "Request production access"
3. Completar formulario:
   ```
   Use case: Transactional emails (onboarding, notifications)
   Website: your-domain.com
   Expected volume: 100-1000 emails/day
   Description: HR management platform for Spanish companies
   ```
4. Esperar aprobación (24-48h)

### 4.3 Verificar email individual (temporal)

Si no tienes dominio o mientras esperas aprobación:

1. SES → Verified identities → Create identity
2. Identity type: Email address
3. Email: `noreply@gmail.com` (o tu email personal)
4. Verifica desde el email que recibes

---

## 🚀 PASO 5: Desplegar en Amplify

### 5.1 Conectar repositorio

1. AWS Console → Amplify
2. New app → Host web app
3. GitHub → Authorize AWS Amplify
4. Select repository: `Clousadmin`
5. Branch: `main`

### 5.2 Configurar build settings

Amplify detectará `amplify.yml` automáticamente. Verifica:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - npx prisma generate
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
```

### 5.3 Configurar variables de entorno

En Amplify → App settings → Environment variables:

```
DATABASE_URL=postgresql://clousadmin_admin:password@your-rds.rds.amazonaws.com:5432/clousadmin

AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=clousadmin-production-files

SES_FROM_EMAIL=noreply@yourdomain.com
SES_REGION=eu-west-1

NEXT_PUBLIC_APP_URL=https://main.xxxxx.amplifyapp.com
NODE_ENV=production

NEXTAUTH_SECRET=your-32-character-secret
```

**Generar NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 5.4 Deploy

1. Click "Save and deploy"
2. Espera 5-10 minutos
3. Tu app estará disponible en: `https://main.xxxxx.amplifyapp.com`

---

## ✅ PASO 6: Verificación

### 6.1 Verificar deployment

1. Abrir URL de Amplify
2. Verificar que carga sin errores
3. Intentar login (debería conectar a RDS)

### 6.2 Test S3

1. Login como HR Admin
2. Intentar subir un archivo (avatar, documento)
3. Verificar que se guarda en S3

### 6.3 Test SES

1. Crear empleado e invitar
2. Verificar que el email llega
3. Si estás en sandbox, solo llegará a emails verificados

### 6.4 Verificar logs

```
Amplify → main → Logs
```

Si hay errores, revisa CloudWatch logs.

---

## 🔧 PASO 7: Configuración adicional (opcional)

### 7.1 Dominio personalizado

1. Amplify → Domain management → Add domain
2. Configurar DNS apuntando a Amplify
3. SSL/HTTPS automático

### 7.2 RDS Security (mejor práctica)

1. Crear VPC para Amplify
2. Configurar RDS Security Group solo desde VPC
3. Quitar acceso público a RDS

### 7.3 Monitoring

1. CloudWatch → Create dashboard
2. Agregar métricas:
   - Amplify requests
   - RDS connections
   - S3 requests
   - SES emails sent

---

## 🐛 Troubleshooting

### Error: "Can't reach database server"

```
Problema: RDS Security Group no permite conexiones
Solución: 
  1. RDS → Security Group → Inbound rules
  2. Agregar PostgreSQL (5432) desde 0.0.0.0/0
  3. (Después restringir a VPC de Amplify)
```

### Error: "Access Denied" en S3

```
Problema: IAM user no tiene permisos
Solución:
  1. IAM → Users → clousadmin-s3-user
  2. Verificar policy con permisos PutObject, GetObject
  3. Regenerar Access Keys si es necesario
```

### Error: SES sandbox

```
Problema: Intentando enviar a email no verificado
Solución:
  1. Opción A: Verificar email destino en SES
  2. Opción B: Solicitar salir de sandbox
```

### Build fails en Amplify

```
Problema: Error en npm ci o prisma generate
Solución:
  1. Verificar amplify.yml existe
  2. Revisar logs de build en Amplify Console
  3. Verificar que package.json tiene prisma
```

---

## 💰 Costos estimados

Para 100 usuarios activos:

| Servicio | Costo mensual |
|----------|---------------|
| Amplify | $15-20 |
| RDS (t3.small Multi-AZ) | $60-80 |
| S3 (50GB) | $2-5 |
| SES | $0 (gratis 62k emails) |
| **Total** | **~$77-105/mes** |

Con tus créditos AWS, cubierto por varios meses.

---

## 📚 Recursos adicionales

- [AWS Amplify Docs](https://docs.amplify.aws/)
- [RDS PostgreSQL Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [SES Production Access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)

---

## ✅ Checklist

- [ ] RDS PostgreSQL creado y accesible
- [ ] S3 bucket creado con CORS configurado
- [ ] IAM user para S3 con Access Keys
- [ ] SES dominio verificado (o email verificado temporal)
- [ ] SES producción access solicitado
- [ ] Amplify conectado a GitHub
- [ ] Variables de entorno configuradas en Amplify
- [ ] Primer deploy exitoso
- [ ] Login funciona (conecta a RDS)
- [ ] Upload de archivos funciona (S3)
- [ ] Emails funcionan (SES)

---

**Tiempo estimado total: 2-3 horas**

**Próximo paso:** Ejecutar PASO 2 (crear RDS) desde AWS Console



