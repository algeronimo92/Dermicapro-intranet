/**
 * Script para migrar usuarios existentes al nuevo sistema de roles
 *
 * Este script:
 * 1. Encuentra todos los usuarios sin rol asignado
 * 2. Les asigna el rol de "admin" por defecto (o el que se especifique)
 * 3. Permite especificar un mapeo personalizado de usuarios a roles
 *
 * Uso:
 * npx tsx src/scripts/migrate-users-to-roles.ts [--default-role=admin]
 */

import prisma from '../config/database';

interface MigrationConfig {
  defaultRoleName: string;
  emailToRoleMap?: Record<string, string>;
}

class UserRoleMigration {
  private config: MigrationConfig;

  constructor(config: MigrationConfig) {
    this.config = config;
  }

  async execute(): Promise<void> {
    try {
      console.log('🚀 Iniciando migración de usuarios al sistema de roles...\n');

      // 1. Obtener el rol por defecto
      const defaultRole = await prisma.systemRole.findUnique({
        where: { name: this.config.defaultRoleName },
      });

      if (!defaultRole) {
        throw new Error(`Rol por defecto "${this.config.defaultRoleName}" no encontrado`);
      }

      console.log(`✅ Rol por defecto: ${defaultRole.displayName} (${defaultRole.name})\n`);

      // 2. Obtener todos los usuarios sin rol
      const usersWithoutRole = await prisma.user.findMany({
        where: { roleId: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (usersWithoutRole.length === 0) {
        console.log('✨ No hay usuarios sin rol asignado. Migración completada.\n');
        return;
      }

      console.log(`📋 Encontrados ${usersWithoutRole.length} usuarios sin rol:\n`);

      // 3. Migrar cada usuario
      let migratedCount = 0;
      let errors = 0;

      for (const user of usersWithoutRole) {
        try {
          // Determinar el rol a asignar
          const roleName = this.config.emailToRoleMap?.[user.email] || this.config.defaultRoleName;

          const role = await prisma.systemRole.findUnique({
            where: { name: roleName },
          });

          if (!role) {
            console.log(`  ⚠️  Rol "${roleName}" no encontrado para ${user.email}, usando rol por defecto`);
            await this.assignRole(user.id, defaultRole.id);
          } else {
            await this.assignRole(user.id, role.id);
          }

          console.log(`  ✓ ${user.firstName} ${user.lastName} (${user.email}) → ${role?.displayName || defaultRole.displayName}`);
          migratedCount++;
        } catch (error) {
          console.error(`  ✗ Error migrando ${user.email}:`, error);
          errors++;
        }
      }

      // 4. Resumen
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Resumen de Migración:`);
      console.log(`   Total de usuarios: ${usersWithoutRole.length}`);
      console.log(`   Migrados exitosamente: ${migratedCount}`);
      console.log(`   Errores: ${errors}`);
      console.log(`${'='.repeat(60)}\n`);

      if (errors === 0) {
        console.log('🎉 Migración completada exitosamente!\n');
      } else {
        console.log('⚠️  Migración completada con errores. Revisa los mensajes anteriores.\n');
      }

      // 5. Mostrar estadísticas finales
      await this.showStatistics();

    } catch (error) {
      console.error('❌ Error fatal durante la migración:', error);
      throw error;
    }
  }

  private async assignRole(userId: string, roleId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { roleId },
    });
  }

  private async showStatistics(): Promise<void> {
    const stats = await prisma.systemRole.findMany({
      select: {
        name: true,
        displayName: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    console.log('📈 Distribución de usuarios por rol:\n');
    for (const role of stats) {
      console.log(`   ${role.displayName.padEnd(20)} : ${role._count.users} usuarios`);
    }
    console.log('');
  }
}

// Configuración de la migración
const config: MigrationConfig = {
  defaultRoleName: process.env.DEFAULT_ROLE || 'admin',

  // Mapeo opcional de emails a roles específicos
  // Descomenta y personaliza según sea necesario:
  /*
  emailToRoleMap: {
    'admin@dermicapro.com': 'admin',
    'enfermera@dermicapro.com': 'nurse',
    'vendedor@dermicapro.com': 'sales',
    'doctor@dermicapro.com': 'doctor',
  }
  */
};

// Ejecutar migración
async function main() {
  const migration = new UserRoleMigration(config);
  await migration.execute();
}

if (require.main === module) {
  main()
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

export { UserRoleMigration, MigrationConfig };
