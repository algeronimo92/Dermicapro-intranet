import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL!) });

async function main() {
  console.log('Starting seed...');

  // ===== STEP 1: Create Roles =====
  console.log('Creating roles...');

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: { displayName: 'Administrador', description: 'Acceso completo al sistema' },
    create: { name: 'admin', displayName: 'Administrador', description: 'Acceso completo al sistema' },
  });

  const medicalRole = await prisma.role.upsert({
    where: { name: 'medical_staff' },
    update: { displayName: 'Personal Médico', description: 'Atiende citas y registra fichas médicas' },
    create: { name: 'medical_staff', displayName: 'Personal Médico', description: 'Atiende citas y registra fichas médicas' },
  });

  const assistantRole = await prisma.role.upsert({
    where: { name: 'assistant' },
    update: { displayName: 'Personal Asistente', description: 'Apoya en la gestión de citas y pacientes' },
    create: { name: 'assistant', displayName: 'Personal Asistente', description: 'Apoya en la gestión de citas y pacientes' },
  });

  const salesRole = await prisma.role.upsert({
    where: { name: 'sales' },
    update: { displayName: 'Vendedor', description: 'Gestiona ventas y citas con pacientes' },
    create: { name: 'sales', displayName: 'Vendedor', description: 'Gestiona ventas y citas con pacientes' },
  });

  console.log('Roles created');

  // ===== STEP 2: Create Default Users =====
  console.log('Creating default users...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dermicapro.com' },
    update: { themeMode: 'dark' },
    create: {
      email: 'admin@dermicapro.com',
      passwordHash: await bcrypt.hash('admin123', 12),
      firstName: 'Admin',
      lastName: 'DermicaPro',
      roleId: adminRole.id,
      sex: 'Other',
      isActive: true,
      themeMode: 'dark',
    },
  });
  console.log('Admin user:', admin.email);

  const defaultPassword = await bcrypt.hash('1234567890', 12);

  await prisma.user.upsert({
    where: { email: 'ggeronimo@dermicapro.com' },
    update: { themeMode: 'dark', email: 'ggeronimo@dermicapro.com' },
    create: {
      email: 'ggeronimo@dermicapro.com',
      passwordHash: defaultPassword,
      firstName: 'Grecia',
      lastName: 'Geronimo',
      roleId: salesRole.id,
      sex: 'F',
      isActive: true,
      mustChangePassword: true,
      themeMode: 'dark',
    },
  });
  console.log('Sales user: ggeronimo@dermicapro.com');

  await prisma.user.upsert({
    where: { email: 'ageronimo@dermicapro.com' },
    update: { themeMode: 'dark', email: 'ageronimo@dermicapro.com' },
    create: {
      email: 'ageronimo@dermicapro.com',
      passwordHash: defaultPassword,
      firstName: 'Antonella',
      lastName: 'Elizabeth',
      roleId: salesRole.id,
      sex: 'F',
      isActive: true,
      mustChangePassword: true,
      themeMode: 'dark',
    },
  });
  console.log('Sales user: ageronimo@dermicapro.com');

  await prisma.user.upsert({
    where: { email: 'emurga@dermicapro.com' },
    update: { themeMode: 'dark', email: 'emurga@dermicapro.com' },
    create: {
      email: 'emurga@dermicapro.com',
      passwordHash: defaultPassword,
      firstName: 'Estefany',
      lastName: 'Murga',
      roleId: assistantRole.id,
      sex: 'F',
      isActive: true,
      mustChangePassword: true,
      themeMode: 'dark',
    },
  });
  console.log('Assistant user: emurga@dermicapro.com');

  await prisma.user.upsert({
    where: { email: 'aterres@dermicapro.com' },
    update: { themeMode: 'dark', email: 'aterres@dermicapro.com' },
    create: {
      email: 'aterres@dermicapro.com',
      passwordHash: defaultPassword,
      firstName: 'Astrid',
      lastName: 'Terres',
      roleId: assistantRole.id,
      sex: 'F',
      isActive: true,
      mustChangePassword: true,
      themeMode: 'dark',
    },
  });
  console.log('Assistant user: aterres@dermicapro.com');

  await prisma.user.upsert({
    where: { email: 'daguilar@dermicapro.com' },
    update: { themeMode: 'dark', email: 'daguilar@dermicapro.com' },
    create: {
      email: 'daguilar@dermicapro.com',
      passwordHash: defaultPassword,
      firstName: 'Diego',
      lastName: 'Aguilar',
      roleId: medicalRole.id,
      sex: 'M',
      isActive: true,
      mustChangePassword: true,
      themeMode: 'dark',
    },
  });
  console.log('Medical staff user: daguilar@dermicapro.com');

  // ===== STEP 2b: System Settings =====
  console.log('Creating system settings...');
  await prisma.systemSetting.upsert({
    where: { key: 'session_timeout_minutes' },
    update: {},
    create: {
      key: 'session_timeout_minutes',
      value: '5',
      description: 'Minutos de inactividad antes de cerrar sesión automáticamente',
    },
  });
  console.log('System settings created');

  // ===== STEP 3: Clear and Recreate Service Templates =====
  console.log('Clearing existing service data...');
  await prisma.commission.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.serviceInstance.deleteMany({});
  await prisma.serviceTemplate.deleteMany({});
  console.log('Service data cleared');

  console.log('Creating service templates...');

  const serviceTemplates = [
    // ─── GENERAL ───
    { name: 'Consulta',                                                   basePrice: 50.00,    defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 5.00, commissionNotes: 'Comisión fija S/5' },
    { name: 'Control',                                                    basePrice: 0.00,     defaultSessions: 1 },

    // ─── DEPILACIÓN LÁSER TRIDIODO (comisión fija S/10) ───
    { name: 'Depilación Láser Tridiodo - Espalda Completa',            basePrice: 140.00,   defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Espalda Completa (x6)',       basePrice: 560.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Entrepierna',                 basePrice: 60.00,    defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Entrepierna (x6)',            basePrice: 240.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Medio Brazo',                 basePrice: 80.00,    defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Medio Brazo (x6)',            basePrice: 320.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Brazo Completo',              basePrice: 100.00,   defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Brazo Completo (x6)',         basePrice: 400.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Bikini Brasilero',            basePrice: 100.00,   defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Bikini Brasilero (x6)',       basePrice: 400.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Bikini Clásico',              basePrice: 120.00,   defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Bikini Clásico (x6)',         basePrice: 480.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Rostro Completo',             basePrice: 60.00,    defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Rostro Completo (x6)',        basePrice: 240.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Bozo',                        basePrice: 40.00,    defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Bozo (x6)',                   basePrice: 160.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Patillas',                    basePrice: 30.00,    defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Patillas (x6)',               basePrice: 120.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Axilas',                      basePrice: 50.00,    defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Axilas (x6)',                 basePrice: 200.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Piernas',                     basePrice: 200.00,   defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Piernas (x6)',                basePrice: 800.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Glúteos',                     basePrice: 100.00,   defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Glúteos (x6)',                basePrice: 400.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Rostro + Axila',              basePrice: 80.00,    defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Rostro + Axila (x6)',         basePrice: 320.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Bozo + Bikini Completo',      basePrice: 100.00,   defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Bozo + Bikini Completo (x6)', basePrice: 400.00,   defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Piernas Completas + Axila',      basePrice: 200.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Depilación Láser Tridiodo - Piernas Completas + Axila (x6)', basePrice: 800.00, defaultSessions: 6, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },

    // ─── HIFU 12D (comisión fija S/20) ───
    { name: 'HIFU 12D - Rostro + Papada',                    basePrice: 400.00,  defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },
    { name: 'HIFU 12D - Rostro + Papada + Cuello + Escote',  basePrice: 600.00,  defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },
    { name: 'HIFU 12D - Brazos',                             basePrice: 700.00,  defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },
    { name: 'HIFU 12D - Abdomen',                            basePrice: 1000.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },

    // ─── HOLLYWOOD PEEL (x1: S/8, paquete x3: S/18) ───
    { name: 'Hollywood Peel - Rostro',                basePrice: 180.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 8.00,  commissionNotes: 'Comisión fija S/8' },
    { name: 'Hollywood Peel - Rostro (x3)',           basePrice: 400.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 18.00, commissionNotes: 'Comisión fija S/18' },
    { name: 'Hollywood Peel - Rostro + Cuello',       basePrice: 220.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 8.00,  commissionNotes: 'Comisión fija S/8' },
    { name: 'Hollywood Peel - Rostro + Cuello (x3)',  basePrice: 480.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 18.00, commissionNotes: 'Comisión fija S/18' },
    { name: 'Hollywood Peel - Cuello',                basePrice: 100.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 8.00,  commissionNotes: 'Comisión fija S/8' },
    { name: 'Hollywood Peel - Cuello (x3)',           basePrice: 200.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 18.00, commissionNotes: 'Comisión fija S/18' },
    { name: 'Hollywood Peel - Axilas',                basePrice: 120.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 8.00,  commissionNotes: 'Comisión fija S/8' },
    { name: 'Hollywood Peel - Axilas (x3)',           basePrice: 250.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 18.00, commissionNotes: 'Comisión fija S/18' },

    // ─── LIMPIEZA FACIAL ESTÁNDAR (comisión fija S/6) ───
    { name: 'Limpieza Facial Estándar - 1 Persona',       basePrice: 100.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 6.00, commissionNotes: 'Comisión fija S/6' },
    { name: 'Limpieza Facial Estándar - 1 Persona (x2)',  basePrice: 180.00, defaultSessions: 2, commissionType: 'fixed', commissionFixedAmount: 6.00, commissionNotes: 'Comisión fija S/6' },
    { name: 'Limpieza Facial Estándar - 1 Persona (x3)',  basePrice: 225.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 6.00, commissionNotes: 'Comisión fija S/6' },
    { name: 'Limpieza Facial Estándar - 2 Personas',      basePrice: 160.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 6.00, commissionNotes: 'Comisión fija S/6' },

    // ─── LIMPIEZA FACIAL PREMIUM (comisión fija S/6) ───
    { name: 'Limpieza Facial Premium - 1 Persona',       basePrice: 150.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 6.00, commissionNotes: 'Comisión fija S/6' },
    { name: 'Limpieza Facial Premium - 1 Persona (x2)',  basePrice: 280.00, defaultSessions: 2, commissionType: 'fixed', commissionFixedAmount: 6.00, commissionNotes: 'Comisión fija S/6' },
    { name: 'Limpieza Facial Premium - 1 Persona (x3)',  basePrice: 380.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 6.00, commissionNotes: 'Comisión fija S/6' },
    { name: 'Limpieza Facial Premium - 2 Personas',      basePrice: 260.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 6.00, commissionNotes: 'Comisión fija S/6' },

    // ─── EXOSOMAS TRX (comisión fija S/12) ───
    { name: 'Exosomas TRX - Rostro',       basePrice: 350.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 12.00, commissionNotes: 'Comisión fija S/12' },
    { name: 'Exosomas TRX - Rostro (x3)',  basePrice: 950.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 12.00, commissionNotes: 'Comisión fija S/12' },

    // ─── ÁCIDO TRANEXÁMICO (comisión fija S/15) ───
    { name: 'Ácido Tranexámico - Rostro',       basePrice: 300.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 15.00, commissionNotes: 'Comisión fija S/15' },
    { name: 'Ácido Tranexámico - Rostro (x3)',  basePrice: 800.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 15.00, commissionNotes: 'Comisión fija S/15' },

    // ─── ENZIMAS RECOMBINANTES (comisión fija S/20) ───
    { name: 'Enzimas Recombinantes - Papada',       basePrice: 450.00,  defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },
    { name: 'Enzimas Recombinantes - Papada (x2)',  basePrice: 800.00,  defaultSessions: 2, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },
    { name: 'Enzimas Recombinantes - Papada (x4)',  basePrice: 1500.00, defaultSessions: 4, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },

    // ─── ADN DE SALMÓN (comisión fija S/15) ───
    { name: 'ADN de Salmón - Rostro',       basePrice: 250.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 15.00, commissionNotes: 'Comisión fija S/15' },
    { name: 'ADN de Salmón - Rostro (x3)',  basePrice: 650.00, defaultSessions: 3, commissionType: 'fixed', commissionFixedAmount: 15.00, commissionNotes: 'Comisión fija S/15' },

    // ─── BORRADO DE CEJAS (comisión fija S/15) ───
    { name: 'Borrado de Cejas',       basePrice: 250.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 15.00, commissionNotes: 'Comisión fija S/15' },
    { name: 'Borrado de Cejas (x2)',  basePrice: 480.00, defaultSessions: 2, commissionType: 'fixed', commissionFixedAmount: 15.00, commissionNotes: 'Comisión fija S/15' },
    { name: 'Borrado de Cejas (x4)',  basePrice: 800.00, defaultSessions: 4, commissionType: 'fixed', commissionFixedAmount: 15.00, commissionNotes: 'Comisión fija S/15' },

    // ─── BOTOX (comisión fija S/20) ───
    { name: 'Botox - 1 Zona',   basePrice: 350.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },
    { name: 'Botox - 2 Zonas',  basePrice: 600.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },
    { name: 'Botox - 3 Zonas',  basePrice: 850.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },

    // ─── REMOCIÓN DE LUNARES O ACROCORDONES (comisión fija S/10) ───
    { name: 'Remoción de Lunares - 1 a 2 Lunares',   basePrice: 100.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Remoción de Lunares - 2 a 5 Lunares',   basePrice: 150.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },
    { name: 'Remoción de Lunares - 5 a 10 Lunares',  basePrice: 250.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 10.00, commissionNotes: 'Comisión fija S/10' },

    // ─── RINOMODELACIÓN (comisión fija S/25) ───
    { name: 'Rinomodelación - Nariz 1 Jeringa', basePrice: 700.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 25.00, commissionNotes: 'Comisión fija S/25' },

    // ─── PUNTOS DE ANCLAJE (comisión 5%) — 1 sesión, precio según nº de jeringas ───
    { name: 'Puntos de Anclaje - 1 Jeringa',  basePrice: 700.00,  defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.05, commissionNotes: 'Comisión 5%' },
    { name: 'Puntos de Anclaje - 2 Jeringas', basePrice: 1200.00, defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.05, commissionNotes: 'Comisión 5%' },
    { name: 'Puntos de Anclaje - 3 Jeringas', basePrice: 1740.00, defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.05, commissionNotes: 'Comisión 5%' },
    { name: 'Puntos de Anclaje - 4 Jeringas', basePrice: 2200.00, defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.05, commissionNotes: 'Comisión 5%' },
    { name: 'Puntos de Anclaje - 5 Jeringas', basePrice: 2600.00, defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.05, commissionNotes: 'Comisión 5%' },
    { name: 'Puntos de Anclaje - 6 Jeringas', basePrice: 3000.00, defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.05, commissionNotes: 'Comisión 5%' },

    // ─── EXOSOMAS + ADN VTECH (comisión fija S/20) ───
    { name: 'Exosomas + ADN Vtech - Vial Entero', basePrice: 1000.00, defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },
    { name: 'Exosomas + ADN Vtech - Medio Vial',  basePrice: 500.00,  defaultSessions: 1, commissionType: 'fixed', commissionFixedAmount: 20.00, commissionNotes: 'Comisión fija S/20' },

    // ─── BORRADO DE TATUAJES (comisión 10%) ───
    // x2 = precio×2 con 10% descuento | x4 = precio×3 (1 sesión gratis)
    { name: 'Borrado de Tatuajes - XXXS',       basePrice: 80.00,    defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXXS (x2)',  basePrice: 144.00,   defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXXS (x4)',  basePrice: 240.00,   defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXS',        basePrice: 150.00,   defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXS (x2)',   basePrice: 270.00,   defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXS (x4)',   basePrice: 450.00,   defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XS',         basePrice: 250.00,   defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XS (x2)',    basePrice: 450.00,   defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XS (x4)',    basePrice: 750.00,   defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - S',          basePrice: 350.00,   defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - S (x2)',     basePrice: 630.00,   defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - S (x4)',     basePrice: 1050.00,  defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - M',          basePrice: 500.00,   defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - M (x2)',     basePrice: 900.00,   defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - M (x4)',     basePrice: 1500.00,  defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - L',          basePrice: 800.00,   defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - L (x2)',     basePrice: 1440.00,  defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - L (x4)',     basePrice: 2400.00,  defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XL',         basePrice: 1200.00,  defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XL (x2)',    basePrice: 2160.00,  defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XL (x4)',    basePrice: 3600.00,  defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXL',        basePrice: 1600.00,  defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXL (x2)',   basePrice: 2880.00,  defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXL (x4)',   basePrice: 4800.00,  defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXXL',       basePrice: 2000.00,  defaultSessions: 1, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXXL (x2)',  basePrice: 3600.00,  defaultSessions: 2, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
    { name: 'Borrado de Tatuajes - XXXL (x4)',  basePrice: 6000.00,  defaultSessions: 4, commissionType: 'percentage', commissionRate: 0.10, commissionNotes: 'Comisión 10%' },
  ];

  await prisma.serviceTemplate.createMany({ data: serviceTemplates });
  console.log(`${serviceTemplates.length} service templates created`);

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
