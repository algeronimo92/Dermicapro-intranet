import { PrismaClient } from '@prisma/client';
import { generateBasePermissions } from '../constants/permissions';

const prisma = new PrismaClient();

// Generar permisos base desde la configuración centralizada
const simplifiedPermissions = generateBasePermissions();

async function simplifyPermissions() {
  try {
    console.log('🔄 Iniciando simplificación de permisos...\n');

    // Paso 1: Obtener el rol admin
    const adminRole = await prisma.systemRole.findFirst({
      where: { name: 'admin' },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!adminRole) {
      console.error('❌ No se encontró el rol admin');
      return;
    }

    console.log(`✅ Rol admin encontrado: ${adminRole.displayName} (${adminRole.id})`);
    console.log(`📊 Permisos actuales del admin: ${adminRole.permissions.length}\n`);

    // Paso 2: Eliminar todos los RolePermission existentes
    console.log('🗑️  Eliminando todas las asignaciones de permisos...');
    await prisma.rolePermission.deleteMany({});
    console.log('✅ Asignaciones eliminadas\n');

    // Paso 3: Eliminar todos los permisos existentes
    console.log('🗑️  Eliminando todos los permisos existentes...');
    const deletedCount = await prisma.permission.deleteMany({});
    console.log(`✅ ${deletedCount.count} permisos eliminados\n`);

    // Paso 4: Crear los nuevos permisos simplificados
    console.log('📝 Creando nuevos permisos simplificados...');
    const createdPermissions = [];

    for (const perm of simplifiedPermissions) {
      const created = await prisma.permission.create({
        data: perm,
      });
      createdPermissions.push(created);
      console.log(`  ✅ ${created.displayName} (${created.name})`);
    }

    console.log(`\n✅ ${createdPermissions.length} permisos creados\n`);

    // Paso 5: Asignar todos los permisos al rol admin
    console.log('🔗 Asignando todos los permisos al rol admin...');

    for (const permission of createdPermissions) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });
    }

    console.log(`✅ ${createdPermissions.length} permisos asignados al admin\n`);

    // Paso 6: Verificar
    const updatedAdmin = await prisma.systemRole.findUnique({
      where: { id: adminRole.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    console.log('📊 Resumen final:');
    console.log(`  - Total de permisos en el sistema: ${createdPermissions.length}`);
    console.log(`  - Permisos del admin: ${updatedAdmin?.permissions.length}`);
    console.log('\n✅ Simplificación completada exitosamente!');
    console.log('\n📋 Nuevos permisos:');

    createdPermissions.forEach(p => {
      console.log(`  - ${p.module}: ${p.displayName}`);
    });

  } catch (error) {
    console.error('❌ Error durante la simplificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
simplifyPermissions()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
