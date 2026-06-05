// @ts-nocheck - Script de migración legacy con modelo desactualizado
import prisma from '../config/database';

async function createMissingPaymentOrders() {
  try {
    console.log('🔍 Buscando órdenes sin orden de pago...');

    // Obtener todas las órdenes que no tienen orden de pago
    const ordersWithoutPaymentOrder = await prisma.serviceInstance.findMany({
      where: {
        paymentOrder: null,
      },
      include: {
        patient: true,
        service: true,
      },
    });

    console.log(`📦 Encontradas ${ordersWithoutPaymentOrder.length} órdenes sin orden de pago`);

    if (ordersWithoutPaymentOrder.length === 0) {
      console.log('✅ Todas las órdenes ya tienen orden de pago');
      return;
    }

    // Crear orden de pago para cada orden
    let created = 0;
    for (const order of ordersWithoutPaymentOrder) {
      try {
        await prisma.paymentOrder.create({
          data: {
            serviceInstanceId: order.id,
            patientId: order.patientId,
            totalAmount: order.finalPrice,
            status: 'pending',
            dueDate: null,
          },
        });
        created++;
        console.log(`✓ Orden de pago creada para orden ${order.id} (${order.service?.name})`);
      } catch (error) {
        console.error(`✗ Error creando orden de pago para orden ${order.id}:`, error);
      }
    }

    console.log(`\n✅ Proceso completado: ${created}/${ordersWithoutPaymentOrder.length} órdenes de pago creadas`);
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
createMissingPaymentOrders()
  .then(() => {
    console.log('\n🎉 Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error ejecutando el script:', error);
    process.exit(1);
  });
