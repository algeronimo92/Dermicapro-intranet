declare global {
  namespace Express {
    interface Request {
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
