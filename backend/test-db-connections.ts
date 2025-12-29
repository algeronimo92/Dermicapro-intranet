#!/usr/bin/env tsx
/**
 * Script para verificar todas las conexiones y relaciones de la base de datos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  error?: string;
}

const results: TestResult[] = [];

async function testConnection() {
  console.log('🔍 Verificando conexión a la base de datos...\n');

  try {
    await prisma.$connect();
    results.push({
      test: 'Database Connection',
      status: 'PASS',
      message: 'Conexión exitosa a la base de datos'
    });
  } catch (error) {
    results.push({
      test: 'Database Connection',
      status: 'FAIL',
      message: 'No se pudo conectar a la base de datos',
      error: error instanceof Error ? error.message : String(error)
    });
    return false;
  }
  return true;
}

async function testUsers() {
  try {
    const count = await prisma.user.count();
    results.push({
      test: 'Users Table',
      status: 'PASS',
      message: `Tabla users accesible (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'Users Table',
      status: 'FAIL',
      message: 'Error al acceder a la tabla users',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testPatients() {
  try {
    const count = await prisma.patient.count();
    results.push({
      test: 'Patients Table',
      status: 'PASS',
      message: `Tabla patients accesible (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'Patients Table',
      status: 'FAIL',
      message: 'Error al acceder a la tabla patients',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testServices() {
  try {
    const count = await prisma.service.count();
    results.push({
      test: 'Services Table',
      status: 'PASS',
      message: `Tabla services accesible (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'Services Table',
      status: 'FAIL',
      message: 'Error al acceder a la tabla services',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testOrders() {
  try {
    const count = await prisma.order.count();

    // Verificar que la columna invoice_id existe intentando incluir la relación
    const orderWithInvoice = await prisma.order.findFirst({
      include: { invoice: true }
    });

    results.push({
      test: 'Orders Table (with invoice_id)',
      status: 'PASS',
      message: `Tabla orders accesible con relación invoice_id (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'Orders Table (with invoice_id)',
      status: 'FAIL',
      message: 'Error al acceder a la tabla orders o relación invoice',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testInvoices() {
  try {
    const count = await prisma.invoice.count();

    // Verificar relación inversa orders -> invoice
    const invoiceWithOrders = await prisma.invoice.findFirst({
      include: { orders: true }
    });

    results.push({
      test: 'Invoices Table (with orders relation)',
      status: 'PASS',
      message: `Tabla invoices accesible con relación orders (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'Invoices Table (with orders relation)',
      status: 'FAIL',
      message: 'Error al acceder a la tabla invoices o relación orders',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testAppointments() {
  try {
    const count = await prisma.appointment.count();

    // Test relaciones
    const appointment = await prisma.appointment.findFirst({
      include: {
        patient: true,
        createdBy: true,
        attendedBy: true,
        appointmentServices: true
      }
    });

    results.push({
      test: 'Appointments Table (with relations)',
      status: 'PASS',
      message: `Tabla appointments accesible con relaciones (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'Appointments Table (with relations)',
      status: 'FAIL',
      message: 'Error al acceder a la tabla appointments o sus relaciones',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testAppointmentServices() {
  try {
    const count = await prisma.appointmentService.count();

    // Test relaciones críticas
    const appointmentService = await prisma.appointmentService.findFirst({
      include: {
        appointment: true,
        order: true,
        deletedBy: true
      }
    });

    results.push({
      test: 'AppointmentServices Table',
      status: 'PASS',
      message: `Tabla appointment_services accesible con relaciones (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'AppointmentServices Table',
      status: 'FAIL',
      message: 'Error al acceder a la tabla appointment_services',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testPayments() {
  try {
    const count = await prisma.payment.count();

    // Test todas las relaciones
    const payment = await prisma.payment.findFirst({
      include: {
        patient: true,
        invoice: true,
        appointment: true,
        createdBy: true
      }
    });

    results.push({
      test: 'Payments Table (with all relations)',
      status: 'PASS',
      message: `Tabla payments accesible con todas las relaciones (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'Payments Table (with all relations)',
      status: 'FAIL',
      message: 'Error al acceder a la tabla payments o sus relaciones',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testPatientRecords() {
  try {
    const count = await prisma.patientRecord.count();
    results.push({
      test: 'PatientRecords Table',
      status: 'PASS',
      message: `Tabla patient_records accesible (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'PatientRecords Table',
      status: 'FAIL',
      message: 'Error al acceder a la tabla patient_records',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testCommissions() {
  try {
    const count = await prisma.commission.count();
    results.push({
      test: 'Commissions Table',
      status: 'PASS',
      message: `Tabla commissions accesible (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'Commissions Table',
      status: 'FAIL',
      message: 'Error al acceder a la tabla commissions',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function testAppointmentNotes() {
  try {
    const count = await prisma.appointmentNote.count();
    results.push({
      test: 'AppointmentNotes Table',
      status: 'PASS',
      message: `Tabla appointment_notes accesible (${count} registros)`
    });
  } catch (error) {
    results.push({
      test: 'AppointmentNotes Table',
      status: 'FAIL',
      message: 'Error al acceder a la tabla appointment_notes',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function printResults() {
  console.log('\n📊 RESULTADOS DE LAS PRUEBAS\n');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
  });

  console.log('='.repeat(80));
  console.log(`\n📈 Total: ${results.length} pruebas`);
  console.log(`✅ Exitosas: ${passed}`);
  console.log(`❌ Fallidas: ${failed}`);
  if (warned > 0) console.log(`⚠️  Advertencias: ${warned}`);

  if (failed === 0) {
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!\n');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.\n');
    process.exit(1);
  }
}

async function main() {
  const connected = await testConnection();

  if (!connected) {
    await printResults();
    return;
  }

  // Ejecutar todas las pruebas
  await Promise.all([
    testUsers(),
    testPatients(),
    testServices(),
    testOrders(),
    testInvoices(),
    testAppointments(),
    testAppointmentServices(),
    testPayments(),
    testPatientRecords(),
    testCommissions(),
    testAppointmentNotes()
  ]);

  await printResults();
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
