import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Define permissions directly in seed to avoid import issues in production
const BASE_PERMISSIONS = [
  {
    name: 'dashboard.access',
    displayName: '📊 Acceso a Dashboard',
    description: 'Permite acceder al módulo de Panel principal del sistema',
    module: 'dashboard',
    action: 'access',
  },
  {
    name: 'patients.access',
    displayName: '👥 Acceso a Pacientes',
    description: 'Permite acceder al módulo de Gestión de pacientes',
    module: 'patients',
    action: 'access',
  },
  {
    name: 'appointments.access',
    displayName: '📅 Acceso a Citas',
    description: 'Permite acceder al módulo de Gestión de citas',
    module: 'appointments',
    action: 'access',
  },
  {
    name: 'services.access',
    displayName: '💉 Acceso a Servicios',
    description: 'Permite acceder al módulo de Gestión de servicios',
    module: 'services',
    action: 'access',
  },
  {
    name: 'employees.access',
    displayName: '👔 Acceso a Recursos Humanos',
    description: 'Permite acceder al módulo de Gestión de empleados',
    module: 'employees',
    action: 'access',
  },
  {
    name: 'roles.access',
    displayName: '🔐 Acceso a Roles y Permisos',
    description: 'Permite acceder al módulo de Gestión de roles y permisos',
    module: 'roles',
    action: 'access',
  },
  {
    name: 'analytics.access',
    displayName: '📈 Acceso a Analíticas',
    description: 'Permite acceder al módulo de Analíticas y reportes',
    module: 'analytics',
    action: 'access',
  },
  {
    name: 'invoices.access',
    displayName: '💰 Acceso a Facturación',
    description: 'Permite acceder al módulo de Facturas y pagos',
    module: 'invoices',
    action: 'access',
  },
  {
    name: 'medical_records.access',
    displayName: '📋 Acceso a Historiales Médicos',
    description: 'Permite acceder al módulo de Historiales clínicos',
    module: 'medical_records',
    action: 'access',
  },
  {
    name: 'settings.access',
    displayName: '⚙️ Acceso a Configuración',
    description: 'Permite acceder al módulo de Configuración del sistema',
    module: 'settings',
    action: 'access',
  },
];

