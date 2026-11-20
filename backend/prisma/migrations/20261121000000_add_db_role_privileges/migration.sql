-- Privilegios de base de datos por rol.
--
-- Cada rol de la aplicación (salvo admin) tiene un rol de PostgreSQL app_<rol>
-- sin login. El backend hace SET ROLE app_<rol> al tomar cada conexión para la
-- petición de ese usuario (config/database.ts), así que PostgreSQL hace cumplir
-- los privilegios de objeto (SELECT/INSERT/UPDATE/DELETE por tabla) que el admin
-- administra desde Empleados -> Privilegios de base de datos.
--
-- Los privilegios iniciales reproducen lo que cada rol ya puede hacer hoy en la
-- aplicación, para que desplegar esto no cambie el comportamiento.
--
-- Ningún rol recibe privilegios del sistema (CREATE, ALTER, DROP, CREATEROLE...):
-- crear o modificar objetos queda sólo para el dueño de la base (migraciones).

DO $$
DECLARE r TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['app_medical_staff','app_assistant','app_sales','app_accountant','app_inventory'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', r);
    END IF;
    -- El usuario de la aplicación debe poder cambiar a estos roles.
    EXECUTE format('GRANT %I TO CURRENT_USER', r);
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
    EXECUTE format('REVOKE CREATE ON SCHEMA public FROM %I', r);
  END LOOP;
END
$$;

-- PUBLIC no debe poder crear objetos en el esquema (en PostgreSQL < 15 puede).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;


-- Personal Médico
GRANT SELECT, INSERT, UPDATE ON patients, appointments, appointment_attendees, appointment_notes, sessions, service_instances, patient_records, ordenes_de_pago, payments, commissions TO app_medical_staff;
GRANT DELETE ON appointment_attendees, sessions, service_instances TO app_medical_staff;
GRANT SELECT ON services, service_packages, users, roles, system_settings TO app_medical_staff;

-- Personal Asistente
GRANT SELECT, INSERT, UPDATE ON patients, appointments, appointment_attendees, appointment_notes, sessions, service_instances, patient_records, ordenes_de_pago, payments, commissions TO app_assistant;
GRANT DELETE ON appointment_attendees, sessions, service_instances TO app_assistant;
GRANT SELECT ON services, service_packages, users, roles, system_settings TO app_assistant;
GRANT SELECT ON products, inventory_movements TO app_assistant;

-- Vendedor
GRANT SELECT, INSERT, UPDATE ON patients, appointments, appointment_attendees, appointment_notes, sessions, service_instances, patient_records, ordenes_de_pago, payments, commissions TO app_sales;
GRANT DELETE ON appointment_attendees, sessions, service_instances TO app_sales;
GRANT SELECT ON services, service_packages, users, roles, system_settings TO app_sales;
GRANT SELECT ON products, inventory_movements TO app_sales;

-- Contador
GRANT SELECT ON registered_invoices, registered_invoice_attachments, users, roles, system_settings TO app_accountant;

-- Inventario
GRANT SELECT, INSERT, UPDATE ON products, inventory_movements TO app_inventory;
GRANT SELECT ON users, roles, system_settings TO app_inventory;
