// ========================================
// Environment Variables Validation
// ========================================
// Validates all required env vars at startup
// Fails fast if something is missing

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // AWS (OPCIONAL para desarrollo local, requerido en producción)
  AWS_REGION: z.string().min(1).optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),

  // Cognito (OPCIONAL - no lo usamos, tenemos JWT)
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  COGNITO_CLIENT_SECRET: z.string().optional(),

  // SES (OPCIONAL para desarrollo local, requerido en producción)
  SES_FROM_EMAIL: z.string().email().optional(),
  SES_REGION: z.string().min(1).default('eu-west-1').optional(),

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
  SOLICITUDES_PERIODO_REVISION_HORAS: z
    .string()
    .transform((val) => parseInt(val || '48', 10))
    .pipe(z.number().min(1).max(168))
    .optional()
    .default('48' as any),
});

// Validate and export
const validatedEnv = envSchema.parse(process.env);

// Validación adicional: al menos un proveedor de IA debe estar configurado
const hasOpenAI = !!(validatedEnv.OPENAI_API_KEY && validatedEnv.OPENAI_API_KEY.startsWith('sk-'));
const hasAnthropic = !!(validatedEnv.ANTHROPIC_API_KEY && validatedEnv.ANTHROPIC_API_KEY.trim() !== '');
const hasGoogleAI = !!(validatedEnv.GOOGLE_AI_API_KEY && validatedEnv.GOOGLE_AI_API_KEY.trim() !== '');

if (!hasOpenAI && !hasAnthropic && !hasGoogleAI) {
  console.warn(
    '⚠️  [ENV] No hay proveedores de IA configurados. ' +
    'Las funcionalidades de IA no estarán disponibles. ' +
    'Configura al menos uno: OPENAI_API_KEY, ANTHROPIC_API_KEY, o GOOGLE_AI_API_KEY'
  );
}

export const env = validatedEnv;
