/**
 * seed-alan.ts
 * Demo data para el paciente Alan Geronimo
 * Corre con: npx ts-node prisma/seed-alan.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PATIENT_ID = 'e8c7f60b-a161-4d06-996f-ce0219e7fd4c';

async function main() {
  console.log('🌱 Generando datos demo para Alan Geronimo...');

  // ── Obtener usuarios existentes ──────────────────────────────────────────
  const grecia  = await prisma.user.findFirstOrThrow({ where: { firstName: 'Grecia' } });
  const diego   = await prisma.user.findFirstOrThrow({ where: { firstName: 'Diego' } });
  const admin   = await prisma.user.findFirstOrThrow({ where: { email: 'admin@dermicapro.com' } });

  // ── Obtener service templates ────────────────────────────────────────────
  const tHollywood = await prisma.serviceTemplate.findFirstOrThrow({ where: { name: 'Hollywood Peel - Rostro (x3)' } });
  const tADN       = await prisma.serviceTemplate.findFirstOrThrow({ where: { name: 'ADN de Salmón - Rostro' } });
  const tHIFU      = await prisma.serviceTemplate.findFirstOrThrow({ where: { name: 'HIFU 12D - Rostro + Papada' } });
  const tDepi      = await prisma.serviceTemplate.findFirstOrThrow({ where: { name: 'Depilación Láser Tridiodo - Axilas (x6)' } });
  const tExoso     = await prisma.serviceTemplate.findFirstOrThrow({ where: { name: 'Exosomas TRX - Rostro' } });

  // ── Limpiar datos previos de este paciente ───────────────────────────────
  console.log('  Limpiando datos anteriores...');
  const existingApts = await prisma.appointment.findMany({ where: { patientId: PATIENT_ID } });
  for (const apt of existingApts) {
    await prisma.appointmentNote.deleteMany({ where: { appointmentId: apt.id } });
    await prisma.patientRecord.deleteMany({ where: { appointmentId: apt.id } });
    await prisma.commission.deleteMany({ where: { appointmentId: apt.id } });
    await prisma.session.deleteMany({ where: { appointmentId: apt.id } });
    await prisma.payment.deleteMany({ where: { appointmentId: apt.id } });
  }
  await prisma.appointment.deleteMany({ where: { patientId: PATIENT_ID } });
  // Limpiar invoices y orders del paciente
  const existingInstances = await prisma.serviceInstance.findMany({ where: { patientId: PATIENT_ID } });
  for (const inst of existingInstances) {
    await prisma.commission.deleteMany({ where: { serviceInstanceId: inst.id } });
  }
  const existingInvoices = await prisma.invoice.findMany({ where: { patientId: PATIENT_ID } });
  for (const inv of existingInvoices) {
    await prisma.payment.deleteMany({ where: { invoiceId: inv.id } });
    await prisma.serviceInstance.updateMany({ where: { invoiceId: inv.id }, data: { invoiceId: null } });
  }
  await prisma.invoice.deleteMany({ where: { patientId: PATIENT_ID } });
  await prisma.serviceInstance.deleteMany({ where: { patientId: PATIENT_ID } });
  console.log('  ✓ Limpieza completada');

  // ════════════════════════════════════════════════════════════════════════
  // STEP 1: Service Instances (Órdenes/Paquetes)
  // ════════════════════════════════════════════════════════════════════════
  console.log('  Creando órdenes de servicio...');

  const oHollywood = await prisma.serviceInstance.create({
    data: {
      patientId: PATIENT_ID,
      serviceTemplateId: tHollywood.id,
      totalSessions: 3,
      completedSessions: 2,
      originalPrice: 400.00,
      discount: 0,
      finalPrice: 400.00,
      createdById: grecia.id,
    },
  });

  const oADN = await prisma.serviceInstance.create({
    data: {
      patientId: PATIENT_ID,
      serviceTemplateId: tADN.id,
      totalSessions: 1,
      completedSessions: 1,
      originalPrice: 250.00,
      discount: 0,
      finalPrice: 250.00,
      createdById: grecia.id,
    },
  });

  const oHIFU = await prisma.serviceInstance.create({
    data: {
      patientId: PATIENT_ID,
      serviceTemplateId: tHIFU.id,
      totalSessions: 1,
      completedSessions: 1,
      originalPrice: 400.00,
      discount: 40.00,   // 10% descuento aplicado
      finalPrice: 360.00,
      notes: 'Descuento cliente frecuente',
      createdById: grecia.id,
    },
  });

  const oDepi = await prisma.serviceInstance.create({
    data: {
      patientId: PATIENT_ID,
      serviceTemplateId: tDepi.id,
      totalSessions: 6,
      completedSessions: 0,
      originalPrice: 200.00,
      discount: 0,
      finalPrice: 200.00,
      createdById: grecia.id,
    },
  });

  const oExoso = await prisma.serviceInstance.create({
    data: {
      patientId: PATIENT_ID,
      serviceTemplateId: tExoso.id,
      totalSessions: 3,
      completedSessions: 0,
      originalPrice: 950.00,
      discount: 0,
      finalPrice: 950.00,
      createdById: grecia.id,
    },
  });

  console.log('  ✓ 5 órdenes creadas');

  // ════════════════════════════════════════════════════════════════════════
  // STEP 2: Invoices + Payments
  // ════════════════════════════════════════════════════════════════════════
  console.log('  Creando facturas...');

  // Factura 1: Hollywood Peel + ADN → PAGADA
  const invoice1 = await prisma.invoice.create({
    data: {
      patientId: PATIENT_ID,
      totalAmount: 650.00,
      status: 'paid',
      dueDate: new Date('2026-04-20'),
      createdById: admin.id,
      orders: { connect: [{ id: oHollywood.id }, { id: oADN.id }] },
    },
  });

  await prisma.payment.create({
    data: {
      patientId: PATIENT_ID,
      invoiceId: invoice1.id,
      amountPaid: 650.00,
      paymentMethod: 'yape',
      paymentType: 'invoice_payment',
      paymentDate: new Date('2026-04-06'),
      notes: 'Pago completo por Yape',
      createdById: grecia.id,
    },
  });

  // Factura 2: HIFU → PAGO PARCIAL
  const invoice2 = await prisma.invoice.create({
    data: {
      patientId: PATIENT_ID,
      totalAmount: 360.00,
      status: 'partial',
      dueDate: new Date('2026-06-15'),
      createdById: admin.id,
      orders: { connect: [{ id: oHIFU.id }] },
    },
  });

  await prisma.payment.create({
    data: {
      patientId: PATIENT_ID,
      invoiceId: invoice2.id,
      amountPaid: 180.00,
      paymentMethod: 'cash',
      paymentType: 'invoice_payment',
      paymentDate: new Date('2026-05-11'),
      notes: 'Pago inicial en efectivo',
      createdById: grecia.id,
    },
  });

  await prisma.payment.create({
    data: {
      patientId: PATIENT_ID,
      invoiceId: invoice2.id,
      amountPaid: 100.00,
      paymentMethod: 'transfer',
      paymentType: 'invoice_payment',
      paymentDate: new Date('2026-05-25'),
      notes: 'Pago parcial por transferencia',
      createdById: grecia.id,
    },
  });

  // Exosomas sin facturar → queda libre para demostrar "órdenes sin facturar"

  console.log('  ✓ 2 facturas + 3 pagos creados');

  // ════════════════════════════════════════════════════════════════════════
  // STEP 3: Appointments
  // ════════════════════════════════════════════════════════════════════════
  console.log('  Creando citas...');

  // ─── CITA 1: 3 Marzo 2026 — attended — Hollywood Peel sesión 1 ──────────
  const apt1 = await prisma.appointment.create({
    data: {
      patientId: PATIENT_ID,
      scheduledDate: new Date('2026-03-03T10:00:00'),
      durationMinutes: 60,
      status: 'attended',
      reservationAmount: 50.00,
      attendedById: diego.id,
      attendedAt: new Date('2026-03-03T10:15:00'),
      createdById: grecia.id,
      createdAt: new Date('2026-02-28T09:00:00'),
    },
  });
  await prisma.session.create({ data: { appointmentId: apt1.id, serviceInstanceId: oHollywood.id, sessionNumber: 1 } });

  await prisma.patientRecord.create({
    data: {
      patientId: PATIENT_ID,
      appointmentId: apt1.id,
      weight: 68.5,
      bodyMeasurement: { height: 165, waist: 75, hips: 98, abdomen: 22 },
      healthNotes: 'Primera sesión Hollywood Peel. Piel Fitzpatrick III. Sin alergias conocidas. Buena tolerancia al tratamiento.',
      createdById: diego.id,
      createdAt: new Date('2026-03-03T11:00:00'),
    },
  });

  await prisma.appointmentNote.create({
    data: {
      appointmentId: apt1.id,
      note: 'Paciente toleró bien el procedimiento. Se observa piel opaca con acumulación de células muertas. Se recomienda usar protector solar SPF 50 diariamente y evitar exposición solar las primeras 48h.',
      createdById: diego.id,
      createdAt: new Date('2026-03-03T11:10:00'),
    },
  });

  await prisma.appointmentNote.create({
    data: {
      appointmentId: apt1.id,
      note: 'Próxima sesión en 4 semanas. Recordar no usar cremas exfoliantes 3 días antes.',
      createdById: grecia.id,
      createdAt: new Date('2026-03-03T11:20:00'),
    },
  });

  // ─── CITA 2: 5 Abril 2026 — attended — Hollywood Peel S2 + ADN ──────────
  const apt2 = await prisma.appointment.create({
    data: {
      patientId: PATIENT_ID,
      scheduledDate: new Date('2026-04-05T11:00:00'),
      durationMinutes: 90,
      status: 'attended',
      attendedById: diego.id,
      attendedAt: new Date('2026-04-05T11:10:00'),
      createdById: grecia.id,
      createdAt: new Date('2026-03-28T10:00:00'),
    },
  });
  await prisma.session.create({ data: { appointmentId: apt2.id, serviceInstanceId: oHollywood.id, sessionNumber: 2 } });
  await prisma.session.create({ data: { appointmentId: apt2.id, serviceInstanceId: oADN.id, sessionNumber: 1 } });

  await prisma.patientRecord.create({
    data: {
      patientId: PATIENT_ID,
      appointmentId: apt2.id,
      weight: 67.8,
      bodyMeasurement: { height: 165, waist: 73, hips: 97, abdomen: 20 },
      healthNotes: 'Segunda sesión Hollywood Peel + ADN de Salmón. Mejora visible en luminosidad. Se reduce hiperpigmentación en zona T. Paciente refiere que se siente bien. Sin reacciones adversas.',
      createdById: diego.id,
      createdAt: new Date('2026-04-05T12:30:00'),
    },
  });

  await prisma.appointmentNote.create({
    data: {
      appointmentId: apt2.id,
      note: 'Excelente respuesta al tratamiento. Piel con mayor luminosidad y textura más uniforme. ADN de Salmón aplicado en área de mayor deshidratación (contorno de ojos y frente). Recomendar hidratación intensa con ácido hialurónico en casa.',
      createdById: diego.id,
      createdAt: new Date('2026-04-05T12:45:00'),
    },
  });

  // Comisión sesión ADN
  await prisma.commission.create({
    data: {
      salesPersonId: grecia.id,
      appointmentId: apt2.id,
      serviceInstanceId: oADN.id,
      serviceTemplateId: tADN.id,
      commissionRate: 0.0000,
      baseAmount: 250.00,
      commissionAmount: 15.00,
      status: 'approved',
      approvedAt: new Date('2026-04-10T09:00:00'),
      approvedById: admin.id,
    },
  });

  // ─── CITA 3: 10 Mayo 2026 — attended — HIFU ─────────────────────────────
  const apt3 = await prisma.appointment.create({
    data: {
      patientId: PATIENT_ID,
      scheduledDate: new Date('2026-05-10T09:30:00'),
      durationMinutes: 120,
      status: 'attended',
      reservationAmount: 100.00,
      attendedById: diego.id,
      attendedAt: new Date('2026-05-10T09:45:00'),
      createdById: grecia.id,
      createdAt: new Date('2026-05-05T14:00:00'),
    },
  });
  await prisma.session.create({ data: { appointmentId: apt3.id, serviceInstanceId: oHIFU.id, sessionNumber: 1 } });

  await prisma.patientRecord.create({
    data: {
      patientId: PATIENT_ID,
      appointmentId: apt3.id,
      weight: 67.2,
      bodyMeasurement: { height: 165, waist: 72, hips: 96, abdomen: 19 },
      healthNotes: 'Sesión HIFU 12D completada. Tratamiento de ultrasonido focalizado en rostro, papada y cuello. Se utilizaron 12,000 disparos en zonas de mayor flacidez. Paciente tolera bien el dolor (EVA 3/10). Leve enrojecimiento post-tratamiento normal. Resultados visibles en 3-6 meses.',
      createdById: diego.id,
      createdAt: new Date('2026-05-10T12:00:00'),
    },
  });

  await prisma.appointmentNote.create({
    data: {
      appointmentId: apt3.id,
      note: 'HIFU 12D aplicado con excelente adherencia técnica. Zona más tratada: mandíbula y papada. Se nota tensado inmediato post-procedimiento. Paciente debe evitar manipulación de la zona por 24h. Control a las 4 semanas para evaluar evolución.',
      createdById: diego.id,
      createdAt: new Date('2026-05-10T12:15:00'),
    },
  });

  await prisma.commission.create({
    data: {
      salesPersonId: grecia.id,
      appointmentId: apt3.id,
      serviceInstanceId: oHIFU.id,
      serviceTemplateId: tHIFU.id,
      commissionRate: 0.0000,
      baseAmount: 360.00,
      commissionAmount: 20.00,
      status: 'paid',
      approvedAt: new Date('2026-05-15T10:00:00'),
      approvedById: admin.id,
      paidAt: new Date('2026-05-31T09:00:00'),
      paidById: admin.id,
      paymentMethod: 'cash',
    },
  });

  // ─── CITA 4: 20 Mayo 2026 — no_show ─────────────────────────────────────
  const apt4 = await prisma.appointment.create({
    data: {
      patientId: PATIENT_ID,
      scheduledDate: new Date('2026-05-20T14:00:00'),
      durationMinutes: 60,
      status: 'no_show',
      createdById: grecia.id,
      createdAt: new Date('2026-05-15T11:00:00'),
    },
  });
  await prisma.session.create({ data: { appointmentId: apt4.id, serviceInstanceId: oHollywood.id, sessionNumber: 3 } });

  await prisma.appointmentNote.create({
    data: {
      appointmentId: apt4.id,
      note: 'Paciente no se presentó. Se intentó contactar por WhatsApp y llamada telefónica sin respuesta. Sesión 3 de Hollywood Peel pendiente de reagendar.',
      createdById: grecia.id,
      createdAt: new Date('2026-05-20T15:30:00'),
    },
  });

  // ─── CITA 5: 3 Junio 2026 — reserved — Depilación sesión 1 + Exosomas ───
  const apt5 = await prisma.appointment.create({
    data: {
      patientId: PATIENT_ID,
      scheduledDate: new Date('2026-06-03T09:30:00'),
      durationMinutes: 90,
      status: 'reserved',
      reservationAmount: 80.00,
      createdById: grecia.id,
      createdAt: new Date('2026-05-28T10:00:00'),
    },
  });
  await prisma.session.create({ data: { appointmentId: apt5.id, serviceInstanceId: oDepi.id, sessionNumber: 1 } });
  await prisma.session.create({ data: { appointmentId: apt5.id, serviceInstanceId: oExoso.id, sessionNumber: 1 } });

  // Comisión por Depilación Láser (pendiente)
  await prisma.commission.create({
    data: {
      salesPersonId: grecia.id,
      appointmentId: apt5.id,
      serviceInstanceId: oDepi.id,
      serviceTemplateId: tDepi.id,
      commissionRate: 0.0000,
      baseAmount: 200.00,
      commissionAmount: 10.00,
      status: 'pending',
    },
  });

  // Comisión por Exosomas (pendiente)
  await prisma.commission.create({
    data: {
      salesPersonId: grecia.id,
      appointmentId: apt5.id,
      serviceInstanceId: oExoso.id,
      serviceTemplateId: tExoso.id,
      commissionRate: 0.0000,
      baseAmount: 950.00,
      commissionAmount: 12.00,
      status: 'pending',
    },
  });

  // ─── CITA 6: 10 Junio 2026 — reserved — Hollywood Peel sesión 3 (reagendada) ──
  const apt6 = await prisma.appointment.create({
    data: {
      patientId: PATIENT_ID,
      scheduledDate: new Date('2026-06-10T11:00:00'),
      durationMinutes: 60,
      status: 'reserved',
      createdById: grecia.id,
      createdAt: new Date('2026-05-20T16:00:00'),
    },
  });
  await prisma.session.create({ data: { appointmentId: apt6.id, serviceInstanceId: oHollywood.id, sessionNumber: 3 } });

  await prisma.appointmentNote.create({
    data: {
      appointmentId: apt6.id,
      note: 'Cita reagendada. Paciente confirmó asistencia vía WhatsApp.',
      createdById: grecia.id,
      createdAt: new Date('2026-05-20T16:10:00'),
    },
  });

  // ── Comisiones pendientes por Hollywood Peel ─────────────────────────────
  await prisma.commission.create({
    data: {
      salesPersonId: grecia.id,
      appointmentId: apt1.id,
      serviceInstanceId: oHollywood.id,
      serviceTemplateId: tHollywood.id,
      commissionRate: 0.0000,
      baseAmount: 400.00,
      commissionAmount: 18.00,
      status: 'approved',
      approvedAt: new Date('2026-03-10T09:00:00'),
      approvedById: admin.id,
    },
  });

  console.log('  ✓ 6 citas creadas');
  console.log('\n✅ Datos demo generados exitosamente para Alan Geronimo:');
  console.log('   📦 5 órdenes/paquetes');
  console.log('   🧾 2 facturas (1 pagada, 1 pago parcial)');
  console.log('   💳 3 pagos registrados');
  console.log('   📅 6 citas (3 atendidas, 1 no asistió, 2 reservadas)');
  console.log('   📋 5 registros médicos con notas y medidas corporales');
  console.log('   💬 6 notas de atención');
  console.log('   💰 5 comisiones (1 pagada, 2 aprobadas, 2 pendientes)');
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
