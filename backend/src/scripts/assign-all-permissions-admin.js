const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script para asignar TODOS los permisos al rol de Admin
 */

async function main() {
  console.log('🔐 Iniciando asignación de permisos al rol Admin...\n');

  try {
    // 1. Buscar el rol admin
    const adminRole = await prisma.systemRole.findUnique({
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
      console.error('❌ Error: No se encontró el rol admin');
      process.exit(1);
    }

    console.log(`✅ Rol encontrado: ${adminRole.displayName} (${adminRole.name})`);
    console.log(`   Permisos actuales: ${adminRole.permissions.length}\n`);

    // 2. Definir TODOS los permisos del sistema
    const allPermissions = [
      // === USUARIOS ===
      { name: 'users.view', displayName: 'Ver usuarios', module: 'users', action: 'view' },
      { name: 'users.create', displayName: 'Crear usuarios', module: 'users', action: 'create' },
      { name: 'users.edit', displayName: 'Editar usuarios', module: 'users', action: 'edit' },
      { name: 'users.delete', displayName: 'Eliminar usuarios', module: 'users', action: 'delete' },
      { name: 'users.manage', displayName: 'Gestionar usuarios', module: 'users', action: 'manage' },

      // === PACIENTES ===
      { name: 'patients.view', displayName: 'Ver pacientes', module: 'patients', action: 'view' },
      { name: 'patients.create', displayName: 'Crear pacientes', module: 'patients', action: 'create' },
      { name: 'patients.edit', displayName: 'Editar pacientes', module: 'patients', action: 'edit' },
      { name: 'patients.delete', displayName: 'Eliminar pacientes', module: 'patients', action: 'delete' },
      { name: 'patients.manage', displayName: 'Gestionar pacientes', module: 'patients', action: 'manage' },

      // === CITAS ===
      { name: 'appointments.view', displayName: 'Ver citas', module: 'appointments', action: 'view' },
      { name: 'appointments.create', displayName: 'Crear citas', module: 'appointments', action: 'create' },
      { name: 'appointments.edit', displayName: 'Editar citas', module: 'appointments', action: 'edit' },
      { name: 'appointments.delete', displayName: 'Eliminar citas', module: 'appointments', action: 'delete' },
      { name: 'appointments.manage', displayName: 'Gestionar citas', module: 'appointments', action: 'manage' },

      // === SERVICIOS ===
      { name: 'services.view', displayName: 'Ver servicios', module: 'services', action: 'view' },
      { name: 'services.create', displayName: 'Crear servicios', module: 'services', action: 'create' },
      { name: 'services.edit', displayName: 'Editar servicios', module: 'services', action: 'edit' },
      { name: 'services.delete', displayName: 'Eliminar servicios', module: 'services', action: 'delete' },
      { name: 'services.manage', displayName: 'Gestionar servicios', module: 'services', action: 'manage' },

      // === ÓRDENES ===
      { name: 'orders.view', displayName: 'Ver órdenes', module: 'orders', action: 'view' },
      { name: 'orders.create', displayName: 'Crear órdenes', module: 'orders', action: 'create' },
      { name: 'orders.edit', displayName: 'Editar órdenes', module: 'orders', action: 'edit' },
      { name: 'orders.delete', displayName: 'Eliminar órdenes', module: 'orders', action: 'delete' },
      { name: 'orders.manage', displayName: 'Gestionar órdenes', module: 'orders', action: 'manage' },

      // === FACTURAS ===
      { name: 'invoices.view', displayName: 'Ver facturas', module: 'invoices', action: 'view' },
      { name: 'invoices.create', displayName: 'Crear facturas', module: 'invoices', action: 'create' },
      { name: 'invoices.edit', displayName: 'Editar facturas', module: 'invoices', action: 'edit' },
      { name: 'invoices.delete', displayName: 'Eliminar facturas', module: 'invoices', action: 'delete' },
      { name: 'invoices.manage', displayName: 'Gestionar facturas', module: 'invoices', action: 'manage' },

      // === PAGOS ===
      { name: 'payments.view', displayName: 'Ver pagos', module: 'payments', action: 'view' },
      { name: 'payments.create', displayName: 'Crear pagos', module: 'payments', action: 'create' },
      { name: 'payments.edit', displayName: 'Editar pagos', module: 'payments', action: 'edit' },
      { name: 'payments.delete', displayName: 'Eliminar pagos', module: 'payments', action: 'delete' },
      { name: 'payments.manage', displayName: 'Gestionar pagos', module: 'payments', action: 'manage' },

      // === HISTORIAL MÉDICO ===
      { name: 'medical_records.view', displayName: 'Ver historial médico', module: 'medical_records', action: 'view' },
      { name: 'medical_records.create', displayName: 'Crear registros médicos', module: 'medical_records', action: 'create' },
      { name: 'medical_records.edit', displayName: 'Editar registros médicos', module: 'medical_records', action: 'edit' },
      { name: 'medical_records.delete', displayName: 'Eliminar registros médicos', module: 'medical_records', action: 'delete' },
      { name: 'medical_records.manage', displayName: 'Gestionar historial médico', module: 'medical_records', action: 'manage' },

      // === REPORTES Y ANALÍTICAS ===
      { name: 'analytics.view', displayName: 'Ver analíticas', module: 'analytics', action: 'view' },
      { name: 'reports.view', displayName: 'Ver reportes', module: 'reports', action: 'view' },
      { name: 'reports.export', displayName: 'Exportar reportes', module: 'reports', action: 'export' },

      // === ROLES Y PERMISOS ===
      { name: 'roles.view', displayName: 'Ver roles', module: 'roles', action: 'view' },
      { name: 'roles.create', displayName: 'Crear roles', module: 'roles', action: 'create' },
      { name: 'roles.edit', displayName: 'Editar roles', module: 'roles', action: 'edit' },
      { name: 'roles.delete', displayName: 'Eliminar roles', module: 'roles', action: 'delete' },
      { name: 'roles.manage', displayName: 'Gestionar roles', module: 'roles', action: 'manage' },

      // === CONFIGURACIÓN ===
      { name: 'settings.view', displayName: 'Ver configuración', module: 'settings', action: 'view' },
      { name: 'settings.edit', displayName: 'Editar configuración', module: 'settings', action: 'edit' },
      { name: 'settings.manage', displayName: 'Gestionar configuración', module: 'settings', action: 'manage' },

      // === SISTEMA ===
      { name: 'system.manage', displayName: 'Gestionar sistema', module: 'system', action: 'manage' },
      { name: 'system.logs', displayName: 'Ver logs del sistema', module: 'system', action: 'logs' },
    ];

    console.log(`📋 Total de permisos a crear/verificar: ${allPermissions.length}\n`);

    // 3. Crear o actualizar todos los permisos
    const createdPermissions = [];
    for (const perm of allPermissions) {
      const permission = await prisma.permission.upsert({
        where: { name: perm.name },
        create: {
          name: perm.name,
          displayName: perm.displayName,
          description: `Permiso para ${perm.displayName.toLowerCase()}`,
          module: perm.module,
          action: perm.action,
        },
        update: {
          displayName: perm.displayName,
          description: `Permiso para ${perm.displayName.toLowerCase()}`,
          module: perm.module,
          action: perm.action,
        },
      });
      createdPermissions.push(permission);
      console.log(`   ✓ ${permission.name}`);
    }

    console.log(`\n✅ ${createdPermissions.length} permisos creados/actualizados\n`);

    // 4. Asignar todos los permisos al rol admin
    console.log('🔗 Asignando permisos al rol admin...\n');

    let assignedCount = 0;
    let alreadyAssignedCount = 0;

    for (const permission of createdPermissions) {
      const existing = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        },
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
        console.log(`   ➕ Asignado: ${permission.name}`);
        assignedCount++;
      } else {
        alreadyAssignedCount++;
      }
    }

    console.log(`\n✅ Asignación completada:`);
    console.log(`   - Nuevos permisos asignados: ${assignedCount}`);
    console.log(`   - Ya asignados previamente: ${alreadyAssignedCount}`);
    console.log(`   - Total de permisos del admin: ${assignedCount + alreadyAssignedCount}`);

    // 5. Verificar permisos finales
    const updatedAdminRole = await prisma.systemRole.findUnique({
      where: { id: adminRole.id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    console.log(`\n🎉 El rol admin ahora tiene ${updatedAdminRole.permissions.length} permisos activos`);
    console.log('\n✅ Script completado exitosamente');

  } catch (error) {
    console.error('❌ Error al asignar permisos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
main()
  .then(() => {
    console.log('\n✅ Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
