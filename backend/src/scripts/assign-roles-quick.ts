import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Asignando roles a usuarios...');

  // Obtener roles del sistema
  const adminRole = await prisma.systemRole.findUnique({
    where: { name: 'admin' }
  });

  const nurseRole = await prisma.systemRole.findUnique({
    where: { name: 'nurse' }
  });

  const salesRole = await prisma.systemRole.findUnique({
    where: { name: 'sales' }
  });

  if (!adminRole || !nurseRole || !salesRole) {
    console.error('❌ No se encontraron los roles del sistema');
    return;
  }

  // Asignar roles a usuarios existentes basado en su email
  const updates = [
    { email: 'admin@dermicapro.com', roleId: adminRole.id, roleName: 'admin' },
    { email: 'enfermera@dermicapro.com', roleId: nurseRole.id, roleName: 'nurse' },
    { email: 'ventas@dermicapro.com', roleId: salesRole.id, roleName: 'sales' },
  ];

  for (const update of updates) {
    const user = await prisma.user.findUnique({
      where: { email: update.email }
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { roleId: update.roleId }
      });
      console.log(`✅ Usuario ${update.email} asignado al rol ${update.roleName}`);
    }
  }

  console.log('✨ Migración completada');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
