-- Un rol de PostgreSQL por empleado.
--
-- Cada empleado (salvo admin) tiene un rol emp_<id del usuario sin guiones>,
-- sin login, miembro del rol de su tipo (app_sales, app_assistant...). El
-- backend hace SET ROLE emp_<id> en cada petición de esa persona, así que:
--   * los privilegios siguen administrándose por tipo de rol (se heredan de
--     app_<rol>, que es lo que edita la matriz de Empleados), y
--   * dentro de PostgreSQL current_user identifica a la persona concreta.
--
-- El backend mantiene estos roles al día (crea el rol de un empleado nuevo y
-- ajusta la membresía si le cambian el rol); esta migración sólo crea los de
-- los empleados que ya existen.

DO $$
DECLARE
  u RECORD;
  emp TEXT;
  other TEXT;
BEGIN
  FOR u IN
    SELECT us.id, us.first_name, us.last_name, r.name AS role_name
    FROM users us JOIN roles r ON r.id = us.role_id
    WHERE r.name IN ('medical_staff', 'assistant', 'sales', 'accountant', 'inventory')
  LOOP
    emp := 'emp_' || lower(replace(u.id, '-', ''));
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = emp) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE', emp);
    END IF;
    EXECUTE format('GRANT %I TO CURRENT_USER', emp);
    EXECUTE format('GRANT %I TO %I', 'app_' || u.role_name, emp);
    FOREACH other IN ARRAY ARRAY['medical_staff', 'assistant', 'sales', 'accountant', 'inventory'] LOOP
      IF other <> u.role_name AND pg_has_role(emp, 'app_' || other, 'MEMBER') THEN
        EXECUTE format('REVOKE %I FROM %I', 'app_' || other, emp);
      END IF;
    END LOOP;
    EXECUTE format('COMMENT ON ROLE %I IS %L', emp, u.first_name || ' ' || u.last_name);
  END LOOP;
END
$$;
