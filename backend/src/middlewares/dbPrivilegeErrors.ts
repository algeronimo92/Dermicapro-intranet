import { Request, Response, NextFunction } from 'express';
import { dbRoleContext } from '../config/dbRoleContext';
import { tableLabel } from '../constants/dbPrivileges';

/**
 * Convierte en 403 con un mensaje claro las respuestas de error causadas por
 * falta de privilegios de base de datos.
 *
 * Los controladores capturan sus propios errores y responden 500 con un texto
 * genérico ("Error al obtener pacientes"). Cuando la causa real fue que
 * PostgreSQL rechazó la consulta por privilegios (SQLSTATE 42501), el pool lo
 * anota en el contexto de la petición (config/database.ts) y aquí se reemplaza
 * esa respuesta. Así no hay que tocar cada controlador.
 */
export const dbPrivilegeErrors = (_req: Request, res: Response, next: NextFunction): void => {
  const status = res.status.bind(res);
  const json = res.json.bind(res);

  res.status = (code: number) => {
    const denied = dbRoleContext.getStore()?.deniedTable;
    if (code >= 500 && denied) {
      res.locals.dbPrivilegeDenied = denied;
      return status(403);
    }
    return status(code);
  };

  res.json = (body?: unknown) => {
    const denied = res.locals.dbPrivilegeDenied as string | undefined;
    if (!denied) return json(body);
    const message = `Tu rol no tiene privilegios en la base de datos sobre "${tableLabel(denied)}". ` +
      'Pide al administrador que los otorgue en Empleados → Privilegios.';
    // Ambos campos: unas pantallas leen `error` y otras `message`.
    return json({
      error: message,
      message,
      code: 'DB_PRIVILEGE_DENIED',
      table: denied,
    });
  };

  next();
};
