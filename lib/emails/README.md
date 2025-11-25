# Sistema de Emails - Clousadmin

Sistema de emails basado en React Email con componentes reutilizables.

## Estructura

```
/lib/emails/
  ├── components/          # Componentes base reutilizables
  ├── templates/          # Templates de emails por categoría
  │   ├── auth/          # Signup, recovery, waitlist
  │   ├── onboarding/    # Bienvenida empleados
  │   ├── documentos/    # Firmas pendientes
  │   └── nominas/       # Nóminas disponibles
  └── utils/             # Helpers de renderizado
```

## Uso

```typescript
import { sendOnboardingEmail, sendFirmaPendienteEmail } from '@/lib/email';

// Enviar email de onboarding
await sendOnboardingEmail(nombre, apellidos, email, empresa, url);

// Enviar email de firma pendiente
await sendFirmaPendienteEmail(email, nombre, documento, url);

// Enviar email de nómina disponible
await sendNominaDisponibleEmail(email, nombre, mes, año, url);
```

## Emails Disponibles

- ✅ Signup invitation
- ✅ Waitlist (confirmation, invitation, internal)
- ✅ Password recovery/reset
- ✅ Employee onboarding
- ✅ **Firma pendiente** (nuevo)
- ✅ **Nómina disponible** (nuevo)

## Componentes Disponibles

- `EmailLayout` - Layout base con logo
- `EmailButton` - Botón CTA
- `EmailHeading` - Título principal
- `EmailText` - Párrafos
- `EmailLink` - Enlaces
- `EmailFooter` - Footer con info legal
