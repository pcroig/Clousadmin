// ========================================
// Environment Variables Validation
// ========================================
// Validates all required env vars at startup
// Fails fast if something is missing

import { z } from 'zod';

const booleanString = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .default(false)
  .transform((value) => value === true || value === 'true');

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Encryption (required)
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, 'ENCRYPTION_KEY debe ser una cadena hex de 64 caracteres'),

  // Redis (obligatorio en producción)
  REDIS_URL: z.string().url().optional(),

  // Hetzner Object Storage (OPCIONAL para desarrollo local, requerido en producción)
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_REGION: z.string().min(1).optional(),
  STORAGE_ACCESS_KEY: z.string().min(1).optional(),
  STORAGE_SECRET_KEY: z.string().min(1).optional(),
  STORAGE_BUCKET: z.string().min(1).optional(),
  BACKUP_BUCKET: z.string().min(1).optional(),
  ENABLE_CLOUD_STORAGE: booleanString,
  DISABLE_EMBEDDED_WORKER: booleanString.optional(),

  // Proveedores de IA (al menos uno debe estar configurado)
  // OpenAI
  OPENAI_API_KEY: z
    .string()
    .refine(
      (val) => !val || val.trim() === '' || val.startsWith('sk-'),
      { message: 'OPENAI_API_KEY debe empezar con "sk-"' }
    )
    .optional(),
  
  // Anthropic (Claude)
  ANTHROPIC_API_KEY: z
    .string()
    .min(1)
    .optional(),
  
  // Google AI (Gemini)
  GOOGLE_AI_API_KEY: z
    .string()
    .min(1)
    .optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // JWT Secret (required)
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET debe tener al menos 32 caracteres'),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  RESEND_FROM_NAME: z.string().min(1).optional(),

  // Platform Admin (opcional - solo necesario para invitar usuarios)
  // Si se proporciona, debe tener al menos 32 caracteres, pero puede no estar presente
  PLATFORM_ADMIN_SECRET_KEY: z
    .string()
    .min(32, 'La clave debe tener al menos 32 caracteres')
    .optional()
    .or(z.undefined()),
  PLATFORM_ADMIN_EMAIL: z.string().email().optional().or(z.undefined()), // Email del creador de la plataforma

  // Cron Jobs
  CRON_SECRET: z
    .string()
    .min(32, 'CRON_SECRET debe tener al menos 32 caracteres para seguridad')
    .optional(),
  CRON_ALERT_WEBHOOK: z.string().url().optional(),
  SOLICITUDES_PERIODO_REVISION_HORAS: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((value) => {
      if (typeof value === 'number') {
        return value;
      }
      const parsed = Number.parseInt((value ?? '48').toString(), 10);
      return Number.isFinite(parsed) ? parsed : 48;
    })
    .pipe(z.number().min(1).max(168)),
});

// Validate and export
const validatedEnv = envSchema.parse(process.env);

// Validación adicional: al menos un proveedor de IA debe estar configurado
const hasOpenAI = !!(validatedEnv.OPENAI_API_KEY && validatedEnv.OPENAI_API_KEY.startsWith('sk-'));
const hasAnthropic = !!(validatedEnv.ANTHROPIC_API_KEY && validatedEnv.ANTHROPIC_API_KEY.trim() !== '');
const hasGoogleAI = !!(validatedEnv.GOOGLE_AI_API_KEY && validatedEnv.GOOGLE_AI_API_KEY.trim() !== '');
const isProduction = validatedEnv.NODE_ENV === 'production';
const hasStorageConfig =
  !!validatedEnv.STORAGE_ENDPOINT &&
  !!validatedEnv.STORAGE_REGION &&
  !!validatedEnv.STORAGE_ACCESS_KEY &&
  !!validatedEnv.STORAGE_SECRET_KEY &&
  !!validatedEnv.STORAGE_BUCKET;

if (!hasOpenAI && !hasAnthropic && !hasGoogleAI) {
  if (isProduction) {
    throw new Error(
      '[ENV] Debes configurar al menos un proveedor de IA (OPENAI_API_KEY, ANTHROPIC_API_KEY o GOOGLE_AI_API_KEY) en producción.'
    );
  }
  console.warn(
    '⚠️  [ENV] No hay proveedores de IA configurados. ' +
    'Las funcionalidades de IA no estarán disponibles. ' +
    'Configura al menos uno: OPENAI_API_KEY, ANTHROPIC_API_KEY, o GOOGLE_AI_API_KEY'
  );
}

if (validatedEnv.ENABLE_CLOUD_STORAGE && !hasStorageConfig) {
  throw new Error('[ENV] ENABLE_CLOUD_STORAGE está activo pero faltan variables STORAGE_*');
}

if (isProduction) {
  if (!validatedEnv.REDIS_URL) {
    throw new Error('[ENV] REDIS_URL es obligatorio en producción');
  }

  if (!hasStorageConfig) {
    throw new Error('[ENV] STORAGE_* son obligatorias en producción');
  }

  if (!validatedEnv.RESEND_API_KEY || !validatedEnv.RESEND_FROM_EMAIL) {
    throw new Error('[ENV] RESEND_API_KEY y RESEND_FROM_EMAIL son obligatorios en producción');
  }

  if (!validatedEnv.CRON_SECRET) {
    throw new Error('[ENV] CRON_SECRET es obligatorio en producción');
  }
}

export const env = validatedEnv;
