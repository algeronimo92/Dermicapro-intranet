import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const services = [
  {
    name: 'Micropigmentación de Cejas',
    description: 'Técnica de diseño de cejas con microblading',
    basePrice: 350.00,
    isActive: true
  },
  {
    name: 'Micropigmentación de Labios',
    description: 'Técnica de perfilado y relleno de labios',
    basePrice: 400.00,
    isActive: true
  },
  {
    name: 'Micropigmentación de Ojos (Delineado)',
    description: 'Delineado permanente de ojos',
    basePrice: 300.00,
    isActive: true
  },
  {
    name: 'Dermopigmentación Capilar',
    description: 'Técnica de micropigmentación del cuero cabelludo',
    basePrice: 500.00,
    isActive: true
  },
  {
    name: 'Corrección de Cicatrices',
    description: 'Camuflaje de cicatrices con micropigmentación',
    basePrice: 450.00,
    isActive: true
  },
  {
    name: 'Retoque de Cejas',
    description: 'Retoque de micropigmentación de cejas existente',
    basePrice: 150.00,
    isActive: true
  },
  {
    name: 'Retoque de Labios',
    description: 'Retoque de micropigmentación de labios existente',
    basePrice: 180.00,
    isActive: true
  },
  {
    name: 'Eliminación con Láser',
    description: 'Eliminación de micropigmentación con láser',
    basePrice: 250.00,
    isActive: true
  },
  {
    name: 'Consulta Inicial',
    description: 'Consulta de evaluación y diseño personalizado',
    basePrice: 50.00,
    isActive: true
  }
];

async function main() {
  console.log('Seeding services...');

  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name }
    });

    if (!existing) {
      await prisma.service.create({
        data: service
      });
      console.log(`✓ Created: ${service.name}`);
    } else {
      console.log(`- Skipped: ${service.name} (already exists)`);
    }
  }

  console.log('\nSeeding complete!');
  const count = await prisma.service.count();
  console.log(`Total services in database: ${count}`);
}

main()
  .catch((e) => {
    console.error('Error seeding services:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
