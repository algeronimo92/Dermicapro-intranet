import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Get system roles
  const adminRole = await prisma.systemRole.findUnique({ where: { name: 'admin' } });
  const nurseRole = await prisma.systemRole.findUnique({ where: { name: 'nurse' } });
  const salesRole = await prisma.systemRole.findUnique({ where: { name: 'sales' } });

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dermicapro.com' },
    update: {},
    create: {
      email: 'admin@dermicapro.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'DermicaPro',
      roleId: adminRole?.id,
      sex: 'Other',
      isActive: true,
    },
  });
  console.log('Admin user created:', admin.email);

  // Create nurse user
  const nursePassword = await bcrypt.hash('nurse123', 12);
  const nurse = await prisma.user.upsert({
    where: { email: 'enfermera@dermicapro.com' },
    update: {},
    create: {
      email: 'enfermera@dermicapro.com',
      passwordHash: nursePassword,
      firstName: 'María',
      lastName: 'García',
      roleId: nurseRole?.id,
      sex: 'F',
      isActive: true,
    },
  });
  console.log('Nurse user created:', nurse.email);

  // Create sales user
  const salesPassword = await bcrypt.hash('sales123', 12);
  const sales = await prisma.user.upsert({
    where: { email: 'ventas@dermicapro.com' },
    update: {},
    create: {
      email: 'ventas@dermicapro.com',
      passwordHash: salesPassword,
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      roleId: salesRole?.id,
      sex: 'M',
      isActive: true,
    },
  });
  console.log('Sales user created:', sales.email);

  // Create services
  const services = [
    {
      name: 'HIFU 12D (Lifting sin Cirugía)',
      description: 'Tecnología de ultrasonido para combatir la flacidez facial',
      basePrice: 500.00,
      defaultSessions: 1,
    },
    {
      name: 'Borrado de Manchas (Pico Láser)',
      description: 'Tratamiento para manchas hormonales, solares y post-acné',
      basePrice: 300.00,
      defaultSessions: 1,
    },
    {
      name: 'Hollywood Peel',
      description: 'Luminosidad instantánea y cierre de poros',
      basePrice: 180.00,
      defaultSessions: 1,
    },
    {
      name: 'Hollywood Peel (Paquete x3)',
      description: 'Paquete de 3 sesiones de Hollywood Peel con descuento',
      basePrice: 500.00,
      defaultSessions: 3,
    },
    {
      name: 'Enzimas Recombinantes',
      description: 'Tratamiento para grasa localizada, fibrosis y exceso de ácido hialurónico',
      basePrice: 800.00,
      defaultSessions: 2,
    },
    {
      name: 'Reducción de Papada (Enzimas + HIFU)',
      description: 'Combinación de tecnologías para eliminar grasa y tensar la piel',
      basePrice: 600.00,
      defaultSessions: 1,
    },
    {
      name: 'Borrado de Tatuajes',
      description: 'Eliminación segura de tatuajes',
      basePrice: 400.00,
      defaultSessions: 1,
    },
    {
      name: 'Borrado de Micropigmentación',
      description: 'Eliminación de micropigmentación fallida',
      basePrice: 300.00,
      defaultSessions: 1,
    },
    {
      name: 'Borrado de Micropigmentación (Paquete x4)',
      description: 'Paquete de 4 sesiones de Borrado de Micropigmentación con descuento',
      basePrice: 999.00,
      defaultSessions: 4,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.name }, // temporary unique identifier
      update: {},
      create: service,
    }).catch(() => {
      // If upsert fails due to id issue, just create
      return prisma.service.create({ data: service });
    });
  }
  console.log(`${services.length} services created`);

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
