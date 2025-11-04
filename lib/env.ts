// ========================================
// Environment Variables Validation
// ========================================
// Validates all required env vars at startup
// Fails fast if something is missing

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // AWS
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),

  // Cognito
  COGNITO_USER_POOL_ID: z.string().min(1),
  COGNITO_CLIENT_ID: z.string().min(1),
  COGNITO_CLIENT_SECRET: z.string().optional(),

  // SES
  SES_FROM_EMAIL: z.string().email(),
  SES_REGION: z.string().min(1),

  // OpenAI (opcional para desarrollo sin IA)
  // Si está presente, debe ser string que empiece con 'sk-'
  // Si no está presente o está vacío, se ignora (no falla validación)
  OPENAI_API_KEY: z
    .string()
    .refine(
      (val) => !val || val.trim() === '' || val.startsWith('sk-'),
      { message: 'OPENAI_API_KEY debe empezar con "sk-"' }
    )
    .optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Platform Admin (opcional - solo necesario para invitar usuarios)
  // Si se proporciona, debe tener al menos 32 caracteres, pero puede no estar presente
  PLATFORM_ADMIN_SECRET_KEY: z
    .string()
    .min(32, 'La clave debe tener al menos 32 caracteres')
    .optional()
    .or(z.undefined()),
  PLATFORM_ADMIN_EMAIL: z.string().email().optional().or(z.undefined()), // Email del creador de la plataforma
});

// Validate and export
export const env = envSchema.parse(process.env);
