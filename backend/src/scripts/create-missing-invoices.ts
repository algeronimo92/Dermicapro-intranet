// @ts-nocheck - Script de migración legacy con modelo desactualizado
import prisma from '../config/database';

async function createMissingInvoices() {
  try {
    console.log('🔍 Buscando órdenes sin factura...');

    // Obtener todas las órdenes que no tienen invoice
    const ordersWithoutInvoice = await prisma.serviceInstance.findMany({
      where: {
        invoice: null,
      },
      include: {
        patient: true,
        service: true,
      },
    });

    console.log(`📦 Encontradas ${ordersWithoutInvoice.length} órdenes sin factura`);

    if (ordersWithoutInvoice.length === 0) {
      console.log('✅ Todas las órdenes ya tienen factura');
      return;
    }

    // Crear invoice para cada orden
    let created = 0;
    for (const order of ordersWithoutInvoice) {
      try {
        await prisma.invoice.create({
          data: {
            serviceInstanceId: order.id,
            patientId: order.patientId,
            totalAmount: order.finalPrice,
            status: 'pending',
            dueDate: null,
          },
        });
        created++;
        console.log(`✓ Factura creada para orden ${order.id} (${order.service?.name})`);
      } catch (error) {
        console.error(`✗ Error creando factura para orden ${order.id}:`, error);
      }
    }

    console.log(`\n✅ Proceso completado: ${created}/${ordersWithoutInvoice.length} facturas creadas`);
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
createMissingInvoices()
  .then(() => {
    console.log('\n🎉 Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error ejecutando el script:', error);
    process.exit(1);
  });
