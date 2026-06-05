#!/bin/bash

# Script para limpiar la base de datos DermicaPro
# Elimina todos los datos de pacientes, citas, órdenes y comisiones

echo "🗑️  Limpiando base de datos DermicaPro..."
echo ""

# Ejecutar comandos SQL para eliminar datos
psql dermicapro <<EOF
-- Eliminar en orden correcto para respetar dependencias
DELETE FROM commissions;
DELETE FROM patient_records;
DELETE FROM payments;
DELETE FROM ordenes_de_pago;
DELETE FROM appointment_services;
DELETE FROM appointments;
DELETE FROM orders;
DELETE FROM patients;
EOF

echo ""
echo "✅ Base de datos limpiada exitosamente"
echo ""
echo "📊 Verificando tablas vacías..."
echo ""

# Verificar que las tablas estén vacías
psql dermicapro <<EOF
SELECT
  'patients' as tabla, COUNT(*) as registros FROM patients
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'appointment_services', COUNT(*) FROM appointment_services
UNION ALL
SELECT 'patient_records', COUNT(*) FROM patient_records
UNION ALL
SELECT 'ordenes_de_pago', COUNT(*) FROM ordenes_de_pago
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'commissions', COUNT(*) FROM commissions;
EOF

echo ""
echo "🎉 Listo para testear desde cero!"
