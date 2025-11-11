// Script de prueba para verificar envío de emails con Resend
// Ejecutar con: npx tsx scripts/test-email.ts

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { sendEmail } from '../lib/email';

async function testEmail() {
  const testEmail = process.env.TEST_EMAIL || 'pabloroigburgui@gmail.com';
  
  console.log('🧪 Probando envío de email con Resend...');
  console.log(`📧 Enviando a: ${testEmail}`);
  console.log(`📤 Desde: ${process.env.RESEND_FROM_EMAIL || 'No configurado'}`);
  console.log('');

  try {
    await sendEmail(
      testEmail,
      '✅ Prueba de Email - Clousadmin',
      `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">🎉 ¡Email de Prueba Exitoso!</h1>
            <p>Si recibes este email, significa que:</p>
            <ul>
              <li>✅ Resend está configurado correctamente</li>
              <li>✅ Tu dominio hrcron.com está verificado</li>
              <li>✅ Los emails se están enviando correctamente</li>
            </ul>
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666;">
              Este es un email de prueba desde Clousadmin usando Resend.
            </p>
          </body>
        </html>
      `,
      `🎉 ¡Email de Prueba Exitoso!

Si recibes este email, significa que:
✅ Resend está configurado correctamente
✅ Tu dominio hrcron.com está verificado
✅ Los emails se están enviando correctamente

Este es un email de prueba desde Clousadmin usando Resend.`
    );

    console.log('✅ Email enviado exitosamente!');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Revisa tu bandeja de entrada (y spam)');
    console.log('   2. Ve a Resend → Emails para ver el estado');
    console.log('   3. Si aparece "Delivered", ¡todo funciona perfecto!');
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    console.log('');
    console.log('🔍 Verifica:');
    console.log('   - Las variables de entorno están en .env.local');
    console.log('   - El dominio está verificado en Resend');
    console.log('   - La API key es válida');
    process.exit(1);
  }
}

testEmail();

