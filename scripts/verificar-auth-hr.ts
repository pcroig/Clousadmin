// ========================================
// Script: Verificar Autenticación HR
// ========================================
// Verifica que exista al menos un usuario HR Admin activo y muestra fichajes pendientes

import { prisma } from '../lib/prisma';

async function verificarAuthHR() {
  try {
    console.log('\n🔍 Verificando usuarios HR Admin en la base de datos...\n');

    const usuariosHR = await prisma.usuarios.findMany({
      where: {
        rol: 'hr_admin',
        activo: true,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        rol: true,
        empresaId: true,
        empleadoId: true,
        ultimoAcceso: true,
      },
    });

    if (usuariosHR.length === 0) {
      console.log('❌ No se encontraron usuarios con rol hr_admin activos');
      console.log('\n💡 Solución: Actualiza el rol de un usuario existente:');
      console.log("   UPDATE usuario SET rol = 'hr_admin' WHERE email = 'tu-email@example.com';\n");

      const usuarios = await prisma.usuarios.findMany({
        where: { activo: true },
        select: {
          email: true,
          rol: true,
          nombre: true,
          apellidos: true,
        },
        take: 5,
      });

      console.log('📋 Usuarios disponibles:');
      usuarios.forEach((u) => {
        console.log(`   - ${u.email} (${u.rol}) - ${u.nombre} ${u.apellidos}`);
      });
    } else {
      console.log(`✅ Encontrados ${usuariosHR.length} usuario(s) HR Admin:\n`);
      usuariosHR.forEach((usuario) => {
        console.log(`👤 ${usuario.nombre} ${usuario.apellidos}`);
        console.log(`   Email: ${usuario.email}`);
        console.log(`   Rol: ${usuario.rol}`);
        console.log(`   ID: ${usuario.id}`);
        console.log(`   Empresa ID: ${usuario.empresaId}`);
        console.log(`   Empleado ID: ${usuario.empleadoId || '(sin empleado)'}`);
        console.log(`   Último acceso: ${usuario.ultimoAcceso || 'nunca'}`);
        console.log('');
      });

      for (const usuario of usuariosHR) {
        const sesiones = await prisma.sesiones_activas.findMany({
          where: {
            usuarioId: usuario.id,
            expiraEn: { gt: new Date() },
          },
          select: {
            id: true,
            createdAt: true,
            ultimoUso: true,
            expiraEn: true,
          },
        });

        if (sesiones.length > 0) {
          console.log(`🔐 Sesiones activas para ${usuario.email}:`);
          sesiones.forEach((sesion) => {
            console.log(`   - Creada: ${sesion.createdAt}`);
            console.log(`     Último uso: ${sesion.ultimoUso}`);
            console.log(`     Expira: ${sesion.expiraEn}`);
          });
          console.log('');
        }
      }
    }

    const fichajesPendientes = await prisma.fichajes.findMany({
      where: {
        estado: 'pendiente',
      },
      select: {
        id: true,
        fecha: true,
        empleadoId: true,
        empresaId: true,
      },
      take: 5,
    });

    if (fichajesPendientes.length > 0) {
      console.log(`📋 Fichajes pendientes: ${fichajesPendientes.length} encontrados`);
      console.log('   (Mostrando primeros 5)\n');
      for (const fichaje of fichajesPendientes) {
        const empleado = await prisma.empleados.findUnique({
          where: { id: fichaje.empleadoId },
          select: { nombre: true, apellidos: true },
        });
        console.log(`   - ${fichaje.fecha.toISOString().split('T')[0]} - ${empleado?.nombre} ${empleado?.apellidos}`);
      }
      console.log('');
    } else {
      console.log('✅ No hay fichajes pendientes\n');
    }
  } catch (error) {
    console.error('❌ Error al verificar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarAuthHR();

