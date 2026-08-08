declare global {
  namespace Express {
    interface Request {
      /** Identificador único de la petición; aparece en todas sus líneas de log. */
      id?: string;
      user?: {
        id: string;
        email: string;
        roleId?: string | null;
        roleName?: string;
      };
      patient?: {
        id: string;
        email: string | null;
        firstName: string;
        lastName: string;
        dni: string;
        hasPortalAccess: boolean;
      };
    }
  }
}

export {};
