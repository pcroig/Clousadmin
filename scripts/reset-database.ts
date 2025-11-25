// ========================================
// Script para borrar todos los datos de la base de datos
// ========================================
// ⚠️ CUIDADO: Este script borra TODOS los datos
// Ejecutar con: tsx scripts/reset-database.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Iniciando borrado de todos los datos...\n');
  console.log('⚠️  ADVERTENCIA: Esto borrará TODOS los datos de la base de datos\n');

  try {
    // Borrar en orden para respetar foreign keys
    console.log('📋 Borrando datos...\n');

    // 1. Borrar relaciones many-to-many primero
    console.log('1. Borrando relaciones empleado-equipo...');
    const empleadoEquipos = await prisma.empleadoEquipo.deleteMany({});
    console.log(`   ✅ ${empleadoEquipos.count} relaciones eliminadas`);

    // 2. Borrar datos dependientes
    console.log('\n2. Borrando notificaciones...');
    const notificaciones = await prisma.notificacion.deleteMany({});
    console.log(`   ✅ ${notificaciones.count} notificaciones eliminadas`);

    console.log('\n3. Borrando auto-completados...');
    const autoCompletados = await prisma.autoCompletado.deleteMany({});
    console.log(`   ✅ ${autoCompletados.count} auto-completados eliminados`);

    console.log('\n4. Borrando ausencias...');
    const ausencias = await prisma.ausencia.deleteMany({});
    console.log(`   ✅ ${ausencias.count} ausencias eliminadas`);

    console.log('\n5. Borrando fichajes...');
    const fichajes = await prisma.fichaje.deleteMany({});
    console.log(`   ✅ ${fichajes.count} fichajes eliminados`);

    console.log('\n6. Borrando solicitudes...');
    const solicitudes = await prisma.solicitud.deleteMany({});
    console.log(`   ✅ ${solicitudes.count} solicitudes eliminadas`);

    console.log('\n7. Borrando documentos...');
    const documentos = await prisma.documento.deleteMany({});
    console.log(`   ✅ ${documentos.count} documentos eliminados`);

    console.log('\n8. Borrando firmas digitales...');
    const firmas = await prisma.firmaDigital.deleteMany({});
    console.log(`   ✅ ${firmas.count} firmas eliminadas`);

    console.log('\n9. Borrando nóminas...');
    const nominas = await prisma.nomina.deleteMany({});
    console.log(`   ✅ ${nominas.count} nóminas eliminadas`);

    console.log('\n10. Borrando denuncias...');
    const denuncias = await prisma.denuncia.deleteMany({});
    console.log(`   ✅ ${denuncias.count} denuncias eliminadas`);

    console.log('\n11. Borrando equipos...');
    const equipos = await prisma.equipo.deleteMany({});
    console.log(`   ✅ ${equipos.count} equipos eliminados`);

    console.log('\n12. Borrando jornadas...');
    const jornadas = await prisma.jornada.deleteMany({});
    console.log(`   ✅ ${jornadas.count} jornadas eliminadas`);

    console.log('\n13. Borrando empleados...');
    const empleados = await prisma.empleado.deleteMany({});
    console.log(`   ✅ ${empleados.count} empleados eliminados`);

    console.log('\n14. Borrando usuarios...');
    const usuarios = await prisma.usuario.deleteMany({});
    console.log(`   ✅ ${usuarios.count} usuarios eliminados`);

    console.log('\n15. Borrando empresas...');
    const empresas = await prisma.empresa.deleteMany({});
    console.log(`   ✅ ${empresas.count} empresas eliminadas`);

    console.log('\n16. Borrando invitaciones...');
    const invitacionesSignup = await prisma.invitacionSignup.deleteMany({});
    const invitacionesEmpleado = await prisma.invitacionEmpleado.deleteMany({});
    console.log(`   ✅ ${invitacionesSignup.count} invitaciones signup eliminadas`);
    console.log(`   ✅ ${invitacionesEmpleado.count} invitaciones empleado eliminadas`);

    console.log('\n17. Borrando sesiones activas...');
    const sesiones = await prisma.sesionActiva.deleteMany({});
    console.log(`   ✅ ${sesiones.count} sesiones eliminadas`);

    console.log('\n18. Borrando tokens de recuperación...');
    const tokens = await prisma.passwordResetToken.deleteMany({});
    console.log(`   ✅ ${tokens.count} tokens eliminados`);

    console.log('\n19. Borrando plantillas...');
    const plantillas = await prisma.plantilla.deleteMany({});
    console.log(`   ✅ ${plantillas.count} plantillas eliminadas`);

    console.log('\n20. Borrando festivos...');
    const festivos = await prisma.festivo.deleteMany({});
    console.log(`   ✅ ${festivos.count} festivos eliminados`);

    console.log('\n✅ ¡Todos los datos han sido borrados exitosamente!\n');
    console.log('💡 Para volver a poblar con datos de prueba, ejecuta:');
    console.log('   npm run seed\n');

  } catch (error) {
    console.error('\n❌ Error al borrar datos:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });


