/**
 * Script para asegurar que el rol de admin tenga todos los permisos
 *
 * Este script verifica y asigna todos los permisos existentes al rol de admin
 */

import prisma from '../config/database';

async function ensureAdminPermissions() {
  console.log('🔐 Verificando permisos del administrador...\n');

  try {
    // 1. Obtener el rol de admin
    const adminRole = await prisma.systemRole.findUnique({
      where: { name: 'admin' },
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!adminRole) {
      console.error('❌ Rol de admin no encontrado');
      return;
    }

    console.log(`✅ Rol encontrado: ${adminRole.displayName}\n`);

    // 2. Obtener todos los permisos disponibles
    const allPermissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });

    console.log(`📋 Total de permisos en el sistema: ${allPermissions.length}`);
    console.log(`📋 Permisos actuales del admin: ${adminRole.permissions.length}\n`);

    // 3. Identificar permisos faltantes
    const existingPermissionIds = new Set(
      adminRole.permissions.map(rp => rp.permissionId)
    );

    const missingPermissions = allPermissions.filter(
      p => !existingPermissionIds.has(p.id)
    );

    if (missingPermissions.length === 0) {
      console.log('✨ El admin ya tiene todos los permisos asignados!\n');
      return;
    }

    console.log(`🔧 Asignando ${missingPermissions.length} permisos faltantes:\n`);

    // 4. Asignar permisos faltantes
    let assigned = 0;
    for (const permission of missingPermissions) {
      try {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
        console.log(`  ✓ ${permission.displayName} (${permission.module}.${permission.action})`);
        assigned++;
      } catch (error: any) {
        // Ignorar errores de duplicados
        if (!error.message.includes('Unique constraint')) {
          console.error(`  ✗ Error asignando ${permission.name}:`, error.message);
        }
      }
    }

    console.log(`\n✅ ${assigned} permisos asignados correctamente\n`);

    // 5. Mostrar resumen final
    const updatedAdmin = await prisma.systemRole.findUnique({
      where: { name: 'admin' },
      include: {
        permissions: {
          include: {
            permission: {
              select: {
                module: true,
                displayName: true
              }
            }
          },
          orderBy: {
            permission: {
              module: 'asc'
            }
          }
        }
      }
    });

    console.log('📊 Permisos finales del administrador:\n');
    let currentModule = '';
    updatedAdmin?.permissions.forEach(rp => {
      if (rp.permission.module !== currentModule) {
        currentModule = rp.permission.module;
        console.log(`\n  ${currentModule.toUpperCase()}:`);
      }
      console.log(`    • ${rp.permission.displayName}`);
    });

    console.log(`\n🎉 Total: ${updatedAdmin?.permissions.length} permisos\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Ejecutar
if (require.main === module) {
  ensureAdminPermissions()
    .then(() => {
      console.log('✅ Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { ensureAdminPermissions };
