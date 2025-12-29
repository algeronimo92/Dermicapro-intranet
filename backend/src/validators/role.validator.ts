import { CreateRoleDTO, UpdateRoleDTO } from '../services/role.service';
import { AppError } from '../middlewares/errorHandler';

export class RoleValidator {
  validateCreateData(data: CreateRoleDTO): void {
    if (!data.name?.trim()) {
      throw new AppError('El nombre del rol es requerido', 400);
    }

    if (!data.displayName?.trim()) {
      throw new AppError('El nombre para mostrar es requerido', 400);
    }

    // Validar formato del nombre (solo minúsculas, números y guiones bajos)
    const namePattern = /^[a-z0-9_]+$/;
    if (!namePattern.test(data.name)) {
      throw new AppError(
        'El nombre del rol solo puede contener letras minúsculas, números y guiones bajos',
        400
      );
    }
  }

  validateUpdateData(data: UpdateRoleDTO): void {
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        throw new AppError('El nombre del rol no puede estar vacío', 400);
      }

      const namePattern = /^[a-z0-9_]+$/;
      if (!namePattern.test(data.name)) {
        throw new AppError(
          'El nombre del rol solo puede contener letras minúsculas, números y guiones bajos',
          400
        );
      }
    }

    if (data.displayName !== undefined && !data.displayName.trim()) {
      throw new AppError('El nombre para mostrar no puede estar vacío', 400);
    }
  }

  async validateRoleNotSystem(role: { isSystem: boolean; displayName: string }): Promise<void> {
    if (role.isSystem) {
      throw new AppError(
        `No se puede modificar el rol del sistema "${role.displayName}"`,
        403
      );
    }
  }

  async validateRoleHasNoUsers(userCount: number, roleName: string): Promise<void> {
    if (userCount > 0) {
      throw new AppError(
        `No se puede eliminar el rol "${roleName}" porque tiene ${userCount} usuario(s) asignado(s)`,
        400
      );
    }
  }
}

export const roleValidator = new RoleValidator();