async function main() {
  console.log('Starting seed...');

  // ===== STEP 1: Create/Update System Roles =====
  console.log('Creating system roles...');

  const adminRole = await prisma.systemRole.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      displayName: 'Administrador',
      description: 'Acceso completo al sistema',
      isSystem: true,
      isActive: true,
    },
  });

  const nurseRole = await prisma.systemRole.upsert({
    where: { name: 'nurse' },
    update: {},
    create: {
      name: 'nurse',
      displayName: 'Enfermera',
      description: 'Personal de enfermería',
      isSystem: true,
      isActive: true,
    },
  });

  const salesRole = await prisma.systemRole.upsert({
    where: { name: 'sales' },
    update: {},
    create: {
      name: 'sales',
      displayName: 'Ventas',
      description: 'Personal de ventas',
      isSystem: true,
      isActive: true,
    },
  });

  console.log('System roles created/updated');

  // ===== STEP 2: Create/Update Permissions =====
  console.log('Creating permissions...');

  const createdPermissions = [];

  for (const perm of BASE_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {
        displayName: perm.displayName,
        description: perm.description,
      },
      create: perm,
    });
    createdPermissions.push(permission);
  }

  console.log(`${createdPermissions.length} permissions created/updated`);

  // ===== STEP 3: Assign ALL Permissions to Admin Role =====
  console.log('Assigning all permissions to admin role...');

  for (const permission of createdPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log(`All ${createdPermissions.length} permissions assigned to admin`);

  // ===== STEP 4: Create Default Users =====
  console.log('Creating default users...');

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
      roleId: adminRole.id,
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
      roleId: nurseRole.id,
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
      roleId: salesRole.id,
      sex: 'M',
      isActive: true,
    },
  });
  console.log('Sales user created:', sales.email);

  // ===== STEP 5: Create Services =====
  console.log('Creating services...');

  const services = [
    {
      name: 'HIFU 12D (Lifting sin Cirugía)',
      description: 'Tecnología de ultrasonido para combatir la flacidez facial',
      basePrice: 500.00,
      defaultSessions: 1,
      commissionType: 'percentage',
      commissionRate: 0.15, // 15%
      commissionNotes: 'Comisión del 15% sobre el precio final',
    },
    {
      name: 'Borrado de Manchas (Pico Láser)',
      description: 'Tratamiento para manchas hormonales, solares y post-acné',
      basePrice: 300.00,
      defaultSessions: 1,
      commissionType: 'percentage',
      commissionRate: 0.12, // 12%
      commissionNotes: 'Comisión del 12% sobre el precio final',
    },
    {
      name: 'Hollywood Peel',
      description: 'Luminosidad instantánea y cierre de poros',
      basePrice: 180.00,
      defaultSessions: 1,
      commissionType: 'fixed',
      commissionFixedAmount: 25.00, // S/ 25 fijo
      commissionNotes: 'Comisión fija de S/ 25 por venta',
    },
    {
      name: 'Hollywood Peel (Paquete x3)',
      description: 'Paquete de 3 sesiones de Hollywood Peel con descuento',
      basePrice: 500.00,
      defaultSessions: 3,
      commissionType: 'fixed',
      commissionFixedAmount: 60.00, // S/ 60 fijo
      commissionNotes: 'Comisión fija de S/ 60 por paquete',
    },
    {
      name: 'Enzimas Recombinantes',
      description: 'Tratamiento para grasa localizada, fibrosis y exceso de ácido hialurónico',
      basePrice: 800.00,
      defaultSessions: 2,
      commissionType: 'percentage',
      commissionRate: 0.18, // 18%
      commissionNotes: 'Comisión del 18% sobre el precio final',
    },
    {
      name: 'Reducción de Papada (Enzimas + HIFU)',
      description: 'Combinación de tecnologías para eliminar grasa y tensar la piel',
      basePrice: 600.00,
      defaultSessions: 1,
      commissionType: 'percentage',
      commissionRate: 0.15, // 15%
      commissionNotes: 'Comisión del 15% sobre el precio final',
    },
    {
      name: 'Borrado de Tatuajes',
      description: 'Eliminación segura de tatuajes',
      basePrice: 400.00,
      defaultSessions: 1,
      commissionType: 'fixed',
      commissionFixedAmount: 50.00, // S/ 50 fijo
      commissionNotes: 'Comisión fija de S/ 50 por sesión',
    },
    {
      name: 'Borrado de Micropigmentación',
      description: 'Eliminación de micropigmentación fallida',
      basePrice: 300.00,
      defaultSessions: 1,
      commissionType: 'percentage',
      commissionRate: 0.10, // 10%
      commissionNotes: 'Comisión del 10% sobre el precio final',
    },
    {
      name: 'Borrado de Micropigmentación (Paquete x4)',
      description: 'Paquete de 4 sesiones de Borrado de Micropigmentación con descuento',
      basePrice: 999.00,
      defaultSessions: 4,
      commissionType: 'percentage',
      commissionRate: 0.12, // 12%
      commissionNotes: 'Comisión del 12% sobre el precio final del paquete',
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

  // ===== STEP 6: Create Subscription Plans =====
  console.log('Creating subscription plans...');

  // NOTA: Los IDs de Stripe deben ser configurados después de crear
  // los productos/precios en Stripe Dashboard. Por ahora se dejan null
  // y se actualizan manualmente o vía API de admin.

  const subscriptionPlans = [
    {
      name: 'regular',
      displayName: 'Plan Regular',
      description: 'Beneficios esenciales para pacientes frecuentes',
      tier: 'regular' as const,
      priceAmountCents: 8000, // S/ 80.00
      currency: 'PEN',
      billingInterval: 'month',
      discountPercentage: 10, // 10% de descuento
      includedSessions: 1, // 1 sesión incluida al mes
      priorityBooking: false,
      features: {
        earlyAccess: false,
        exclusiveContent: false,
      },
      isActive: true,
      sortOrder: 1,
      // stripeProductId y stripePriceId se configuran después
    },
    {
      name: 'pro',
      displayName: 'Plan Pro',
      description: 'Máximos beneficios y prioridad en atención',
      tier: 'pro' as const,
      priceAmountCents: 12000, // S/ 120.00
      currency: 'PEN',
      billingInterval: 'month',
      discountPercentage: 20, // 20% de descuento
      includedSessions: 2, // 2 sesiones incluidas al mes
      priorityBooking: true,
      features: {
        earlyAccess: true,
        exclusiveContent: true,
        prioritySupport: true,
      },
      isActive: true,
      sortOrder: 2,
      // stripeProductId y stripePriceId se configuran después
    },
  ];

  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: {
        displayName: plan.displayName,
        description: plan.description,
        priceAmountCents: plan.priceAmountCents,
        discountPercentage: plan.discountPercentage,
        includedSessions: plan.includedSessions,
        priorityBooking: plan.priorityBooking,
        features: plan.features,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    });
  }
  console.log(`${subscriptionPlans.length} subscription plans created`);

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
