# Configuración de Resend para Envío de Emails

## Introducción

Este documento describe cómo configurar Resend para el envío de emails transaccionales en Clousadmin (invitaciones de onboarding, confirmaciones de waitlist, etc.).

## Migración desde AWS SES

El proyecto ha migrado de AWS SES a Resend para simplificar el envío de emails. La interfaz de las funciones públicas se mantiene sin cambios, por lo que no se requieren modificaciones en el resto del código.

## Variables de Entorno Requeridas

### Producción

Para que el envío de emails funcione en producción, debes configurar las siguientes variables de entorno:

```bash
# Resend API Key (obtén una en https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Email desde el que se enviarán los correos (debe estar verificado en Resend)
RESEND_FROM_EMAIL=noreply@tudominio.com

# Nombre que aparecerá como remitente (opcional, por defecto "Clousadmin")
RESEND_FROM_NAME=Clousadmin
```

### Desarrollo Local

En desarrollo local, si no configuras las variables de entorno, los emails **no se enviarán** pero la aplicación seguirá funcionando. Los intentos de envío se registrarán en los logs con un warning:

```
[Email] Resend no configurado. En desarrollo, email no enviado: { to: 'user@example.com', subject: '...' }
```

Para probar el envío de emails en local, simplemente añade las variables a tu archivo `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
RESEND_FROM_NAME=Clousadmin
```

## Configuración de Resend

### 1. Crear cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta gratuita (100 emails/día)
3. Verifica tu email

### 2. Verificar dominio

Para enviar emails desde tu dominio, debes verificar la propiedad del dominio:

1. Ve a **Settings → Domains** en el dashboard de Resend
2. Haz clic en **Add Domain**
3. Ingresa tu dominio (ej: `tudominio.com`)
4. Añade los registros DNS que Resend te proporciona:
   - **SPF** (TXT)
   - **DKIM** (TXT)
   - **DMARC** (TXT, opcional pero recomendado)

Ejemplo de registros DNS:

```
Tipo: TXT
Nombre: @
Valor: v=spf1 include:_spf.resend.com ~all

Tipo: TXT  
Nombre: resend._domainkey
Valor: [valor proporcionado por Resend]

Tipo: TXT
Nombre: _dmarc
Valor: v=DMARC1; p=none; rua=mailto:postmaster@tudominio.com
```

5. Espera a que los registros DNS se propaguen (puede tardar hasta 48 horas, normalmente menos de 1 hora)
6. Verifica el dominio en Resend

### 3. Generar API Key

1. Ve a **API Keys** en el dashboard
2. Haz clic en **Create API Key**
3. Asigna un nombre descriptivo (ej: "Clousadmin Producción")
4. Selecciona permisos: **Sending access**
5. Copia la API key generada (comienza con `re_`)
6. Guárdala de forma segura (no se puede recuperar después)

### 4. Configurar variables en tu servidor

En tu servidor (Hetzner), configura las variables de entorno:

```bash
# En tu archivo .env o en la configuración del servidor
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@tudominio.com
RESEND_FROM_NAME=Clousadmin
```

## Funciones de Email Disponibles

### `sendEmail(to, subject, htmlBody, textBody?)`

Función principal para enviar emails. Se usa internamente por las demás funciones.

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail(
  'usuario@example.com',
  'Asunto del email',
  '<h1>Email HTML</h1>',
  'Email en texto plano' // opcional
);
```

### `sendOnboardingEmail(empleadoNombre, empleadoApellidos, email, empresaNombre, onboardingUrl)`

Envía el email de invitación de onboarding a un empleado nuevo.

```typescript
import { sendOnboardingEmail } from '@/lib/email';

await sendOnboardingEmail(
  'Juan',
  'Pérez',
  'juan.perez@example.com',
  'Mi Empresa S.L.',
  'https://app.clousadmin.com/onboarding?token=xxx'
);
```

### `sendSignupInvitationEmail(email, invitationUrl)`

Envía invitación para crear cuenta de empresa.

### `sendWaitlistConfirmationEmail(email)`

Confirma que un usuario ha sido añadido a la lista de espera.

### `sendWaitlistInvitationEmail(email, invitationUrl)`

Notifica a un usuario de waitlist que su invitación está lista.

## Límites y Planes

### Plan Gratuito
- 100 emails/día
- 3,000 emails/mes
- Ideal para desarrollo y pruebas

### Plan de Pago (desde $20/mes)
- 50,000 emails/mes incluidos
- $1 por cada 1,000 emails adicionales
- Sin límite diario
- Soporte prioritario

## Monitorización

Puedes ver los emails enviados y su estado en el dashboard de Resend:

1. Ve a **Emails** en el dashboard
2. Filtra por fecha, destinatario, estado, etc.
3. Revisa los detalles de cada email:
   - Estado (enviado, entregado, abierto, rebotado)
   - Logs de entrega
   - Contenido del email

## Troubleshooting

### Los emails no se envían

1. **Verifica las variables de entorno**: Asegúrate de que `RESEND_API_KEY` y `RESEND_FROM_EMAIL` están configuradas
2. **Verifica el dominio**: El dominio del email debe estar verificado en Resend
3. **Revisa los logs**: Busca errores en los logs del servidor
4. **Verifica la API key**: Asegúrate de que la API key es válida y tiene permisos de envío

### Los emails van a spam

1. **Verifica SPF/DKIM**: Asegúrate de que los registros DNS están configurados correctamente
2. **Configura DMARC**: Añade un registro DMARC a tu dominio
3. **Evita contenido spam**: No uses palabras spam en el asunto o contenido
4. **Calienta el dominio**: Empieza enviando pocos emails y aumenta gradualmente

### Error: "Domain not verified"

El dominio debe estar verificado en Resend antes de enviar emails desde él. Sigue los pasos de la sección "Verificar dominio".

## Seguridad

- **Nunca commits** la API key en el repositorio
- **Usa variables de entorno** para almacenar secretos
- **Rota las API keys** periódicamente (cada 3-6 meses)
- **Usa API keys diferentes** para desarrollo y producción
- **Limita los permisos** de las API keys (solo "Sending access")

## Referencias

- [Documentación oficial de Resend](https://resend.com/docs)
- [Node.js SDK de Resend](https://resend.com/docs/send-with-nodejs)
- [Verificación de dominio](https://resend.com/docs/dashboard/domains/introduction)

---

**Última actualización**: 2025-11-10


