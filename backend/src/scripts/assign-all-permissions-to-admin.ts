// @ts-nocheck - Script de migración legacy con modelo desactualizado
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para asignar TODOS los permisos al rol de Admin
 * Este script crea todos los permisos necesarios si no existen
 * y los asigna al rol admin
 */

async function assignAllPermissionsToAdmin() {
  console.log('🔐 Iniciando asignación de permisos al rol Admin...\n');

  try {
    // 1. Buscar el rol admin
    // @ts-ignore - Script de migración legacy
    const adminRole = await prisma.role.findUnique({
      where: { name: 'admin' },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!adminRole) {
      console.error('❌ Error: No se encontró el rol admin');
      return;
    }

    console.log(`✅ Rol encontrado: ${adminRole.displayName} (${adminRole.name})`);
    console.log(`   Permisos actuales: ${adminRole.rolePermissions.length}\n`);

    // 2. Definir TODOS los permisos del sistema
    const allPermissions = [
      // === USUARIOS ===
      { name: 'users.view', displayName: 'Ver usuarios', resource: 'users', action: 'view' },
      { name: 'users.create', displayName: 'Crear usuarios', resource: 'users', action: 'create' },
      { name: 'users.edit', displayName: 'Editar usuarios', resource: 'users', action: 'edit' },
      { name: 'users.delete', displayName: 'Eliminar usuarios', resource: 'users', action: 'delete' },
      { name: 'users.manage', displayName: 'Gestionar usuarios', resource: 'users', action: 'manage' },

      // === PACIENTES ===
      { name: 'patients.view', displayName: 'Ver pacientes', resource: 'patients', action: 'view' },
      { name: 'patients.create', displayName: 'Crear pacientes', resource: 'patients', action: 'create' },
      { name: 'patients.edit', displayName: 'Editar pacientes', resource: 'patients', action: 'edit' },
      { name: 'patients.delete', displayName: 'Eliminar pacientes', resource: 'patients', action: 'delete' },
      { name: 'patients.manage', displayName: 'Gestionar pacientes', resource: 'patients', action: 'manage' },

      // === CITAS ===
      { name: 'appointments.view', displayName: 'Ver citas', resource: 'appointments', action: 'view' },
      { name: 'appointments.create', displayName: 'Crear citas', resource: 'appointments', action: 'create' },
      { name: 'appointments.edit', displayName: 'Editar citas', resource: 'appointments', action: 'edit' },
      { name: 'appointments.delete', displayName: 'Eliminar citas', resource: 'appointments', action: 'delete' },
      { name: 'appointments.manage', displayName: 'Gestionar citas', resource: 'appointments', action: 'manage' },

      // === SERVICIOS ===
      { name: 'services.view', displayName: 'Ver servicios', resource: 'services', action: 'view' },
      { name: 'services.create', displayName: 'Crear servicios', resource: 'services', action: 'create' },
      { name: 'services.edit', displayName: 'Editar servicios', resource: 'services', action: 'edit' },
      { name: 'services.delete', displayName: 'Eliminar servicios', resource: 'services', action: 'delete' },
      { name: 'services.manage', displayName: 'Gestionar servicios', resource: 'services', action: 'manage' },

      // === ÓRDENES ===
      { name: 'orders.view', displayName: 'Ver órdenes', resource: 'orders', action: 'view' },
      { name: 'orders.create', displayName: 'Crear órdenes', resource: 'orders', action: 'create' },
      { name: 'orders.edit', displayName: 'Editar órdenes', resource: 'orders', action: 'edit' },
      { name: 'orders.delete', displayName: 'Eliminar órdenes', resource: 'orders', action: 'delete' },
      { name: 'orders.manage', displayName: 'Gestionar órdenes', resource: 'orders', action: 'manage' },

      // === FACTURAS ===
      { name: 'invoices.view', displayName: 'Ver facturas', resource: 'invoices', action: 'view' },
      { name: 'invoices.create', displayName: 'Crear facturas', resource: 'invoices', action: 'create' },
      { name: 'invoices.edit', displayName: 'Editar facturas', resource: 'invoices', action: 'edit' },
      { name: 'invoices.delete', displayName: 'Eliminar facturas', resource: 'invoices', action: 'delete' },
      { name: 'invoices.manage', displayName: 'Gestionar facturas', resource: 'invoices', action: 'manage' },

      // === PAGOS ===
      { name: 'payments.view', displayName: 'Ver pagos', resource: 'payments', action: 'view' },
      { name: 'payments.create', displayName: 'Crear pagos', resource: 'payments', action: 'create' },
      { name: 'payments.edit', displayName: 'Editar pagos', resource: 'payments', action: 'edit' },
      { name: 'payments.delete', displayName: 'Eliminar pagos', resource: 'payments', action: 'delete' },
      { name: 'payments.manage', displayName: 'Gestionar pagos', resource: 'payments', action: 'manage' },

      // === HISTORIAL MÉDICO ===
      { name: 'medical_records.view', displayName: 'Ver historial médico', resource: 'medical_records', action: 'view' },
      { name: 'medical_records.create', displayName: 'Crear registros médicos', resource: 'medical_records', action: 'create' },
      { name: 'medical_records.edit', displayName: 'Editar registros médicos', resource: 'medical_records', action: 'edit' },
      { name: 'medical_records.delete', displayName: 'Eliminar registros médicos', resource: 'medical_records', action: 'delete' },
      { name: 'medical_records.manage', displayName: 'Gestionar historial médico', resource: 'medical_records', action: 'manage' },

      // === REPORTES Y ANALÍTICAS ===
      { name: 'analytics.view', displayName: 'Ver analíticas', resource: 'analytics', action: 'view' },
      { name: 'reports.view', displayName: 'Ver reportes', resource: 'reports', action: 'view' },
      { name: 'reports.export', displayName: 'Exportar reportes', resource: 'reports', action: 'export' },

      // === ROLES Y PERMISOS ===
      { name: 'roles.view', displayName: 'Ver roles', resource: 'roles', action: 'view' },
      { name: 'roles.create', displayName: 'Crear roles', resource: 'roles', action: 'create' },
      { name: 'roles.edit', displayName: 'Editar roles', resource: 'roles', action: 'edit' },
      { name: 'roles.delete', displayName: 'Eliminar roles', resource: 'roles', action: 'delete' },
      { name: 'roles.manage', displayName: 'Gestionar roles', resource: 'roles', action: 'manage' },

      // === CONFIGURACIÓN ===
      { name: 'settings.view', displayName: 'Ver configuración', resource: 'settings', action: 'view' },
      { name: 'settings.edit', displayName: 'Editar configuración', resource: 'settings', action: 'edit' },
      { name: 'settings.manage', displayName: 'Gestionar configuración', resource: 'settings', action: 'manage' },

      // === SISTEMA ===
      { name: 'system.manage', displayName: 'Gestionar sistema', resource: 'system', action: 'manage' },
      { name: 'system.logs', displayName: 'Ver logs del sistema', resource: 'system', action: 'logs' },
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
          resource: perm.resource,
          action: perm.action,
        },
        update: {
          displayName: perm.displayName,
          description: `Permiso para ${perm.displayName.toLowerCase()}`,
          resource: perm.resource,
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
    const updatedAdminRole = await prisma.role.findUnique({
      where: { id: adminRole.id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    console.log(`\n🎉 El rol admin ahora tiene ${updatedAdminRole?.rolePermissions.length} permisos activos`);
    console.log('\n✅ Script completado exitosamente');

  } catch (error) {
    console.error('❌ Error al asignar permisos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
assignAllPermissionsToAdmin()
  .then(() => {
    console.log('\n✅ Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
